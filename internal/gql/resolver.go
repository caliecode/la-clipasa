package gql

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

import (
	"context"
	"fmt"

	"github.com/99designs/gqlgen/graphql"
	"github.com/gin-gonic/gin"
	"github.com/theopenlane/entx"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/auth"
	"github.com/caliecode/la-clipasa/internal/client"
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
	ent     *generated.Client
	twitch  *client.TwitchHandlers
	discord *client.DiscordHandlers
	authn   *auth.Authentication
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
		return nil, newUnauthenticatedError(fmt.Sprintf("role directive: not authenticated"))
	}

	if !auth.IsAuthorized(u, role) {
		return nil, newUnauthorizedError(fmt.Sprintf("role directive: not authorized"))
	}

	return next(ctx)
}

func skipSoftDeleteDirective(ctx context.Context, obj any, next graphql.Resolver) (res any, err error) {
	// could also be https://github.com/99designs/gqlgen/issues/1084#issuecomment-795663385
	// if we must know the current field
	if obj, ok := obj.(map[string]any); ok {
		if obj["includeDeleted"] == true || obj["includeDeletedOnly"] == true {
			ctx = entx.SkipSoftDelete(ctx)
		}
	}

	return next(ctx)
}

func NewResolver(entClient *generated.Client) Config {
	return Config{
		Resolvers: &Resolver{
			ent:     entClient,
			twitch:  client.NewTwitchHandlers(entClient),
			discord: client.NewDiscordHandlers(),
			authn:   auth.NewAuthentication(entClient),
		},
		Directives: DirectiveRoot{
			HasRole:        hasRoleDirective,
			SkipSoftDelete: skipSoftDeleteDirective,
		},
	}
}
