package gql

import (
	"context"
	"errors"
	"fmt"

	"github.com/99designs/gqlgen/graphql"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/post"
	"github.com/caliecode/la-clipasa/internal/gql/model"
	"github.com/caliecode/la-clipasa/internal/utils/slices"
	"github.com/google/uuid"
)

// CreatePostCategory is the resolver for the createPostCategory field.
func (r *mutationResolver) CreatePostCategory(ctx context.Context, input generated.CreatePostCategoryInput) (*model.PostCategoryCreatePayload, error) {
	postCats := r.ent.Post.Query().Where(post.ID(*input.PostID)).QueryCategories().AllX(ctx)
	if mutuallyExclCats[input.Category] {
		mcats := slices.Filter(postCats, func(pc *generated.PostCategory, i int) bool { return mutuallyExclCats[pc.Category] })
		if len(mcats) > 0 {
			return nil, fmt.Errorf("category %s is mutually exclusive with %v", input.Category, mcats[0].Category)
		}
	}

	pc, err := r.ent.PostCategory.Create().SetInput(input).Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create post category: %w", err)
	}
	return &model.PostCategoryCreatePayload{PostCategory: pc}, nil
}

// CreateBulkPostCategory is the resolver for the createBulkPostCategory field.
func (r *mutationResolver) CreateBulkPostCategory(ctx context.Context, input []*generated.CreatePostCategoryInput) (*model.PostCategoryBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkPostCategory - createBulkPostCategory"))
}

// CreateBulkCSVPostCategory is the resolver for the createBulkCSVPostCategory field.
func (r *mutationResolver) CreateBulkCSVPostCategory(ctx context.Context, input graphql.Upload) (*model.PostCategoryBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkCSVPostCategory - createBulkCSVPostCategory"))
}

// UpdatePostCategory is the resolver for the updatePostCategory field.
func (r *mutationResolver) UpdatePostCategory(ctx context.Context, id uuid.UUID, input generated.UpdatePostCategoryInput) (*model.PostCategoryUpdatePayload, error) {
	panic(errors.New("not implemented: UpdatePostCategory - updatePostCategory"))
}

// DeletePostCategory is the resolver for the deletePostCategory field.
func (r *mutationResolver) DeletePostCategory(ctx context.Context, id uuid.UUID) (*model.PostCategoryDeletePayload, error) {
	err := r.ent.PostCategory.DeleteOneID(id).Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to delete post category: %w", err)
	}
	return &model.PostCategoryDeletePayload{DeletedID: id}, nil
}

// PostCategory is the resolver for the postCategory field.
func (r *queryResolver) PostCategory(ctx context.Context, id uuid.UUID) (*generated.PostCategory, error) {
	panic(errors.New("not implemented: PostCategory - postCategory"))
}
