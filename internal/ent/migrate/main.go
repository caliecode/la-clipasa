//go:build ignore

package main

import (
	"context"
	"flag"
	"log"
	"net"
	"net/url"
	"os"
	"strings"

	_ "github.com/lib/pq"

	_ "github.com/caliecode/la-clipasa/internal/ent/generated/runtime"

	"ariga.io/atlas/sql/sqltool"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/sql/schema"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated/migrate"
	"github.com/caliecode/la-clipasa/internal/envvar"
)

// Usage: go run -mod=mod ent/migrate/main.go <name>
// Generates a migration diff file for golang-migrate.
func main() {
	var env, name string

	flag.StringVar(&env, "env", "", "Environment Variables filename")
	flag.StringVar(&name, "name", "", "Migration name")
	flag.Parse()

	var errs []string
	if name == "" {
		errs = append(errs, "    - name is required but unset")
	}
	if env == "" {
		errs = append(errs, "    - env is required but unset")
	}
	if env == string(internal.AppEnvProd) {
		errs = append(errs, "    - migration generation with prod env is not allowed")
	}
	if env == string(internal.AppEnvCI) && os.Getenv("CI") != "true" {
		errs = append(errs, "    - migration generation with ci env is not allowed")
	}
	if len(errs) > 0 {
		log.Fatal("error: \n" + strings.Join(errs, "\n"))
	}

	if err := envvar.Load(env); err != nil {
		log.Fatalf("Couldn't load env: %s", err)
	}

	if err := internal.NewAppConfig(); err != nil {
		log.Fatalf("failed loading app config: %v", err)
	}
	cfg := internal.Config

	ctx := context.Background()
	// Create a local migration directory able to understand golang-migrate migration file format for replay.
	dir, err := sqltool.NewGolangMigrateDir("db/migrations")
	if err != nil {
		log.Fatalf("failed creating atlas migration directory: %v", err)
	}
	// Migrate diff options.
	opts := []schema.MigrateOption{
		schema.WithDir(dir), // migration directory
		schema.WithMigrationMode(schema.ModeReplay),
		schema.WithDialect(dialect.Postgres),
		schema.WithDropColumn(true),
		schema.WithDropIndex(true),
		// schema.WithFormatter(atlas.DefaultFormatter), // just gives a single .sql
	}

	dsn := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.Postgres.User, cfg.Postgres.Password),
		Host:   net.JoinHostPort(cfg.Postgres.Server, cfg.Postgres.Port),
		Path:   os.Getenv("GEN_POSTGRES_DB"), // for replay mode we just need an empty db
	}

	err = migrate.NamedDiff(ctx, dsn.String()+"?sslmode=disable", name, opts...)
	if err != nil {
		log.Fatalf("failed generating migration file: %v", err)
	}
}
