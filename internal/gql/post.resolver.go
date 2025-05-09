package gql

import (
	"context"
	"errors"

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
		return nil, parseRequestError(err, action{action: ActionCreate, object: "post"})
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
	if auth.IsAuthorized(internal.GetUserFromCtx(ctx), user.RoleMODERATOR) {
		// allow moderators to update any post field
		ctx = privacy.DecisionContext(ctx, privacy.Allow)
		ctx = token.NewContextWithSystemCallToken(ctx)
	}
	p, err := r.ent.Post.UpdateOneID(id).SetInput(input).Save(ctx)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionUpdate, object: "post"})
	}

	return &model.PostUpdatePayload{
		Post: p,
	}, nil
}

// DeletePost is the resolver for the deletePost field.
func (r *mutationResolver) DeletePost(ctx context.Context, id uuid.UUID) (*model.PostDeletePayload, error) {
	if auth.IsAuthorized(internal.GetUserFromCtx(ctx), user.RoleMODERATOR) {
		// allow moderators to delete any post
		ctx = privacy.DecisionContext(ctx, privacy.Allow)
		ctx = token.NewContextWithSystemCallToken(ctx)
	}
	if err := r.ent.Post.DeleteOneID(id).Exec(ctx); err != nil {
		return nil, parseRequestError(err, action{action: ActionDelete, object: "post"})
	}

	return &model.PostDeletePayload{
		DeletedID: id,
	}, nil
}

// Post is the resolver for the post field.
func (r *queryResolver) Post(ctx context.Context, id uuid.UUID) (*generated.Post, error) {
	panic(errors.New("not implemented: Post - post"))
}
