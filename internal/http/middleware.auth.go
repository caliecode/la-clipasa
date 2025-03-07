package http

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/laclipasa/la-clipasa/internal"
	"github.com/laclipasa/la-clipasa/internal/auth"
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
		if apiKey != "" {
			u, err := m.authn.GetUserFromAPIKey(c.Request.Context(), apiKey) // includes caller joins
			if err != nil || u == nil {
				return
			}

			c.Request = c.Request.WithContext(internal.SetUserCtx(c.Request.Context(), u))

			c.Next() // executes the pending handlers. What goes below is cleanup after the complete request.

			return
		}
		if strings.HasPrefix(auth, "Bearer ") {
			u, err := m.authn.GetUserFromAccessToken(c.Request.Context(), strings.Split(auth, "Bearer ")[1]) // includes caller joins
			if err != nil || u == nil {
				return
			}

			c.Request = c.Request.WithContext(internal.SetUserCtx(c.Request.Context(), u))

			c.Next() // executes the pending handlers. What goes below is cleanup after the complete request.

			return
		}
	}
}
