package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/caliecode/la-clipasa/internal/ent/interceptors"
	"github.com/caliecode/la-clipasa/internal/ent/schema/mixins"
)

// Comment holds the schema definition for the Comment entity.
type Comment struct {
	ent.Schema
}

// Fields of the Comment.
func (Comment) Fields() []ent.Field {
	return []ent.Field{
		field.String("content").
			NotEmpty(),
	}
}

// Edges of the Comment.
func (Comment) Edges() []ent.Edge {
	return []ent.Edge{
		// Comment belongs to a post only
		edge.From("post", Post.Type).
			Ref("comments").
			Unique(),
	}
}

func (Comment) Annotations() []schema.Annotation {
	return append(baseGqlAnnotations)
}

func (Comment) Indexes() []ent.Index {
	return []ent.Index{}
}

func (Comment) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
		mixins.UUIDMixin{},
		mixins.SoftDeleteMixin{},
		UserOwnedMixin{
			Ref:             "comments",
			AllowUpdate:     true,
			SkipInterceptor: interceptors.SkipAll,
			SoftDeleteIndex: true,
		},
	}
}
