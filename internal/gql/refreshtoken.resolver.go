package gql

import (
	"context"
	"fmt"

	"github.com/99designs/gqlgen/graphql"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/gql/model"
	"github.com/google/uuid"
)

// CreateRefreshToken is the resolver for the createRefreshToken field.
func (r *mutationResolver) CreateRefreshToken(ctx context.Context, input generated.CreateRefreshTokenInput) (*model.RefreshTokenCreatePayload, error) {
	panic(fmt.Errorf("not implemented: CreateRefreshToken - createRefreshToken"))
}

// CreateBulkRefreshToken is the resolver for the createBulkRefreshToken field.
func (r *mutationResolver) CreateBulkRefreshToken(ctx context.Context, input []*generated.CreateRefreshTokenInput) (*model.RefreshTokenBulkCreatePayload, error) {
	panic(fmt.Errorf("not implemented: CreateBulkRefreshToken - createBulkRefreshToken"))
}

// CreateBulkCSVRefreshToken is the resolver for the createBulkCSVRefreshToken field.
func (r *mutationResolver) CreateBulkCSVRefreshToken(ctx context.Context, input graphql.Upload) (*model.RefreshTokenBulkCreatePayload, error) {
	panic(fmt.Errorf("not implemented: CreateBulkCSVRefreshToken - createBulkCSVRefreshToken"))
}

// UpdateRefreshToken is the resolver for the updateRefreshToken field.
func (r *mutationResolver) UpdateRefreshToken(ctx context.Context, id uuid.UUID, input generated.UpdateRefreshTokenInput) (*model.RefreshTokenUpdatePayload, error) {
	panic(fmt.Errorf("not implemented: UpdateRefreshToken - updateRefreshToken"))
}

// DeleteRefreshToken is the resolver for the deleteRefreshToken field.
func (r *mutationResolver) DeleteRefreshToken(ctx context.Context, id uuid.UUID) (*model.RefreshTokenDeletePayload, error) {
	panic(fmt.Errorf("not implemented: DeleteRefreshToken - deleteRefreshToken"))
}

// RefreshToken is the resolver for the refreshToken field.
func (r *queryResolver) RefreshToken(ctx context.Context, id uuid.UUID) (*generated.RefreshToken, error) {
	panic(fmt.Errorf("not implemented: RefreshToken - refreshToken"))
}
