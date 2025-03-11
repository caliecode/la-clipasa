package http

import (
	"strings"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/auth"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// authMiddleware handles authentication and authorization middleware.
type authMiddleware struct {
	logger *zap.SugaredLogger
	authn  *auth.Authentication
}

func NewAuthMiddleware(
	logger *zap.SugaredLogger,
	authn *auth.Authentication,
) *authMiddleware {
	return &authMiddleware{
		logger: logger,
	}
}

// TryAuthentication stores the caller in the context if any or continues unauthenticated.
func (m *authMiddleware) TryAuthentication() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.Request.Header.Get(ApiKeyHeaderKey)
		auth := c.Request.Header.Get(AuthorizationHeaderKey)
		ctx := c.Request.Context()

		if apiKey != "" {
			// only execute related queries to get api key with system call token bypass.
			u, err := m.authn.GetUserFromAPIKey(token.NewContextWithSystemCallToken(ctx), apiKey) // includes caller joins
			if err != nil {
				logger := internal.GetLoggerFromCtx(ctx)
				logger.Errorf("failed to get user from api key: %s", err.Error())
			}
			c.Request = c.Request.WithContext(internal.SetUserCtx(ctx, u))

			c.Next() // executes the pending handlers. What goes below is cleanup after the complete request.

			return
		}
		if strings.HasPrefix(auth, "Bearer ") {
			u, err := m.authn.GetUserFromAccessToken(ctx, strings.Split(auth, "Bearer ")[1]) // includes caller joins
			if err != nil {
				logger := internal.GetLoggerFromCtx(ctx)
				logger.Errorf("failed to get user from token: %s", err.Error())
			}
			c.Request = c.Request.WithContext(internal.SetUserCtx(ctx, u))

			c.Next() // executes the pending handlers. What goes below is cleanup after the complete request.

			return
		}
	}
}
