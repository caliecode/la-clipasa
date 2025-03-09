package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/caliecode/la-clipasa/internal/ent/interceptors"
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
