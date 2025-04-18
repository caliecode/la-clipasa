package gql

import (
	"context"
	"errors"
	"fmt"

	"github.com/99designs/gqlgen/graphql"
	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/auth"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/caliecode/la-clipasa/internal/gql/model"
	"github.com/google/uuid"
)

// CreatePost is the resolver for the createPost field.
func (r *mutationResolver) CreatePost(ctx context.Context, input generated.CreatePostInput) (*model.PostCreatePayload, error) {
	r.ent.Logger.Debugf("CreatePost: %+v", input)

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
	u := internal.GetUserFromCtx(ctx)
	r.ent.Logger.Debugf("user: %+v", u)
	if auth.IsAuthorized(internal.GetUserFromCtx(ctx), user.RoleMODERATOR) {
		// allow moderators to update any post field
		ctx = privacy.DecisionContext(ctx, privacy.Allow)
		ctx = token.NewContextWithSystemCallToken(ctx)
	}
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
	// since it already has role directive, and else we can't query the post (not found)
	ctx = privacy.DecisionContext(ctx, privacy.Allow)
	if err := r.ent.Post.DeleteOneID(id).Exec(ctx); err != nil {
		return nil, fmt.Errorf("could not delete post: %w", err)
	}

	return &model.PostDeletePayload{
		DeletedID: id,
	}, nil
}

// Post is the resolver for the post field.
func (r *queryResolver) Post(ctx context.Context, id uuid.UUID) (*generated.Post, error) {
	panic(errors.New("not implemented: Post - post"))
}
