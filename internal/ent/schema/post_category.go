package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/laclipasa/la-clipasa/internal/ent/schema/mixins"
)

// PostCategory holds the schema definition for the PostCategory entity.
type PostCategory struct {
	ent.Schema
}

// Fields of the PostCategory.
func (PostCategory) Fields() []ent.Field {
	return []ent.Field{
		field.Enum("category").Values("RANA", "SIN_SONIDO", "MEME_ARTESANAL", "NO_SE_YO", "ORO", "DIAMANTE", "MEH", "ALERTA_GLONETILLO", "GRR", "ENSORDECEDOR", "RAGUUUL"),
	}
}

func (PostCategory) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("post", Post.Type).Ref("categories").Unique(),
	}
}

// unique index on category+post edge
func (PostCategory) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("category").Edges("post").Unique(),
	}
}

func (PostCategory) Annotations() []schema.Annotation {
	return append(baseGqlAnnotations)
}

func (PostCategory) Hooks() []ent.Hook {
	return []ent.Hook{
		// hooks.PostCategoryExclusiveCheck(),
	}
}

func (PostCategory) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
		mixins.UUIDMixin{},
	}
}
