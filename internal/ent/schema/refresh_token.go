// file: internal/ent/schema/refreshtoken.go
package schema

import (
	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"

	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/caliecode/la-clipasa/internal/ent/interceptors"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/policy"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/rule"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/caliecode/la-clipasa/internal/ent/schema/mixins"
	"github.com/google/uuid"
)

type RefreshToken struct {
	ent.Schema
}

func (RefreshToken) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("token_hash").
			NotEmpty().
			Unique().
			Annotations(
				entgql.Skip(),
			),
		field.Time("expires_at"),
		field.Bool("revoked").
			Default(false),
		field.String("ip_address").
			Optional(),
		field.String("user_agent").
			Optional(),
	}
}

func (RefreshToken) Edges() []ent.Edge {
	return []ent.Edge{}
}

func (RefreshToken) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
		mixins.UUIDMixin{},
		UserOwnedMixin{
			Ref:             "refresh_tokens",
			AllowUpdate:     true,
			SkipInterceptor: interceptors.SkipAll,
		},
	}
}

func (RefreshToken) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("token_hash"),
		index.Fields("expires_at"),
		index.Edges("owner").Fields("revoked", "expires_at"),
	}
}

func (RefreshToken) Annotations() []schema.Annotation {
	return baseGqlAnnotations
}

func (RefreshToken) Policy() ent.Policy {
	return policy.NewPolicy(
		policy.WithQueryRules(
			rule.AllowIfSelfOrHasRoleQuery(user.RoleADMIN),
		),
		policy.WithOnMutationRules(
			ent.OpCreate|ent.OpUpdateOne,
			rule.AllowIfSeedingData(),
			rule.AllowIfContextHasPrivacyTokenOfType(&token.Oauth2Token{}),
			rule.AllowIfContextHasPrivacyTokenOfType(&token.SystemCallToken{}),
			rule.AllowIfSelfOrHasRole(user.RoleADMIN),
		),
		policy.WithOnMutationRules(
			ent.OpUpdate|ent.OpDeleteOne|ent.OpDelete,
			rule.AllowIfSeedingData(),
			rule.AllowIfContextHasPrivacyTokenOfType(&token.SystemCallToken{}),
			rule.AllowIfSelfOrHasRole(user.RoleADMIN),
		),
	)
}
