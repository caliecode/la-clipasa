// Code generated by ent, DO NOT EDIT.

package generated

import (
	"context"
	"errors"
	"fmt"
	"time"

	"entgo.io/ent/dialect/sql"
	"entgo.io/ent/dialect/sql/sqlgraph"
	"entgo.io/ent/schema/field"
	"github.com/caliecode/la-clipasa/internal/ent/generated/apikey"
	"github.com/caliecode/la-clipasa/internal/ent/generated/predicate"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/google/uuid"
)

// ApiKeyUpdate is the builder for updating ApiKey entities.
type ApiKeyUpdate struct {
	config
	hooks     []Hook
	mutation  *ApiKeyMutation
	modifiers []func(*sql.UpdateBuilder)
}

// Where appends a list predicates to the ApiKeyUpdate builder.
func (aku *ApiKeyUpdate) Where(ps ...predicate.ApiKey) *ApiKeyUpdate {
	aku.mutation.Where(ps...)
	return aku
}

// SetUpdatedAt sets the "updated_at" field.
func (aku *ApiKeyUpdate) SetUpdatedAt(t time.Time) *ApiKeyUpdate {
	aku.mutation.SetUpdatedAt(t)
	return aku
}

// SetOwnerID sets the "owner_id" field.
func (aku *ApiKeyUpdate) SetOwnerID(u uuid.UUID) *ApiKeyUpdate {
	aku.mutation.SetOwnerID(u)
	return aku
}

// SetNillableOwnerID sets the "owner_id" field if the given value is not nil.
func (aku *ApiKeyUpdate) SetNillableOwnerID(u *uuid.UUID) *ApiKeyUpdate {
	if u != nil {
		aku.SetOwnerID(*u)
	}
	return aku
}

// SetAPIKey sets the "api_key" field.
func (aku *ApiKeyUpdate) SetAPIKey(s string) *ApiKeyUpdate {
	aku.mutation.SetAPIKey(s)
	return aku
}

// SetNillableAPIKey sets the "api_key" field if the given value is not nil.
func (aku *ApiKeyUpdate) SetNillableAPIKey(s *string) *ApiKeyUpdate {
	if s != nil {
		aku.SetAPIKey(*s)
	}
	return aku
}

// SetExpiresOn sets the "expires_on" field.
func (aku *ApiKeyUpdate) SetExpiresOn(t time.Time) *ApiKeyUpdate {
	aku.mutation.SetExpiresOn(t)
	return aku
}

// SetNillableExpiresOn sets the "expires_on" field if the given value is not nil.
func (aku *ApiKeyUpdate) SetNillableExpiresOn(t *time.Time) *ApiKeyUpdate {
	if t != nil {
		aku.SetExpiresOn(*t)
	}
	return aku
}

// SetOwner sets the "owner" edge to the User entity.
func (aku *ApiKeyUpdate) SetOwner(u *User) *ApiKeyUpdate {
	return aku.SetOwnerID(u.ID)
}

// Mutation returns the ApiKeyMutation object of the builder.
func (aku *ApiKeyUpdate) Mutation() *ApiKeyMutation {
	return aku.mutation
}

// ClearOwner clears the "owner" edge to the User entity.
func (aku *ApiKeyUpdate) ClearOwner() *ApiKeyUpdate {
	aku.mutation.ClearOwner()
	return aku
}

// Save executes the query and returns the number of nodes affected by the update operation.
func (aku *ApiKeyUpdate) Save(ctx context.Context) (int, error) {
	if err := aku.defaults(); err != nil {
		return 0, err
	}
	return withHooks(ctx, aku.sqlSave, aku.mutation, aku.hooks)
}

// SaveX is like Save, but panics if an error occurs.
func (aku *ApiKeyUpdate) SaveX(ctx context.Context) int {
	affected, err := aku.Save(ctx)
	if err != nil {
		panic(err)
	}
	return affected
}

// Exec executes the query.
func (aku *ApiKeyUpdate) Exec(ctx context.Context) error {
	_, err := aku.Save(ctx)
	return err
}

// ExecX is like Exec, but panics if an error occurs.
func (aku *ApiKeyUpdate) ExecX(ctx context.Context) {
	if err := aku.Exec(ctx); err != nil {
		panic(err)
	}
}

