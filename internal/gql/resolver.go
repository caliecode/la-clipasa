package gql

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

import (
	"context"
	"errors"
	"fmt"

	"github.com/99designs/gqlgen/graphql"
	"github.com/gin-gonic/gin"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/auth"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
)

type Action string

const (
	ActionGet    Action = "get"
	ActionUpdate Action = "update"
	ActionDelete Action = "delete"
	ActionCreate Action = "create"
)

type Resolver struct {
	ent *generated.Client
}

func GinContextFromCtx(ctx context.Context) (*gin.Context, error) {
	ginCtx, ok := ctx.Value("GinContextKey").(*gin.Context)
	if !ok {
		return nil, fmt.Errorf("failed to get gin context from request context")
	}
	return ginCtx, nil
}

func hasRoleDirective(ctx context.Context, obj any, next graphql.Resolver, role user.Role) (res any, err error) {
	u := internal.GetUserFromCtx(ctx)
	if u == nil {
		return nil, internal.WrapErrorf(errors.New("has role directive: unauthenticated"), internal.ErrorCodeUnauthenticated, "unauthenticated")
	}

	if auth.RoleRank.Get(u.Role) < auth.RoleRank.Get(role) {
		return nil, internal.WrapErrorf(errors.New("has role directive: unauthorized"), internal.ErrorCodeUnauthorized, "unauthorized")
	}

	return next(ctx)
}

func NewResolver(entClient *generated.Client) Config {
	return Config{
		Resolvers: &Resolver{
			ent: entClient,
		},
		Directives: DirectiveRoot{
			HasRole: hasRoleDirective,
		},
	}
}
