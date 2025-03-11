package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/caliecode/la-clipasa/internal/ent/interceptors"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/policy"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/rule"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/caliecode/la-clipasa/internal/ent/schema/mixins"
)

// ApiKey holds the schema definition for the ApiKey entity.
type ApiKey struct {
	ent.Schema
}

// Fields of the ApiKey.
func (ApiKey) Fields() []ent.Field {
	return []ent.Field{
		field.String("api_key"),
		field.Time("expires_on"),
	}
}

func (ApiKey) Edges() []ent.Edge {
	return []ent.Edge{}
}

func (ApiKey) Annotations() []schema.Annotation {
	return baseGqlAnnotations
}

func (ApiKey) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
		mixins.UUIDMixin{},
		UserOwnedMixin{
			Ref:             "api_key",
			SkipInterceptor: interceptors.SkipAll,
		},
	}
}

func (ApiKey) Policy() ent.Policy {
	return policy.NewPolicy(
		policy.WithQueryRules(
			// interceptors are setup to filter users outside of the organization
			// system call token required since we have to query the api keys themselves to
			// authenticate the user and check it's the owner
			rule.AllowIfContextHasPrivacyTokenOfType(&token.SystemCallToken{}),
			rule.AllowIfSelf(),
		),
		policy.WithOnMutationRules(
			// the user hook has update operations on user create so we need to allow email
			// token sign up for update operations as well
			ent.OpCreate|ent.OpUpdateOne,
			rule.AllowIfContextHasPrivacyTokenOfType(&token.SystemCallToken{}),
			rule.AllowIfSelf(),
			rule.AllowIfRole("ADMIN"),
			rule.AllowIfSeedingData(),
		),
		policy.WithOnMutationRules(
			ent.OpUpdate|ent.OpDeleteOne|ent.OpDelete,
			rule.AllowIfRole("ADMIN"),
			rule.AllowIfSelf(),
		),
	)
}
