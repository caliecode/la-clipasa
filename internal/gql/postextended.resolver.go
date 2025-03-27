package gql

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/post"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/gql/model"
	"github.com/caliecode/la-clipasa/internal/utils/pointers"
	"github.com/google/uuid"
)

// CreatePostWithCategories is the resolver for the createPostWithCategories field.
func (r *mutationResolver) CreatePostWithCategories(ctx context.Context, input model.CreatePostWithCategoriesInput) (*model.PostCreatePayload, error) {
	if input.Video != nil {
		video, err := r.discord.UploadFile(ctx, *input.Video)
		if err != nil {
			return nil, fmt.Errorf("failed to upload video to discord: %w", err)
		}

		input.Base.Link = video.Attachments[0].URL
	}

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

// RestorePost is the resolver for the restorePost field.
func (r *mutationResolver) RestorePost(ctx context.Context, id uuid.UUID) (*bool, error) {
	// already has role privacy, and else we can't query the post
	ctx = privacy.DecisionContext(ctx, privacy.Allow)
	_, err := r.ent.Post.UpdateOneID(id).ClearDeletedAt().ClearDeletedBy().Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("could not restore post: %w", err)
	}

	return pointers.New(true), nil
}

// ToHTML is the resolver for the toHTML field.
func (r *postResolver) ToHTML(ctx context.Context, obj *generated.Post) (string, error) {
	panic(fmt.Errorf("not implemented: ToHTML - toHTML"))
}

// NodeID is the resolver for the nodeId field.
func (r *postResolver) NodeID(ctx context.Context, obj *generated.Post) (string, error) {
	// this is not a pagination cursor which is an encoded Cursor
	return base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%d", post.Table, obj.ID))), nil
}
