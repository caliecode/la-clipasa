// Copyright 2021-present The Atlas Authors. All rights reserved.
// This source code is licensed under the Apache 2.0 license found
// in the LICENSE file in the root directory of this source tree.

package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"hash/fnv"
	"math/rand"
	"net/url"
	"strconv"
	"time"

	"ariga.io/atlas/sql/internal/sqlx"
	"ariga.io/atlas/sql/migrate"
	"ariga.io/atlas/sql/schema"
	"ariga.io/atlas/sql/sqlclient"
)

type (
	// Driver represents a PostgreSQL driver for introspecting database schemas,
	// generating diff between schema elements and apply migrations changes.
	Driver struct {
		*conn
		schema.Differ
		schema.Inspector
		migrate.PlanApplier
	}

	// database connection and its information.
	conn struct {
		schema.ExecQuerier
		// The schema in the `search_path` parameter (if given).
		schema string
		// Maps to the connection default_table_access_method parameter.
		accessMethod string
		// System variables that are set on `Open`.
		version int
		crdb    bool
	}
)

var _ interface {
	migrate.Snapshoter
	migrate.StmtScanner
	migrate.CleanChecker
	schema.TypeParseFormatter
} = (*Driver)(nil)

// DriverName holds the name used for registration.
const DriverName = "postgres"

func init() {
	sqlclient.Register(
		DriverName,
		sqlclient.OpenerFunc(opener),
		sqlclient.RegisterDriverOpener(Open),
		sqlclient.RegisterFlavours("postgresql"),
		sqlclient.RegisterCodec(codec, codec),
		sqlclient.RegisterURLParser(parser{}),
	)
}

func opener(_ context.Context, u *url.URL) (*sqlclient.Client, error) {
	ur := parser{}.ParseURL(u)
	db, err := sql.Open(DriverName, ur.DSN)
	if err != nil {
		return nil, err
	}
	drv, err := Open(db)
	if err != nil {
		if cerr := db.Close(); cerr != nil {
			err = fmt.Errorf("%w: %v", err, cerr)
		}
		return nil, err
	}
	switch drv := drv.(type) {
	case *Driver:
		drv.schema = ur.Schema
	case noLockDriver:
		drv.noLocker.(*Driver).schema = ur.Schema
	}
	return &sqlclient.Client{
		Name:   DriverName,
		DB:     db,
		URL:    ur,
		Driver: drv,
	}, nil
}

// Open opens a new PostgreSQL driver.
func Open(db schema.ExecQuerier) (migrate.Driver, error) {
	c := &conn{ExecQuerier: db}
	rows, err := db.QueryContext(context.Background(), paramsQuery)
	if err != nil {
		return nil, fmt.Errorf("postgres: scanning system variables: %w", err)
	}
	var ver, am, crdb sql.NullString
	if err := sqlx.ScanOne(rows, &ver, &am, &crdb); err != nil {
		return nil, fmt.Errorf("postgres: scanning system variables: %w", err)
	}
	if c.version, err = strconv.Atoi(ver.String); err != nil {
		return nil, fmt.Errorf("postgres: malformed version: %s: %w", ver.String, err)
	}
	if c.version < 10_00_00 {
		return nil, fmt.Errorf("postgres: unsupported postgres version: %d", c.version)
	}
	c.accessMethod = am.String
	if c.crdb = sqlx.ValidString(crdb); c.crdb {
		return noLockDriver{
			&Driver{
				conn:        c,
				Differ:      &sqlx.Diff{DiffDriver: &crdbDiff{diff{c}}},
				Inspector:   &crdbInspect{inspect{c}},
				PlanApplier: &planApply{c},
			},
		}, nil
	}
	return &Driver{
		conn:        c,
		Differ:      &sqlx.Diff{DiffDriver: &diff{c}},
		Inspector:   &inspect{c},
		PlanApplier: &planApply{c},
	}, nil
}

func (d *Driver) dev() *sqlx.DevDriver {
	return &sqlx.DevDriver{
		Driver: d,
		PatchObject: func(s *schema.Schema, o schema.Object) {
			if e, ok := o.(*schema.EnumType); ok {
				e.Schema = s
			}
		},
	}
}

