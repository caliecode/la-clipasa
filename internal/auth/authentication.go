package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/client"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/apikey"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/zitadel/oidc/v3/pkg/oidc"
)

type AppClaims struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type Authentication struct {
	twitch *client.TwitchHandlers
}

// NewAuthentication returns a new authentication service.
func NewAuthentication() *Authentication {
	twitch := client.NewTwitchHandlers()

	return &Authentication{
		twitch: twitch,
	}
}

// GetUserFromAccessToken returns a user from a token.
func (a *Authentication) GetUserFromAccessToken(ctx context.Context, token string) (*generated.User, error) {
	entclt := generated.FromContext(ctx)
	claims, err := a.ParseToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	user, err := entclt.User.Query().Where(user.ExternalID(claims.Subject)).Only(ctx)
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeNotFound, "user from token not found")
	}

	return user, nil
}

// GetUserFromAPIKey returns a user from an api key.
func (a *Authentication) GetUserFromAPIKey(ctx context.Context, key string) (*generated.User, error) {
	entclt := generated.FromContext(ctx)
	u, err := entclt.User.Query().Where(user.HasAPIKeyWith(apikey.APIKey(key))).WithAPIKey().Only(ctx)
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeNotFound, "user from api key not found")
	}
	ak, err := u.Edges.APIKeyOrErr()
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeNotFound, "api key edge")
	}
	if ak.ExpiresOn.Before(time.Now()) {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeUnauthorized, "api key expired")
	}

	return u, nil
}

const defaultRole = user.RoleGUEST

// GetOrRegisterUserFromUserInfo returns a user from user info.
func (a *Authentication) GetOrRegisterUserFromUserInfo(c *gin.Context, userinfo *oidc.UserInfo) (*generated.User, error) {
	ctx := c.Request.Context()
	entclt := generated.FromContext(ctx)

	role := user.RoleUSER
	if !userinfo.EmailVerified {
		role = defaultRole
	}

	u, err := entclt.User.Query().Where(user.ExternalID(userinfo.Subject)).Only(ctx)
	if err != nil && !generated.IsNotFound(err) {
		return nil, internal.WrapErrorf(err, internal.ErrorCodePrivate, "could not query user %s", userinfo.PreferredUsername)
	}

	ginCtx, _ := ctx.Value("GinContextKey").(*gin.Context)
	twitchUser, err := a.twitch.GetUser(ginCtx)
	if err != nil {
		return nil, err
	}
	profileImage := twitchUser.Data[0].ProfileImageURL

	// create user on first login
	if u == nil {
		u, err = entclt.User.Create().
			SetExternalID(userinfo.Subject).
			SetProfileImage(profileImage).
			SetDisplayName(userinfo.PreferredUsername).
			SetRole(role).
			Save(ctx)
		if err != nil {
			return nil, internal.WrapErrorf(err, internal.ErrorCodeUnknown, "could not create user from provider")
		}
	}
	userUpdate := u.Update()
	if u.Role == defaultRole && userinfo.EmailVerified {
		userUpdate.SetRole(user.RoleUSER)
	}
	// update out of sync non editable fields
	// userinfo.Email is empty for some reason with user:read:email scope
	if u.DisplayName != userinfo.PreferredUsername {
		userUpdate.SetDisplayName(userinfo.PreferredUsername)
	}
	if u.ProfileImage == nil || *u.ProfileImage != profileImage {
		userUpdate.SetProfileImage(profileImage)
	}
	if u, err = userUpdate.Save(ctx); err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeUnknown, "could not update user from provider")
	}

	return u, nil
}

// CreateAccessTokenForUser creates a new token for a user.
func (a *Authentication) CreateAccessTokenForUser(ctx context.Context, user *generated.User) (string, error) {
	cfg := internal.Config
	claims := AppClaims{
		Username: user.DisplayName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // mandatory
			Issuer:    cfg.TwitchOIDC.Issuer,                                  // mandatory
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   user.ExternalID,
			// ID:        "1", // to explicitly revoke tokens. No longer stateless
			Audience: []string{"la-clipasa"},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ss, err := token.SignedString([]byte(cfg.SigningKey)) // cannot handle strings for some reason https://github.com/dgrijalva/jwt-go/issues/65
	if err != nil {
		return "", fmt.Errorf("could not sign token: %w", err)
	}

	return ss, nil
}

// CreateAPIKeyForUser creates a new API key for a user.
func (a *Authentication) CreateAPIKeyForUser(ctx context.Context, user *generated.User, expiresOn time.Time) (*generated.ApiKey, error) {
	entclt := generated.FromContext(ctx)
	uak, err := entclt.ApiKey.Create().SetExpiresOn(expiresOn).SetOwner(user).Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("usvc.CreateAPIKey: %w", err)
	}

	return uak, nil
}

// ParseToken returns a token string claims.
func (a *Authentication) ParseToken(ctx context.Context, token string) (*AppClaims, error) {
	cfg := internal.Config
	jwtToken, err := jwt.ParseWithClaims(token, &AppClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.SigningKey), nil // can't handle string in signing keys here either
	})
	if err != nil || jwtToken == nil {
		return nil, fmt.Errorf("could not parse token: %w", err)
	}

	if _, ok := jwtToken.Method.(*jwt.SigningMethodHMAC); !ok {
		return nil, fmt.Errorf("unexpected signing method: %v", jwtToken.Header["alg"])
	}

	claims, ok := jwtToken.Claims.(*AppClaims)
	if !ok || !jwtToken.Valid {
		return nil, fmt.Errorf("could not parse token string: %w", err)
	}

	return claims, nil
}
