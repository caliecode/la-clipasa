/**
 * Based on github.com/theopenlane/core
 */

package schema

import (
	"context"
	"errors"
	"fmt"

	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/dialect/sql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"entgo.io/ent/schema/mixin"
	"github.com/google/uuid"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/intercept"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/ent/interceptors"
)

const (
	ownerFieldName = "owner_id"
)

// IMPORTANT: Ref from edge.To("<Ref>) in User schema
// must make sure we dont have duplicate edge Ref, else foreign-key was
// not found for edge "owner" of type
// since Ref if already used by another edge.
// It is skipped in entgql.
type UserOwnedMixin struct {
	mixin.Schema
	// Ref table for the id
	Ref string
	// Optional makes the owner id field not required
	Optional bool
	// AllowUpdate allows the owner id field to be updated
	AllowUpdate bool
	// SkipOASGeneration skips open api spec generation for the field
	SkipOASGeneration bool
	// SoftDeleteIndex creates a unique index on the owner id field where deleted_at is null
	SoftDeleteIndex bool
	// AllowWhere includes the owner_id field in gql generated fields
	AllowWhere bool
	// SkipInterceptor skips the interceptor for that schema for all queries, or specific types,
	// this is useful for tokens, etc
	SkipInterceptor interceptors.SkipMode
}

// Fields of the UserOwnedMixin.
func (userOwned UserOwnedMixin) Fields() []ent.Field {
	ownerIDField := field.UUID("owner_id", uuid.UUID{}).
		Annotations(
			entgql.Skip(),
		).
		Comment("The user id that owns the object")

	if userOwned.Optional {
		ownerIDField.Optional()
	}

	return []ent.Field{
		ownerIDField,
	}
}

// Edges of the UserOwnedMixin.
func (userOwned UserOwnedMixin) Edges() []ent.Edge {
	if userOwned.Ref == "" {
		panic(errors.New("ref must be non-empty string")) // nolint: goerr113
	}

	ownerEdge := edge.
		From("owner", User.Type).
		Field("owner_id").
		Ref(userOwned.Ref).
		Unique()

	if !userOwned.Optional {
		ownerEdge.Required()
	}

	if !userOwned.AllowUpdate {
		ownerEdge.Annotations(
			entgql.Skip(entgql.SkipMutationUpdateInput),
		)
	}

	if userOwned.SkipOASGeneration {
		ownerEdge.Annotations(
			entgql.Skip(entgql.SkipMutationCreateInput, entgql.SkipMutationUpdateInput),
		)
	}

	return []ent.Edge{
		ownerEdge,
	}
}

// Indexes of the UserOwnedMixin.
func (userOwned UserOwnedMixin) Indexes() []ent.Index {
	if !userOwned.SoftDeleteIndex {
		return []ent.Index{}
	}

	return []ent.Index{
		// NOTE: replay mode in migrations required to prevent regen regardless of index definition
		// see https://github.com/ent/ent/issues/3925
		// SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' and indexdef ilike '%deleted_at%'
		index.Fields("owner_id").Annotations(entsql.IndexWhere("(deleted_at IS NULL)")),
	}
}

// Hooks of the UserOwnedMixin.
func (userOwned UserOwnedMixin) Hooks() []ent.Hook {
	return []ent.Hook{
		func(next ent.Mutator) ent.Mutator {
			return ent.MutateFunc(func(ctx context.Context, m ent.Mutation) (ent.Value, error) {
				// skip hook if strictly set to allow
				if _, allow := privacy.DecisionFromContext(ctx); allow {
					return next.Mutate(ctx, m)
				}

				u := internal.GetUserFromCtx(ctx)
				if u == nil {
					return nil, errors.New("user owned hook: no user in context")
				}

				// set owner on create mutation
				if m.Op() == ent.OpCreate {
					// set owner on mutation
					if err := m.SetField(ownerFieldName, u.ID); err != nil {
						return nil, fmt.Errorf("could not set owner id: %w", err)
					}
				} else {
					// filter by owner on update and delete mutations
					_, ok := m.(interface {
						SetOp(ent.Op)
						Client() *generated.Client
						WhereP(...func(*sql.Selector))
					})
					if !ok {
						return nil, errors.New("unexpected mutation type")
					}

					// this breaks when we allow access to other users by role since they're not the owner
					// previous role or admin checks will already add the clause
					// userOwned.P(mx, u.ID.String())
				}

				return next.Mutate(ctx, m)
			})
		},
	}
}

func (userOwned UserOwnedMixin) Interceptors() []ent.Interceptor {
	if userOwned.Optional {
		return []ent.Interceptor{}
	}

	return []ent.Interceptor{
		intercept.TraverseFunc(func(ctx context.Context, q intercept.Query) error {
			// Skip the interceptor for all queries if SkipInterceptor flag is set
			// This is needed for schemas that are never authorized users such as email verification tokens
			if userOwned.SkipInterceptor == interceptors.SkipAll {
				return nil
			}

			u := internal.GetUserFromCtx(ctx)
			if u == nil {
				ctxQuery := ent.QueryFromContext(ctx)

				// Skip the interceptor if the query is for a single entity
				// and the SkipInterceptor flag is set for Only queries
				if userOwned.SkipInterceptor == interceptors.SkipOnlyQuery && ctxQuery.Op == "Only" {
					return nil
				}

				return errors.New("userowned interceptor: user not in context")
			}

			// FIXME: this breaks when we allow access to other users by role since they're not the owner
			userOwned.P(q, u.ID.String())

			return nil
		}),
	}
}

// P adds a storage-level predicate to the queries and mutations.
func (userOwned UserOwnedMixin) P(w interface{ WhereP(...func(*sql.Selector)) }, userID string) {
	w.WhereP(
		sql.FieldEQ(ownerFieldName, userID),
	)
}
