package schema

import (
	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"

	"github.com/caliecode/la-clipasa/internal/ent/interceptors"
	"github.com/caliecode/la-clipasa/internal/ent/schema/mixins"
)

// Post holds the schema definition for the Post entity.
type Post struct {
	ent.Schema
}

// Fields of the Post.
func (Post) Fields() []ent.Field {
	return []ent.Field{
		field.Bool("pinned").
			Default(false),
		field.String("title"),
		field.String("content").
			Nillable().
			Optional(),
		field.String("link").
			NotEmpty(),
		field.String("moderation_comment").
			Optional(),
		field.Bool("is_moderated").
			Default(false),
		// use triggers on table columns instead, with immutable, to mimic `GENERATED ALWAYS`.
		// Atlas does respect index, trigger and function definitions in custom migration files, but not field expressions!
		// see 20250129172342_trigger.up.sql
		field.Text("entity_vector").
			SchemaType(map[string]string{
				dialect.Postgres: "tsvector",
			}).
			Optional().Default("").Immutable().Annotations(
			entgql.Skip(entgql.SkipMutationCreateInput, entgql.SkipMutationUpdateInput, entgql.SkipOrderField)),
	}
}

// Edges of the Post.
func (Post) Edges() []ent.Edge {
	return []ent.Edge{
		// Post has many comments
		edge.To("comments", Comment.Type).
			Annotations(
				entgql.RelayConnection(),
				entgql.OrderField("COMMENTS_COUNT"),
			),

		// Saved or liked posts "belong" to a user
		edge.From("saved_by", User.Type).
			Ref("saved_posts"),
		edge.From("liked_by", User.Type).
			Annotations(
				entgql.RelayConnection(),
				entgql.OrderField("LIKED_BY_COUNT"), // naming has to be (<edge-name>)_COUNT else error invalid order field defined on edge
			).
			Ref("liked_posts"),
		// Post categories
		edge.To("categories", PostCategory.Type),
	}
}

func (Post) Annotations() []schema.Annotation {
	return baseGqlAnnotations
}

func (Post) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
		mixins.UUIDMixin{},
		mixins.SoftDeleteMixin{},
		UserOwnedMixin{
			Ref: "published_posts",
			// AllowUpdate:     true,
			SkipInterceptor: interceptors.SkipAll,
			SoftDeleteIndex: true,
		},
	}
}

func (Post) Indexes() []ent.Index {
	return []ent.Index{
		// TODO: USING GIN (to_tsvector('english', entity_vector)
		index.Fields("entity_vector").
			Annotations(
				entsql.IndexType("GIN"),
			),
		index.Fields("title").
			Annotations(
				entsql.IndexType("GIN"),
			),
	}
}