// NormalizeRealm returns the normal representation of the given database.
func (d *Driver) NormalizeRealm(ctx context.Context, r *schema.Realm) (*schema.Realm, error) {
	return d.dev().NormalizeRealm(ctx, r)
}

// NormalizeSchema returns the normal representation of the given database.
func (d *Driver) NormalizeSchema(ctx context.Context, s *schema.Schema) (*schema.Schema, error) {
	return d.dev().NormalizeSchema(ctx, s)
}

// Lock implements the schema.Locker interface.
func (d *Driver) Lock(ctx context.Context, name string, timeout time.Duration) (schema.UnlockFunc, error) {
	conn, err := sqlx.SingleConn(ctx, d.ExecQuerier)
	if err != nil {
		return nil, err
	}
	h := fnv.New32()
	h.Write([]byte(name))
	id := h.Sum32()
	if err := acquire(ctx, conn, id, timeout); err != nil {
		conn.Close()
		return nil, err
	}
	return func() error {
		defer conn.Close()
		rows, err := conn.QueryContext(ctx, "SELECT pg_advisory_unlock($1)", id)
		if err != nil {
			return err
		}
		switch released, err := sqlx.ScanNullBool(rows); {
		case err != nil:
			return err
		case !released.Valid || !released.Bool:
			return fmt.Errorf("sql/postgres: failed releasing lock %d", id)
		}
		return nil
	}, nil
}

// Snapshot implements migrate.Snapshoter.
func (d *Driver) Snapshot(ctx context.Context) (migrate.RestoreFunc, error) {
	// Postgres will only then be considered bound to a schema if the `search_path` was given.
	// In all other cases, the connection is considered bound to the realm.
	if d.schema != "" {
		s, err := d.InspectSchema(ctx, d.schema, nil)
		if err != nil {
			return nil, err
		}
		if len(s.Tables) > 0 {
			return nil, &migrate.NotCleanError{
				State:  schema.NewRealm(s),
				Reason: fmt.Sprintf("found table %q in connected schema", s.Tables[0].Name),
			}
		}
		return d.SchemaRestoreFunc(s), nil
	}
	// Not bound to a schema.
	realm, err := d.InspectRealm(ctx, nil)
	if err != nil {
		return nil, err
	}
	restore := d.RealmRestoreFunc(realm)
	// Postgres is considered clean, if there are no schemas or the public schema has no tables.
	if len(realm.Schemas) == 0 {
		return restore, nil
	}
	if s, ok := realm.Schema("public"); len(realm.Schemas) == 1 && ok {
		if len(s.Tables) > 0 {
			return nil, &migrate.NotCleanError{
				State:  realm,
				Reason: fmt.Sprintf("found table %q in schema %q", s.Tables[0].Name, s.Name),
			}
		}
		return restore, nil
	}
	return nil, &migrate.NotCleanError{
		State:  realm,
		Reason: fmt.Sprintf("found schema %q", realm.Schemas[0].Name),
	}
}

// SchemaRestoreFunc returns a function that restores the given schema to its desired state.
func (d *Driver) SchemaRestoreFunc(desired *schema.Schema) migrate.RestoreFunc {
	return func(ctx context.Context) error {
		current, err := d.InspectSchema(ctx, desired.Name, nil)
		if err != nil {
			return err
		}
		changes, err := d.SchemaDiff(current, desired)
		if err != nil {
			return err
		}
		return d.ApplyChanges(ctx, withCascade(changes))
	}
}

