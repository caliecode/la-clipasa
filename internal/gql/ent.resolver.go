package gql

import (
	"context"

	"entgo.io/contrib/entgql"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/google/uuid"
	"github.com/theopenlane/entx"
)

// Node is the resolver for the node field.
func (r *queryResolver) Node(ctx context.Context, id uuid.UUID) (generated.Noder, error) {
	return r.ent.Noder(ctx, id)
}

// Nodes is the resolver for the nodes field.
func (r *queryResolver) Nodes(ctx context.Context, ids []uuid.UUID) ([]generated.Noder, error) {
	return r.ent.Noders(ctx, ids)
}

// APIKeys is the resolver for the apiKeys field.
func (r *queryResolver) APIKeys(ctx context.Context, after *entgql.Cursor[uuid.UUID], first *int, before *entgql.Cursor[uuid.UUID], last *int, orderBy *generated.ApiKeyOrder, where *generated.ApiKeyWhereInput) (*generated.ApiKeyConnection, error) {
	res, err := r.ent.ApiKey.Query().Paginate(
		ctx,
		after,
		first,
		before,
		last,
		generated.WithApiKeyOrder(orderBy),
		generated.WithApiKeyFilter(where.Filter),
	)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionGet, object: "api key"})
	}

	return res, nil
}

// Comments is the resolver for the comments field.
func (r *queryResolver) Comments(ctx context.Context, after *entgql.Cursor[uuid.UUID], first *int, before *entgql.Cursor[uuid.UUID], last *int, orderBy *generated.CommentOrder, where *generated.CommentWhereInput) (*generated.CommentConnection, error) {
	res, err := r.ent.Comment.Query().Paginate(
		ctx,
		after,
		first,
		before,
		last,
		generated.WithCommentOrder(orderBy),
		generated.WithCommentFilter(where.Filter),
	)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionGet, object: "comment"})
	}

	return res, nil
}

// Posts is the resolver for the posts field.
func (r *queryResolver) Posts(ctx context.Context, after *entgql.Cursor[uuid.UUID], first *int, before *entgql.Cursor[uuid.UUID], last *int, orderBy *generated.PostOrder, where *generated.PostWhereInput) (*generated.PostConnection, error) {
	if where.IncludeDeleted != nil && *where.IncludeDeleted ||
		where.IncludeDeletedOnly != nil && *where.IncludeDeletedOnly {
		ctx = entx.SkipSoftDelete(ctx)
	}
	res, err := r.ent.Post.Query().Paginate(
		ctx,
		after,
		first,
		before,
		last,
		generated.WithPostOrder(orderBy),
		generated.WithPostFilter(where.Filter),
	)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionGet, object: "post"})
	}

	return res, nil
}

// PostCategories is the resolver for the postCategories field.
func (r *queryResolver) PostCategories(ctx context.Context, after *entgql.Cursor[uuid.UUID], first *int, before *entgql.Cursor[uuid.UUID], last *int, orderBy *generated.PostCategoryOrder, where *generated.PostCategoryWhereInput) (*generated.PostCategoryConnection, error) {
	res, err := r.ent.PostCategory.Query().Paginate(
		ctx,
		after,
		first,
		before,
		last,
		generated.WithPostCategoryOrder(orderBy),
		generated.WithPostCategoryFilter(where.Filter),
	)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionGet, object: "post category"})
	}

	return res, nil
}

// Users is the resolver for the users field.
func (r *queryResolver) Users(ctx context.Context, after *entgql.Cursor[uuid.UUID], first *int, before *entgql.Cursor[uuid.UUID], last *int, orderBy *generated.UserOrder, where *generated.UserWhereInput) (*generated.UserConnection, error) {
	res, err := r.ent.User.Query().Paginate(
		ctx,
		after,
		first,
		before,
		last,
		generated.WithUserOrder(orderBy),
		generated.WithUserFilter(where.Filter),
	)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionGet, object: "user"})
	}

	return res, nil
}

// Post returns PostResolver implementation.
func (r *Resolver) Post() PostResolver { return &postResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

// User returns UserResolver implementation.
func (r *Resolver) User() UserResolver { return &userResolver{r} }

type (
	postResolver  struct{ *Resolver }
	queryResolver struct{ *Resolver }
	userResolver  struct{ *Resolver }
)
