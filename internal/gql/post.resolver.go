package gql

import (
	"context"
	"errors"
	"fmt"

	"github.com/99designs/gqlgen/graphql"
	"github.com/google/uuid"
	"github.com/laclipasa/la-clipasa/internal"
	"github.com/laclipasa/la-clipasa/internal/ent/generated"
	"github.com/laclipasa/la-clipasa/internal/gql/model"
)

// CreatePost is the resolver for the createPost field.
func (r *mutationResolver) CreatePost(ctx context.Context, input generated.CreatePostInput) (*model.PostCreatePayload, error) {
	r.ent.Logger.Infof("CreatePost: %v", input)

	u := internal.GetUserFromCtx(ctx)
	p, err := r.ent.Post.Create().SetInput(input).SetOwner(u).Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("could not create post: %w", err)
	}

	return &model.PostCreatePayload{
		Post: p,
	}, nil
}

// CreateBulkPost is the resolver for the createBulkPost field.
func (r *mutationResolver) CreateBulkPost(ctx context.Context, input []*generated.CreatePostInput) (*model.PostBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkPost - createBulkPost"))
}

// CreateBulkCSVPost is the resolver for the createBulkCSVPost field.
func (r *mutationResolver) CreateBulkCSVPost(ctx context.Context, input graphql.Upload) (*model.PostBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkCSVPost - createBulkCSVPost"))
}

// UpdatePost is the resolver for the updatePost field.
func (r *mutationResolver) UpdatePost(ctx context.Context, id uuid.UUID, input generated.UpdatePostInput) (*model.PostUpdatePayload, error) {
	p, err := r.ent.Post.UpdateOneID(id).SetInput(input).Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("could not update post: %w", err)
	}

	return &model.PostUpdatePayload{
		Post: p,
	}, nil
}

// DeletePost is the resolver for the deletePost field.
func (r *mutationResolver) DeletePost(ctx context.Context, id uuid.UUID) (*model.PostDeletePayload, error) {
	panic(errors.New("not implemented: DeletePost - deletePost"))
}

// Post is the resolver for the post field.
func (r *queryResolver) Post(ctx context.Context, id uuid.UUID) (*generated.Post, error) {
	panic(errors.New("not implemented: Post - post"))
}
