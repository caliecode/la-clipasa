package gql

import (
	"context"
	"errors"

	"github.com/laclipasa/la-clipasa/internal/gql/model"
)

// UserSearch is the resolver for the userSearch field.
func (r *queryResolver) UserSearch(ctx context.Context, query string) (*model.UserSearchResult, error) {
	panic(errors.New("not implemented: UserSearch - userSearch"))
}

// Search is the resolver for the search field.
func (r *queryResolver) Search(ctx context.Context, query string) (*model.SearchResultConnection, error) {
	panic(errors.New("not implemented: Search - search"))
}

// AdminSearch is the resolver for the adminSearch field.
func (r *queryResolver) AdminSearch(ctx context.Context, query string) (*model.SearchResultConnection, error) {
	panic(errors.New("not implemented: AdminSearch - adminSearch"))
}