// defaults sets the default values of the builder before save.
func (aku *ApiKeyUpdate) defaults() error {
	if _, ok := aku.mutation.UpdatedAt(); !ok {
		if apikey.UpdateDefaultUpdatedAt == nil {
			return fmt.Errorf("generated: uninitialized apikey.UpdateDefaultUpdatedAt (forgotten import generated/runtime?)")
		}
		v := apikey.UpdateDefaultUpdatedAt()
		aku.mutation.SetUpdatedAt(v)
	}
	return nil
}

// check runs all checks and user-defined validators on the builder.
func (aku *ApiKeyUpdate) check() error {
	if aku.mutation.OwnerCleared() && len(aku.mutation.OwnerIDs()) > 0 {
		return errors.New(`generated: clearing a required unique edge "ApiKey.owner"`)
	}
	return nil
}

// Modify adds a statement modifier for attaching custom logic to the UPDATE statement.
func (aku *ApiKeyUpdate) Modify(modifiers ...func(u *sql.UpdateBuilder)) *ApiKeyUpdate {
	aku.modifiers = append(aku.modifiers, modifiers...)
	return aku
}

func (aku *ApiKeyUpdate) sqlSave(ctx context.Context) (n int, err error) {
	if err := aku.check(); err != nil {
		return n, err
	}
	_spec := sqlgraph.NewUpdateSpec(apikey.Table, apikey.Columns, sqlgraph.NewFieldSpec(apikey.FieldID, field.TypeUUID))
	if ps := aku.mutation.predicates; len(ps) > 0 {
		_spec.Predicate = func(selector *sql.Selector) {
			for i := range ps {
				ps[i](selector)
			}
		}
	}
	if value, ok := aku.mutation.UpdatedAt(); ok {
		_spec.SetField(apikey.FieldUpdatedAt, field.TypeTime, value)
	}
	if value, ok := aku.mutation.APIKey(); ok {
		_spec.SetField(apikey.FieldAPIKey, field.TypeString, value)
	}
	if value, ok := aku.mutation.ExpiresOn(); ok {
		_spec.SetField(apikey.FieldExpiresOn, field.TypeTime, value)
	}
	if aku.mutation.OwnerCleared() {
		edge := &sqlgraph.EdgeSpec{
			Rel:     sqlgraph.M2O,
			Inverse: true,
			Table:   apikey.OwnerTable,
			Columns: []string{apikey.OwnerColumn},
			Bidi:    false,
			Target: &sqlgraph.EdgeTarget{
				IDSpec: sqlgraph.NewFieldSpec(user.FieldID, field.TypeUUID),
			},
		}
		_spec.Edges.Clear = append(_spec.Edges.Clear, edge)
	}
	if nodes := aku.mutation.OwnerIDs(); len(nodes) > 0 {
		edge := &sqlgraph.EdgeSpec{
			Rel:     sqlgraph.M2O,
			Inverse: true,
			Table:   apikey.OwnerTable,
			Columns: []string{apikey.OwnerColumn},
			Bidi:    false,
			Target: &sqlgraph.EdgeTarget{
				IDSpec: sqlgraph.NewFieldSpec(user.FieldID, field.TypeUUID),
			},
		}
		for _, k := range nodes {
			edge.Target.Nodes = append(edge.Target.Nodes, k)
		}
		_spec.Edges.Add = append(_spec.Edges.Add, edge)
	}
	_spec.AddModifiers(aku.modifiers...)
	if n, err = sqlgraph.UpdateNodes(ctx, aku.driver, _spec); err != nil {
		if _, ok := err.(*sqlgraph.NotFoundError); ok {
			err = &NotFoundError{apikey.Label}
		} else if sqlgraph.IsConstraintError(err) {
			err = &ConstraintError{msg: err.Error(), wrap: err}
		}
		return 0, err
	}
	aku.mutation.done = true
	return n, nil
}

// ApiKeyUpdateOne is the builder for updating a single ApiKey entity.
type ApiKeyUpdateOne struct {
	config
	fields    []string
	hooks     []Hook
	mutation  *ApiKeyMutation
	modifiers []func(*sql.UpdateBuilder)
}

// SetUpdatedAt sets the "updated_at" field.
func (akuo *ApiKeyUpdateOne) SetUpdatedAt(t time.Time) *ApiKeyUpdateOne {
	akuo.mutation.SetUpdatedAt(t)
	return akuo
}

