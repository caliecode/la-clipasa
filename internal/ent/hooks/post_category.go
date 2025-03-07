package hooks

import (
	"context"
	"fmt"

	"entgo.io/ent"
	"github.com/google/uuid"
	"github.com/laclipasa/la-clipasa/internal/ent/generated"
	"github.com/laclipasa/la-clipasa/internal/ent/generated/hook"
	"github.com/laclipasa/la-clipasa/internal/ent/generated/post"
	"github.com/laclipasa/la-clipasa/internal/ent/generated/postcategory"
)

func PostCategoryExclusiveCheck() ent.Hook {
	mutuallyExclCats := map[postcategory.Category]bool{
		postcategory.CategoryRANA:     true,
		postcategory.CategoryORO:      true,
		postcategory.CategoryDIAMANTE: true,
	}

	return hook.On(
		func(next ent.Mutator) ent.Mutator {
			return ent.MutateFunc(func(ctx context.Context, m ent.Mutation) (ent.Value, error) {
				cat, ok := m.Field("category")
				if !ok {
					fmt.Println("FFFF: category not found")
					return next.Mutate(ctx, m)
				}
				category := cat.(postcategory.Category)

				if !mutuallyExclCats[category] {
					fmt.Println("FFFF: category not in mutually exclusive categories")
					return next.Mutate(ctx, m)
				}

				// FIXME: post edge value not in m, how to get it?
				p, ok := m.Field("postID")
				if !ok {
					return nil, fmt.Errorf("failed to retrieve Post ID")
				}
				postID, ok := p.(uuid.UUID)

				// Query existing restricted categories for the Post
				client := generated.FromContext(ctx)
				query := client.PostCategory.Query().
					Where(postcategory.HasPostWith(post.ID(postID))).
					Where(postcategory.CategoryIn(postcategory.CategoryRANA, postcategory.CategoryORO, postcategory.CategoryDIAMANTE))

				// Exclude current PostCategory during updates
				if m.Op().Is(ent.OpUpdate) {
					idValue, exists := m.Field("id")
					id, ok := idValue.(uuid.UUID)
					if exists && ok {
						query.Where(postcategory.IDNEQ(id))
					}
				}

				existing, err := query.All(ctx)
				if err != nil {
					return nil, fmt.Errorf("failed to check existing categories: %v", err)
				}

				if len(existing) > 0 {
					existingCats := make([]postcategory.Category, len(existing))
					for i, c := range existing {
						existingCats[i] = c.Category
					}
					return nil, fmt.Errorf("cannot set %s: Post already has mutually exclusive categories %v", category, existingCats)
				}

				fmt.Println("FFFF: category is not mutually exclusive")
				return next.Mutate(ctx, m)
			})
		},
		ent.OpCreate|ent.OpUpdate,
	)
}