// RealmRestoreFunc returns a function that restores the given realm to its desired state.
func (d *Driver) RealmRestoreFunc(desired *schema.Realm) migrate.RestoreFunc {
	// Default behavior for Postgres is to have a single "public" schema.
	// In that case, all other schemas are dropped, but this one is cleared
	// object by object. To keep process faster, we drop the schema and recreate it.
	if !d.crdb && len(desired.Schemas) == 1 && desired.Schemas[0].Name == "public" {
		if pb := desired.Schemas[0]; len(pb.Tables)+len(pb.Views)+len(pb.Funcs)+len(pb.Procs)+len(pb.Objects) == 0 {
			return func(ctx context.Context) error {
				current, err := d.InspectRealm(ctx, nil)
				if err != nil {
					return err
				}
				changes, err := d.RealmDiff(current, desired)
				if err != nil {
					return err
				}
				// If there is no diff, do nothing.
				if len(changes) == 0 {
					return nil
				}
				// Else, prefer to drop the public schema and apply
				// database changes instead of executing changes one by one.
				if changes, err = d.RealmDiff(current, &schema.Realm{Attrs: desired.Attrs, Objects: desired.Objects}); err != nil {
					return err
				}
				if err := d.ApplyChanges(ctx, withCascade(changes)); err != nil {
					return err
				}
				// Recreate the public schema.
				return d.ApplyChanges(ctx, []schema.Change{
					&schema.AddSchema{S: pb, Extra: []schema.Clause{&schema.IfExists{}}},
				})
			}
		}
	}
	return func(ctx context.Context) (err error) {
		current, err := d.InspectRealm(ctx, nil)
		if err != nil {
			return err
		}
		changes, err := d.RealmDiff(current, desired)
		if err != nil {
			return err
		}
		return d.ApplyChanges(ctx, withCascade(changes))
	}
}

func withCascade(changes schema.Changes) schema.Changes {
	for _, c := range changes {
		switch c := c.(type) {
		case *schema.DropTable:
			c.Extra = append(c.Extra, &schema.IfExists{}, &Cascade{})
		case *schema.DropView:
			c.Extra = append(c.Extra, &schema.IfExists{}, &Cascade{})
		case *schema.DropProc:
			c.Extra = append(c.Extra, &schema.IfExists{}, &Cascade{})
		case *schema.DropFunc:
			c.Extra = append(c.Extra, &schema.IfExists{}, &Cascade{})
		case *schema.DropObject:
			c.Extra = append(c.Extra, &schema.IfExists{}, &Cascade{})
		}
	}
	return changes
}

// CheckClean implements migrate.CleanChecker.
func (d *Driver) CheckClean(ctx context.Context, revT *migrate.TableIdent) error {
	if revT == nil { // accept nil values
		revT = &migrate.TableIdent{}
	}
	if d.schema != "" {
		switch s, err := d.InspectSchema(ctx, d.schema, nil); {
		case err != nil:
			return err
		case len(s.Tables) == 0, (revT.Schema == "" || s.Name == revT.Schema) && len(s.Tables) == 1 && s.Tables[0].Name == revT.Name:
			return nil
		default:
			return &migrate.NotCleanError{State: schema.NewRealm(s), Reason: fmt.Sprintf("found table %q in schema %q", s.Tables[0].Name, s.Name)}
		}
	}
	r, err := d.InspectRealm(ctx, nil)
	if err != nil {
		return err
	}
	for _, s := range r.Schemas {
		switch {
		case len(s.Tables) == 0 && s.Name == "public":
		case len(s.Tables) == 0 || s.Name != revT.Schema:
			return &migrate.NotCleanError{State: r, Reason: fmt.Sprintf("found schema %q", s.Name)}
		case len(s.Tables) > 1:
			return &migrate.NotCleanError{State: r, Reason: fmt.Sprintf("found %d tables in schema %q", len(s.Tables), s.Name)}
		case len(s.Tables) == 1 && s.Tables[0].Name != revT.Name:
			return &migrate.NotCleanError{State: r, Reason: fmt.Sprintf("found table %q in schema %q", s.Tables[0].Name, s.Name)}
		}
	}
	return nil
}

// Version returns the version of the connected database.
func (d *Driver) Version() string {
	return strconv.Itoa(d.conn.version)
}

// FormatType converts schema type to its column form in the database.
func (*Driver) FormatType(t schema.Type) (string, error) {
	return FormatType(t)
}

// ParseType returns the schema.Type value represented by the given string.
func (*Driver) ParseType(s string) (schema.Type, error) {
	return ParseType(s)
}

// StmtBuilder is a helper method used to build statements with PostgreSQL formatting.
func (*Driver) StmtBuilder(opts migrate.PlanOptions) *sqlx.Builder {
	return &sqlx.Builder{
		QuoteOpening: '"',
		QuoteClosing: '"',
		Schema:       opts.SchemaQualifier,
		Indent:       opts.Indent,
	}
}

