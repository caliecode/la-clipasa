package gql

import (
	"context"
	"errors"

	"github.com/laclipasa/la-clipasa/internal/gql/model"
)

// AdminUserSearch is the resolver for the adminUserSearch field.
func (r *queryResolver) AdminUserSearch(ctx context.Context, query string) (*model.UserSearchResult, error) {
	panic(errors.New("not implemented: AdminUserSearch - adminUserSearch"))
}
