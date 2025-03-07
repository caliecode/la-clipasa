package gql

import (
	"context"
	"errors"

	"github.com/99designs/gqlgen/graphql"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/gql/model"
	"github.com/google/uuid"
)

// CreateComment is the resolver for the createComment field.
func (r *mutationResolver) CreateComment(ctx context.Context, input generated.CreateCommentInput) (*model.CommentCreatePayload, error) {
	panic(errors.New("not implemented: CreateComment - createComment"))
}

// CreateBulkComment is the resolver for the createBulkComment field.
func (r *mutationResolver) CreateBulkComment(ctx context.Context, input []*generated.CreateCommentInput) (*model.CommentBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkComment - createBulkComment"))
}

// CreateBulkCSVComment is the resolver for the createBulkCSVComment field.
func (r *mutationResolver) CreateBulkCSVComment(ctx context.Context, input graphql.Upload) (*model.CommentBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkCSVComment - createBulkCSVComment"))
}

// UpdateComment is the resolver for the updateComment field.
func (r *mutationResolver) UpdateComment(ctx context.Context, id uuid.UUID, input generated.UpdateCommentInput) (*model.CommentUpdatePayload, error) {
	panic(errors.New("not implemented: UpdateComment - updateComment"))
}

// DeleteComment is the resolver for the deleteComment field.
func (r *mutationResolver) DeleteComment(ctx context.Context, id uuid.UUID) (*model.CommentDeletePayload, error) {
	panic(errors.New("not implemented: DeleteComment - deleteComment"))
}

// Comment is the resolver for the comment field.
func (r *queryResolver) Comment(ctx context.Context, id uuid.UUID) (*generated.Comment, error) {
	panic(errors.New("not implemented: Comment - comment"))
}
