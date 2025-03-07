package gql

import (
	"context"
	"errors"

	"github.com/99designs/gqlgen/graphql"
	"github.com/google/uuid"
	"github.com/laclipasa/la-clipasa/internal/ent/generated"
	"github.com/laclipasa/la-clipasa/internal/gql/model"
)

// CreateUser is the resolver for the createUser field.
func (r *mutationResolver) CreateUser(ctx context.Context, input generated.CreateUserInput) (*model.UserCreatePayload, error) {
	user, err := r.ent.User.Create().SetInput(input).Save(ctx)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionCreate, object: "user"})
	}

	return &model.UserCreatePayload{
		User: user,
	}, nil
}

// CreateBulkUser is the resolver for the createBulkUser field.
func (r *mutationResolver) CreateBulkUser(ctx context.Context, input []*generated.CreateUserInput) (*model.UserBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkUser - createBulkUser"))
}

// CreateBulkCSVUser is the resolver for the createBulkCSVUser field.
func (r *mutationResolver) CreateBulkCSVUser(ctx context.Context, input graphql.Upload) (*model.UserBulkCreatePayload, error) {
	panic(errors.New("not implemented: CreateBulkCSVUser - createBulkCSVUser"))
}

// UpdateUser is the resolver for the updateUser field.
func (r *mutationResolver) UpdateUser(ctx context.Context, id uuid.UUID, input generated.UpdateUserInput) (*model.UserUpdatePayload, error) {
	u, err := r.ent.User.UpdateOneID(id).SetInput(input).Save(ctx)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionUpdate, object: "user"})
	}

	return &model.UserUpdatePayload{
		User: u,
	}, nil
}

// DeleteUser is the resolver for the deleteUser field.
func (r *mutationResolver) DeleteUser(ctx context.Context, id uuid.UUID) (*model.UserDeletePayload, error) {
	// TODO: checkout openlane core/internal/graphapi/errors.go for generic error handling
	if err := r.ent.User.DeleteOneID(id).Exec(ctx); err != nil {
		return nil, parseRequestError(err, action{action: ActionDelete, object: "user"})
	}

	if err := generated.UserEdgeCleanup(ctx, id); err != nil {
		return nil, newCascadeDeleteError(err)
	}

	return &model.UserDeletePayload{
		DeletedID: id,
	}, nil
}

// User is the resolver for the user field.
func (r *queryResolver) User(ctx context.Context, id uuid.UUID) (*generated.User, error) {
	panic(errors.New("not implemented: User - user"))
}