// SetOwnerID sets the "owner_id" field.
func (akuo *ApiKeyUpdateOne) SetOwnerID(u uuid.UUID) *ApiKeyUpdateOne {
	akuo.mutation.SetOwnerID(u)
	return akuo
}

// SetNillableOwnerID sets the "owner_id" field if the given value is not nil.
func (akuo *ApiKeyUpdateOne) SetNillableOwnerID(u *uuid.UUID) *ApiKeyUpdateOne {
	if u != nil {
		akuo.SetOwnerID(*u)
	}
	return akuo
}

// SetAPIKey sets the "api_key" field.
func (akuo *ApiKeyUpdateOne) SetAPIKey(s string) *ApiKeyUpdateOne {
	akuo.mutation.SetAPIKey(s)
	return akuo
}

// SetNillableAPIKey sets the "api_key" field if the given value is not nil.
func (akuo *ApiKeyUpdateOne) SetNillableAPIKey(s *string) *ApiKeyUpdateOne {
	if s != nil {
		akuo.SetAPIKey(*s)
	}
	return akuo
}

// SetExpiresOn sets the "expires_on" field.
func (akuo *ApiKeyUpdateOne) SetExpiresOn(t time.Time) *ApiKeyUpdateOne {
	akuo.mutation.SetExpiresOn(t)
	return akuo
}

// SetNillableExpiresOn sets the "expires_on" field if the given value is not nil.
func (akuo *ApiKeyUpdateOne) SetNillableExpiresOn(t *time.Time) *ApiKeyUpdateOne {
	if t != nil {
		akuo.SetExpiresOn(*t)
	}
	return akuo
}

// SetOwner sets the "owner" edge to the User entity.
func (akuo *ApiKeyUpdateOne) SetOwner(u *User) *ApiKeyUpdateOne {
	return akuo.SetOwnerID(u.ID)
}

// Mutation returns the ApiKeyMutation object of the builder.
func (akuo *ApiKeyUpdateOne) Mutation() *ApiKeyMutation {
	return akuo.mutation
}

// ClearOwner clears the "owner" edge to the User entity.
func (akuo *ApiKeyUpdateOne) ClearOwner() *ApiKeyUpdateOne {
	akuo.mutation.ClearOwner()
	return akuo
}

// Where appends a list predicates to the ApiKeyUpdate builder.
func (akuo *ApiKeyUpdateOne) Where(ps ...predicate.ApiKey) *ApiKeyUpdateOne {
	akuo.mutation.Where(ps...)
	return akuo
}

// Select allows selecting one or more fields (columns) of the returned entity.
// The default is selecting all fields defined in the entity schema.
func (akuo *ApiKeyUpdateOne) Select(field string, fields ...string) *ApiKeyUpdateOne {
	akuo.fields = append([]string{field}, fields...)
	return akuo
}

// Save executes the query and returns the updated ApiKey entity.
func (akuo *ApiKeyUpdateOne) Save(ctx context.Context) (*ApiKey, error) {
	if err := akuo.defaults(); err != nil {
		return nil, err
	}
	return withHooks(ctx, akuo.sqlSave, akuo.mutation, akuo.hooks)
}

// SaveX is like Save, but panics if an error occurs.
func (akuo *ApiKeyUpdateOne) SaveX(ctx context.Context) *ApiKey {
	node, err := akuo.Save(ctx)
	if err != nil {
		panic(err)
	}
	return node
}

// Exec executes the query on the entity.
func (akuo *ApiKeyUpdateOne) Exec(ctx context.Context) error {
	_, err := akuo.Save(ctx)
	return err
}

// ExecX is like Exec, but panics if an error occurs.
func (akuo *ApiKeyUpdateOne) ExecX(ctx context.Context) {
	if err := akuo.Exec(ctx); err != nil {
		panic(err)
	}
}

// defaults sets the default values of the builder before save.
func (akuo *ApiKeyUpdateOne) defaults() error {
	if _, ok := akuo.mutation.UpdatedAt(); !ok {
		if apikey.UpdateDefaultUpdatedAt == nil {
			return fmt.Errorf("generated: uninitialized apikey.UpdateDefaultUpdatedAt (forgotten import generated/runtime?)")
		}
		v := apikey.UpdateDefaultUpdatedAt()
		akuo.mutation.SetUpdatedAt(v)
	}
	return nil
}

