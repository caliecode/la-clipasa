package http

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/auth"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/caliecode/la-clipasa/internal/http/httputil"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"go.uber.org/zap"
)

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
		authn:  authn,
	}
}

// TryAuthentication stores the caller in the context if any or continues unauthenticated.
// Attempts to refresh the access token if it's expired and a valid refresh token cookie exists.
func (m *authMiddleware) TryAuthentication() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		logger := internal.GetLoggerFromCtx(ctx)
		var u *generated.User

		apiKey := c.Request.Header.Get(ApiKeyHeaderKey)
		authHeader := c.Request.Header.Get(AuthorizationHeaderKey)

		sysCtx := token.NewContextWithSystemCallToken(ctx)
		if apiKey != "" {
			apiKeyUser, err := m.authn.GetUserFromAPIKey(sysCtx, apiKey)
			if err == nil {
				u = apiKeyUser
			}
			c.Request = c.Request.WithContext(internal.SetUserCtx(ctx, u))
			c.Next()
			return
		}

		if strings.HasPrefix(authHeader, auth.AccessTokenBearerPrefix) {
			accessToken := strings.TrimPrefix(authHeader, auth.AccessTokenBearerPrefix)
			tokenUser, err := m.authn.GetUserFromAccessToken(ctx, accessToken)

			if err == nil {
				u = tokenUser
			} else {
				if errors.Is(err, auth.ErrExpiredToken) || errors.Is(err, jwt.ErrTokenExpired) {
					logger.Debugf("Access token expired, attempting refresh due to: %v", err)

					refreshTokenCookie, cookieErr := c.Cookie(httputil.RefreshTokenCookieName)
					if cookieErr == nil && refreshTokenCookie != "" {
						// try to use cookie
						sysCtx := context.WithValue(ctx, "GinContextKey", c)
						refreshedUser, newTokenPair, refreshErr := m.authn.ValidateAndRotateRefreshToken(sysCtx, refreshTokenCookie)
						if refreshErr == nil {
							u = refreshedUser
							m.logger.Debugw("Setting refresh+access token cookie", "user_id", u.ID)
							httputil.SetRefreshTokenCookie(c, newTokenPair.RefreshToken, auth.RefreshTokenLifeTime) // refresh token rotation
							httputil.SetAccessTokenCookie(c, newTokenPair.AccessToken)

							c.Header("X-Access-Token-Refreshed", "true")
						} else {
							// invalid, expired, revoked refresh token, db error, etc.
							logger.Warnw("Failed to refresh token", "error", refreshErr)
							httputil.SignOutUser(c)
							// u remains nil
						}
					} else {
						logger.Infow("Access token expired, but no refresh token cookie present")
						// u remains nil
						if cookieErr != http.ErrNoCookie {
							logger.Warnw("Error reading refresh token cookie", "error", cookieErr)
						}
						httputil.SignOutUser(c)
					}
				} else {
					// invalid signature, user not found, etc.
					logger.Warnw("Failed to validate access token", "error", err)
					httputil.SignOutUser(c)
					// u remains nil
				}
			}
		}

		c.Request = c.Request.WithContext(internal.SetUserCtx(ctx, u))
		c.Next()
		return
	}
}
