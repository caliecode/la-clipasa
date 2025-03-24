package schema

import (
	"context"
	"time"

	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/hook"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/policy"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/rule"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/caliecode/la-clipasa/internal/ent/schema/mixins"
	"github.com/theopenlane/entx"
)

// User holds the schema definition for the User entity.
type User struct {
	ent.Schema
}

// Fields of the User.
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("display_name").
			Annotations(
				entx.FieldSearchable(),
			),
		field.String("alias").
			Comment("the alias of the user is shown alongside the display name").
			Optional(),
		field.String("profile_image").
			Nillable().
			Optional(),
		field.String("external_id").
			Comment("the auth_provider unique id of the user").
			Annotations(
				entgql.Skip(entgql.SkipAll),
			).
			Unique(),
		field.Enum("auth_provider").
			Values("TWITCH").Default("TWITCH"),
		field.Enum("role").
			Comment("the role of the user").
			Values("GUEST", "USER", "ADMIN", "MODERATOR").
			Default("GUEST"),
		field.Time("last_seen_at").
			Comment("the time the user was last seen").
			UpdateDefault(time.Now).
			Optional().
			Nillable(),
		field.String("last_post_seen_cursor").
			Comment("cursor for last post seen").
			Optional().
			Nillable(),
		field.JSON("awards", []string{}).
			Annotations(
				entx.FieldSearchable(),
			).
			Optional(),
	}
}

func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("saved_posts", Post.Type),
		edge.To("liked_posts", Post.Type),
		edge.To("published_posts", Post.Type).
			Annotations(
				entx.CascadeAnnotationField("Owner"), // for edge_cleanup gen
			),
		edge.To("comments", Comment.Type),
		edge.To("api_keys", ApiKey.Type).
			Annotations(
				entx.CascadeAnnotationField("Owner"), // for edge_cleanup gen
			),
	}
}

func (User) Annotations() []schema.Annotation {
	return baseGqlAnnotations
}

func (User) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
		mixins.UUIDMixin{},
		mixins.SoftDeleteMixin{},
	}
}

// TODO: see https://entgo.io/docs/schema-indexes/ for FTS, GIN, RUM etc.
func (User) Indexes() []ent.Index {
	return []ent.Index{}
}

// Interceptors of the User.
func (d User) Interceptors() []ent.Interceptor {
	return []ent.Interceptor{}
}

func (User) Hooks() []ent.Hook {
	return []ent.Hook{
		DummyHook(),
	}
}

// Policy of the User
func (User) Policy() ent.Policy {
	return policy.NewPolicy(
		policy.WithQueryRules(
			// interceptors are setup to filter users outside of the organization
			privacy.AlwaysAllowRule(),
		),
		policy.WithOnMutationRules(
			// the user hook has update operations on user create so we need to allow email
			// token sign up for update operations as well
			ent.OpCreate|ent.OpUpdateOne,
			rule.AllowIfContextHasPrivacyTokenOfType(&token.Oauth2Token{}),
			rule.AllowIfSelfOrHasRole(user.RoleADMIN),
		),
		policy.WithOnMutationRules(
			ent.OpUpdate|ent.OpDeleteOne|ent.OpDelete,
			rule.AllowIfSelfOrHasRole(user.RoleADMIN),
		),
	)
}

// so that runtime.go is always generated to the correct dir even if no hooks are set.
func DummyHook() ent.Hook {
	return hook.On(func(next ent.Mutator) ent.Mutator {
		return hook.UserFunc(func(ctx context.Context, m *generated.UserMutation) (generated.Value, error) {
			return next.Mutate(ctx, m)
		})
	}, ent.OpCreate)
}