// check runs all checks and user-defined validators on the builder.
func (akuo *ApiKeyUpdateOne) check() error {
	if akuo.mutation.OwnerCleared() && len(akuo.mutation.OwnerIDs()) > 0 {
		return errors.New(`generated: clearing a required unique edge "ApiKey.owner"`)
	}
	return nil
}

// Modify adds a statement modifier for attaching custom logic to the UPDATE statement.
func (akuo *ApiKeyUpdateOne) Modify(modifiers ...func(u *sql.UpdateBuilder)) *ApiKeyUpdateOne {
	akuo.modifiers = append(akuo.modifiers, modifiers...)
	return akuo
}

func (akuo *ApiKeyUpdateOne) sqlSave(ctx context.Context) (_node *ApiKey, err error) {
	if err := akuo.check(); err != nil {
		return _node, err
	}
	_spec := sqlgraph.NewUpdateSpec(apikey.Table, apikey.Columns, sqlgraph.NewFieldSpec(apikey.FieldID, field.TypeUUID))
	id, ok := akuo.mutation.ID()
	if !ok {
		return nil, &ValidationError{Name: "id", err: errors.New(`generated: missing "ApiKey.id" for update`)}
	}
	_spec.Node.ID.Value = id
	if fields := akuo.fields; len(fields) > 0 {
		_spec.Node.Columns = make([]string, 0, len(fields))
		_spec.Node.Columns = append(_spec.Node.Columns, apikey.FieldID)
		for _, f := range fields {
			if !apikey.ValidColumn(f) {
				return nil, &ValidationError{Name: f, err: fmt.Errorf("generated: invalid field %q for query", f)}
			}
			if f != apikey.FieldID {
				_spec.Node.Columns = append(_spec.Node.Columns, f)
			}
		}
	}
	if ps := akuo.mutation.predicates; len(ps) > 0 {
		_spec.Predicate = func(selector *sql.Selector) {
			for i := range ps {
				ps[i](selector)
			}
		}
	}
	if value, ok := akuo.mutation.UpdatedAt(); ok {
		_spec.SetField(apikey.FieldUpdatedAt, field.TypeTime, value)
	}
	if value, ok := akuo.mutation.APIKey(); ok {
		_spec.SetField(apikey.FieldAPIKey, field.TypeString, value)
	}
	if value, ok := akuo.mutation.ExpiresOn(); ok {
		_spec.SetField(apikey.FieldExpiresOn, field.TypeTime, value)
	}
	if akuo.mutation.OwnerCleared() {
		edge := &sqlgraph.EdgeSpec{
			Rel:     sqlgraph.M2O,
			Inverse: true,
			Table:   apikey.OwnerTable,
			Columns: []string{apikey.OwnerColumn},
			Bidi:    false,
			Target: &sqlgraph.EdgeTarget{
				IDSpec: sqlgraph.NewFieldSpec(user.FieldID, field.TypeUUID),
			},
		}
		_spec.Edges.Clear = append(_spec.Edges.Clear, edge)
	}
	if nodes := akuo.mutation.OwnerIDs(); len(nodes) > 0 {
		edge := &sqlgraph.EdgeSpec{
			Rel:     sqlgraph.M2O,
			Inverse: true,
			Table:   apikey.OwnerTable,
			Columns: []string{apikey.OwnerColumn},
			Bidi:    false,
			Target: &sqlgraph.EdgeTarget{
				IDSpec: sqlgraph.NewFieldSpec(user.FieldID, field.TypeUUID),
			},
		}
		for _, k := range nodes {
			edge.Target.Nodes = append(edge.Target.Nodes, k)
		}
		_spec.Edges.Add = append(_spec.Edges.Add, edge)
	}
	_spec.AddModifiers(akuo.modifiers...)
	_node = &ApiKey{config: akuo.config}
	_spec.Assign = _node.assignValues
	_spec.ScanValues = _node.scanValues
	if err = sqlgraph.UpdateNode(ctx, akuo.driver, _spec); err != nil {
		if _, ok := err.(*sqlgraph.NotFoundError); ok {
			err = &NotFoundError{apikey.Label}
		} else if sqlgraph.IsConstraintError(err) {
			err = &ConstraintError{msg: err.Error(), wrap: err}
		}
		return nil, err
	}
	akuo.mutation.done = true
	return _node, nil
}