// ScanStmts implements migrate.StmtScanner.
func (*Driver) ScanStmts(input string) ([]*migrate.Stmt, error) {
	return (&migrate.Scanner{
		ScannerOptions: migrate.ScannerOptions{
			MatchBegin:       true,
			MatchBeginAtomic: true,
			MatchDollarQuote: true,
			EscapedStringExt: true,
		},
	}).Scan(input)
}

// Use pg_try_advisory_lock to avoid deadlocks between multiple executions of Atlas (commonly tests).
// The common case is as follows: a process (P1) of Atlas takes a lock, and another process (P2) of
// Atlas waits for the lock. Now if P1 execute "CREATE INDEX CONCURRENTLY" (either in apply or diff),
// the command waits all active transactions that can potentially changed the index to be finished.
// P2 can be executed in a transaction block (opened explicitly by Atlas), or a single statement tx
// also known as "autocommit mode". Read more: https://www.postgresql.org/docs/current/sql-begin.html.
func acquire(ctx context.Context, conn schema.ExecQuerier, id uint32, timeout time.Duration) error {
	var (
		inter = 25
		start = time.Now()
	)
	for {
		rows, err := conn.QueryContext(ctx, "SELECT pg_try_advisory_lock($1)", id)
		if err != nil {
			return err
		}
		switch acquired, err := sqlx.ScanNullBool(rows); {
		case err != nil:
			return err
		case acquired.Bool:
			return nil
		case time.Since(start) > timeout:
			return schema.ErrLocked
		default:
			if err := rows.Close(); err != nil {
				return err
			}
			// 25ms~50ms, 50ms~100ms, ..., 800ms~1.6s, 1s~2s.
			d := min(time.Duration(inter)*time.Millisecond, time.Second)
			time.Sleep(d + time.Duration(rand.Intn(int(d))))
			inter += inter
		}
	}
}

// supportsIndexInclude reports if the server supports the INCLUDE clause.
func (c *conn) supportsIndexInclude() bool {
	return c.version >= 11_00_00
}

// supportsIndexNullsDistinct reports if the server supports the NULLS [NOT] DISTINCT clause.
func (c *conn) supportsIndexNullsDistinct() bool {
	return c.version >= 15_00_00
}

type parser struct{}

// ParseURL implements the sqlclient.URLParser interface.
func (parser) ParseURL(u *url.URL) *sqlclient.URL {
	return &sqlclient.URL{URL: u, DSN: u.String(), Schema: u.Query().Get("search_path")}
}

// ChangeSchema implements the sqlclient.SchemaChanger interface.
func (parser) ChangeSchema(u *url.URL, s string) *url.URL {
	nu := *u
	q := nu.Query()
	q.Set("search_path", s)
	nu.RawQuery = q.Encode()
	return &nu
}

