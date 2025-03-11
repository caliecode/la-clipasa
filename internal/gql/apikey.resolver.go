package gql

import (
	"context"
	"errors"

	"github.com/99designs/gqlgen/graphql"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/gql/model"
	"github.com/google/uuid"
)

// CreateAPIKey is the resolver for the createApiKey field.
func (r *mutationResolver) CreateAPIKey(ctx context.Context, input generated.CreateApiKeyInput) (*model.APIKeyCreatePayload, error) {
	ak, err := r.ent.ApiKey.Create().SetInput(input).Save(ctx)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionCreate, object: "api key"})
	}

	return &model.APIKeyCreatePayload{
		APIKey: ak,
	}, nil
}

// CreateBulkAPIKey is the resolver for the createBulkApiKey field.
func (r *mutationResolver) CreateBulkAPIKey(ctx context.Context, input []*generated.CreateApiKeyInput) (*model.APIKeyBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkAPIKey - createBulkApiKey"))
}

// CreateBulkCSVAPIKey is the resolver for the createBulkCSVApiKey field.
func (r *mutationResolver) CreateBulkCSVAPIKey(ctx context.Context, input graphql.Upload) (*model.APIKeyBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkCSVAPIKey - createBulkCSVApiKey"))
}

// UpdateAPIKey is the resolver for the updateApiKey field.
func (r *mutationResolver) UpdateAPIKey(ctx context.Context, id uuid.UUID, input generated.UpdateApiKeyInput) (*model.APIKeyUpdatePayload, error) {
	panic(errors.New("not implemented: UpdateAPIKey - updateApiKey"))
}

// DeleteAPIKey is the resolver for the deleteApiKey field.
func (r *mutationResolver) DeleteAPIKey(ctx context.Context, id uuid.UUID) (*model.APIKeyDeletePayload, error) {
	panic(errors.New("not implemented: DeleteAPIKey - deleteApiKey"))
}

// APIKey is the resolver for the apiKey field.
func (r *queryResolver) APIKey(ctx context.Context, id uuid.UUID) (*generated.ApiKey, error) {
	ak, err := r.ent.ApiKey.Get(ctx, id)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionGet, object: "api key"})
	}

	return ak, nil
}
