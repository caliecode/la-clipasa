package gql

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/post"
	"github.com/caliecode/la-clipasa/internal/gql/model"
)

// CreatePostWithCategories is the resolver for the createPostWithCategories field.
func (r *mutationResolver) CreatePostWithCategories(ctx context.Context, input model.CreatePostWithCategoriesInput) (*model.PostCreatePayload, error) {
	postPayload, err := r.CreatePost(ctx, *input.Base)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionCreate, object: "post"})
	}

	if len(input.Categories) > 0 {
		builders := make([]*generated.PostCategoryCreate, len(input.Categories))
		for i := range input.Categories {
			builders[i] = r.ent.PostCategory.Create().SetInput(generated.CreatePostCategoryInput{
				Category: input.Categories[i],
				PostID:   &postPayload.Post.ID,
			})
		}

		b, err := r.ent.PostCategory.CreateBulk(builders...).Save(ctx)
		if err != nil {
			return nil, parseRequestError(err, action{action: ActionCreate, object: "post category"})
		}
		postPayload.Post.Edges.Categories = b
	}

	return &model.PostCreatePayload{
		Post: postPayload.Post,
	}, nil
}

// ToHTML is the resolver for the toHTML field.
func (r *postResolver) ToHTML(ctx context.Context, obj *generated.Post) (string, error) {
	panic(fmt.Errorf("not implemented: ToHTML - toHTML"))
}

// NodeID is the resolver for the nodeId field.
func (r *postResolver) NodeID(ctx context.Context, obj *generated.Post) (string, error) {
	// same as returned by cursor
	return base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%d", post.Table, obj.ID))), nil
}