// Standard column types (and their aliases) as defined in
// PostgreSQL codebase/website.
const (
	TypeBit     = "bit"
	TypeBitVar  = "bit varying"
	TypeBoolean = "boolean"
	TypeBool    = "bool" // boolean.
	TypeBytea   = "bytea"

	TypeCharacter = "character"
	TypeChar      = "char" // character
	TypeCharVar   = "character varying"
	TypeVarChar   = "varchar" // character varying
	TypeText      = "text"
	TypeBPChar    = "bpchar" // blank-padded character.
	typeName      = "name"   // internal type for object names

	TypeSmallInt = "smallint"
	TypeInteger  = "integer"
	TypeBigInt   = "bigint"
	TypeInt      = "int"  // integer.
	TypeInt2     = "int2" // smallint.
	TypeInt4     = "int4" // integer.
	TypeInt8     = "int8" // bigint.

	TypeXID  = "xid"  // transaction identifier.
	TypeXID8 = "xid8" // 64-bit transaction identifier.

	TypeCIDR     = "cidr"
	TypeInet     = "inet"
	TypeMACAddr  = "macaddr"
	TypeMACAddr8 = "macaddr8"

	TypeCircle  = "circle"
	TypeLine    = "line"
	TypeLseg    = "lseg"
	TypeBox     = "box"
	TypePath    = "path"
	TypePolygon = "polygon"
	TypePoint   = "point"

	TypeDate          = "date"
	TypeTime          = "time"   // time without time zone
	TypeTimeTZ        = "timetz" // time with time zone
	TypeTimeWTZ       = "time with time zone"
	TypeTimeWOTZ      = "time without time zone"
	TypeTimestamp     = "timestamp" // timestamp without time zone
	TypeTimestampTZ   = "timestamptz"
	TypeTimestampWTZ  = "timestamp with time zone"
	TypeTimestampWOTZ = "timestamp without time zone"

	TypeDouble = "double precision"
	TypeReal   = "real"
	TypeFloat8 = "float8" // double precision
	TypeFloat4 = "float4" // real
	TypeFloat  = "float"  // float(p).

	TypeNumeric = "numeric"
	TypeDecimal = "decimal" // numeric

	TypeSmallSerial = "smallserial" // smallint with auto_increment.
	TypeSerial      = "serial"      // integer with auto_increment.
	TypeBigSerial   = "bigserial"   // bigint with auto_increment.
	TypeSerial2     = "serial2"     // smallserial
	TypeSerial4     = "serial4"     // serial
	TypeSerial8     = "serial8"     // bigserial

	TypeArray       = "array"
	TypeXML         = "xml"
	TypeJSON        = "json"
	TypeJSONB       = "jsonb"
	TypeUUID        = "uuid"
	TypeMoney       = "money"
	TypeInterval    = "interval"
	TypeTSQuery     = "tsquery"
	TypeTSVector    = "tsvector"
	TypeUserDefined = "user-defined"

	TypeInt4Range      = "int4range"
	TypeInt4MultiRange = "int4multirange"
	TypeInt8Range      = "int8range"
	TypeInt8MultiRange = "int8multirange"
	TypeNumRange       = "numrange"
	TypeNumMultiRange  = "nummultirange"
	TypeTSRange        = "tsrange"
	TypeTSMultiRange   = "tsmultirange"
	TypeTSTZRange      = "tstzrange"
	TypeTSTZMultiRange = "tstzmultirange"
	TypeDateRange      = "daterange"
	TypeDateMultiRange = "datemultirange"

	// PostgreSQL internal object types and their aliases.
	typeOID           = "oid"
	typeRegClass      = "regclass"
	typeRegCollation  = "regcollation"
	typeRegConfig     = "regconfig"
	typeRegDictionary = "regdictionary"
	typeRegNamespace  = "regnamespace"
	typeRegOper       = "regoper"
	typeRegOperator   = "regoperator"
	typeRegProc       = "regproc"
	typeRegProcedure  = "regprocedure"
	typeRegRole       = "regrole"
	typeRegType       = "regtype"

	// PostgreSQL of supported pseudo-types.
	typeAny          = "any"
	typeAnyElement   = "anyelement"
	typeAnyArray     = "anyarray"
	typeAnyNonArray  = "anynonarray"
	typeAnyEnum      = "anyenum"
	typeInternal     = "internal"
	typeRecord       = "record"
	typeTrigger      = "trigger"
	typeEventTrigger = "event_trigger"
	typeVoid         = "void"
	typeUnknown      = "unknown"
)

// List of supported index types.
const (
	IndexTypeBTree       = "BTREE"
	IndexTypeBRIN        = "BRIN"
	IndexTypeHash        = "HASH"
	IndexTypeGIN         = "GIN"
	IndexTypeGiST        = "GIST"
	IndexTypeSPGiST      = "SPGIST"
	defaultPagesPerRange = 128
	defaultListLimit     = 4 * 1024
	defaultBtreeFill     = 90
)

const (
	storageParamFillFactor = "fillfactor"
	storageParamDedup      = "deduplicate_items"
	storageParamBuffering  = "buffering"
	storageParamFastUpdate = "fastupdate"
	storageParamListLimit  = "gin_pending_list_limit"
	storageParamPagesRange = "pages_per_range"
	storageParamAutoSum    = "autosummarize"
)

const (
	bufferingOff    = "OFF"
	bufferingOn     = "ON"
	bufferingAuto   = "AUTO"
	storageParamOn  = "ON"
	storageParamOff = "OFF"
)

// List of "GENERATED" types.
const (
	GeneratedTypeAlways    = "ALWAYS"
	GeneratedTypeByDefault = "BY_DEFAULT" // BY DEFAULT.
)

// List of PARTITION KEY types.
const (
	PartitionTypeRange = "RANGE"
	PartitionTypeList  = "LIST"
	PartitionTypeHash  = "HASH"
)
