package gql

import (
	"context"
	"errors"
)

// M is the resolver for the _m field.
func (r *mutationResolver) M(ctx context.Context) (*bool, error) {
	panic(errors.New("not implemented: M - _m"))
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

type mutationResolver struct{ *Resolver }
