package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/client"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/apikey"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/ent/generated/refreshtoken"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/zitadel/oidc/v3/pkg/oidc"
)

const (
	AccessTokenLifeTime     = 1 * time.Hour
	RefreshTokenLifeTime    = 1 * 365 * 24 * time.Hour // 1 year for db and cookie, so db is cleaned up if unused
	RefreshTokenBytes       = 32
	AccessTokenHeaderName   = "Authorization"
	AccessTokenBearerPrefix = "Bearer "
)

var (
	ErrExpiredToken         = jwt.ErrTokenExpired
	ErrRefreshTokenNotFound = errors.New("refresh token not found")
	ErrRefreshTokenExpired  = errors.New("refresh token expired")
	ErrRefreshTokenRevoked  = errors.New("refresh token revoked")
	ErrInvalidSigningMethod = errors.New("invalid signing method")
	ErrInvalidTokenClaims   = errors.New("invalid token claims")
	ErrParseToken           = errors.New("could not parse token")
)

type AppClaims struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// TokenPair holds both access and refresh tokens
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

type Authentication struct {
	twitch *client.TwitchHandlers
	entc   *generated.Client

	signingKey []byte
	issuer     string
}

// NewAuthentication returns a new authentication service.
func NewAuthentication(entc *generated.Client) *Authentication {
	twitch := client.NewTwitchHandlers()
	cfg := internal.Config

	return &Authentication{
		twitch:     twitch,
		entc:       entc,
		signingKey: []byte(cfg.SigningKey),
		issuer:     cfg.TwitchOIDC.Issuer,
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
	u, err := entclt.User.Query().Where(user.HasAPIKeysWith(apikey.APIKey(key))).WithAPIKeys().Only(ctx)
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeNotFound, "user from api key not found")
	}
	ak, err := u.Edges.APIKeysOrErr()
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeNotFound, "api key edge")
	}
	if ak[0].ExpiresOn.Before(time.Now()) {
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

	twitchUser, err := a.twitch.GetUser(c)
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

// CreateAccessTokenForUser creates just the JWT access token.
func (a *Authentication) CreateAccessTokenForUser(ctx context.Context, user *generated.User) (string, error) {
	claims := AppClaims{
		Username: user.DisplayName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenLifeTime)),
			Issuer:    a.issuer,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   user.ExternalID,
			Audience:  []string{"la-clipasa"},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// see https://github.com/dgrijalva/jwt-go/issues/65
	ss, err := token.SignedString(a.signingKey)
	if err != nil {
		return "", fmt.Errorf("could not sign access token: %w", err)
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

// ParseToken parses and validates the JWT access token.
func (a *Authentication) ParseToken(ctx context.Context, token string) (*AppClaims, error) {
	jwtToken, err := jwt.ParseWithClaims(token, &AppClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("%w: unexpected signing method: %v", ErrInvalidSigningMethod, token.Header["alg"])
		}
		return a.signingKey, nil
	})
	// check specific JWT errors before claims or validity
	if err != nil {
		// return the original error so downstream can check it
		return nil, fmt.Errorf("%w: %w", ErrParseToken, err)
	}

	claims, ok := jwtToken.Claims.(*AppClaims)
	if !ok || !jwtToken.Valid {
		return nil, fmt.Errorf("%w: token claims invalid or token is not valid", ErrInvalidTokenClaims)
	}

	return claims, nil
}

// ValidateAndRotateRefreshToken validates an old refresh token, revokes it,
// issues a new pair, and returns the associated user and the new token pair.
func (a *Authentication) ValidateAndRotateRefreshToken(ctx context.Context, oldRefreshTokenString string) (*generated.User, *TokenPair, error) {
	refreshTokenHash := sha256.Sum256([]byte(oldRefreshTokenString))
	refreshTokenHashString := base64.URLEncoding.EncodeToString(refreshTokenHash[:])

	// we use entgql.Transactioner in all gql api ops.
	rt, err := a.entc.RefreshToken.Query().
		Where(
			refreshtoken.TokenHashEQ(refreshTokenHashString),
			refreshtoken.RevokedEQ(false),
			refreshtoken.ExpiresAtGT(time.Now()),
		).
		WithOwner().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			exists, _ := a.entc.RefreshToken.Query().
				Where(refreshtoken.TokenHashEQ(refreshTokenHashString)).
				Exist(ctx)
			if exists {
				// could be either revoked or expired, just assume revoked
				return nil, nil, ErrRefreshTokenRevoked
			}
			return nil, nil, ErrRefreshTokenNotFound
		}
		return nil, nil, fmt.Errorf("failed to query refresh token: %w", err)
	}

	// explicitly check expiry and revoked status again
	if rt.Revoked {
		return nil, nil, ErrRefreshTokenRevoked
	}
	if rt.ExpiresAt.Before(time.Now()) {
		return nil, nil, ErrRefreshTokenExpired
	}

	user := rt.Edges.Owner
	sysCtx := internal.SetUserCtx(token.NewContextWithSystemCallToken(ctx), user)
	// only revoke the current session before reissuing, not all
	// instead of revoking instantly, set exp to 1min ahead to allow for concurrent queries
	// to also rotate the rt and prevent 401s and sign outs
	_, err = a.entc.RefreshToken.UpdateOne(rt).SetExpiresAt(time.Now().Add(time.Minute)).Save(sysCtx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to revoke old refresh token: %w", err)
	}

	ginCtx, ok := ctx.Value("GinContextKey").(*gin.Context)
	if !ok {
		return nil, nil, fmt.Errorf("failed to get gin context: %w", err)
	}
	// always creating prevents race conditions with refresh token rotation
	tp, err := a.IssueNewTokenPair(sysCtx, user, ginCtx.ClientIP(), ginCtx.Request.UserAgent())
	if err != nil {
		return nil, nil, fmt.Errorf("failed to issue new token pair: %w", err)
	}

	return user, tp, nil
}

// CleanupExpiredAndRevokedTokens removes old tokens to prevent database bloat
func (a *Authentication) CleanupExpiredAndRevokedTokens(ctx context.Context) {
	a.entc.Logger.Info("Cleaning up expired and revoked tokens")
	ctx = token.NewContextWithSystemCallToken(ctx)
	ctx = privacy.DecisionContext(ctx, privacy.Allow)

	_, err := a.entc.RefreshToken.Delete().
		Where(
			refreshtoken.Or(
				refreshtoken.RevokedEQ(true),
				refreshtoken.ExpiresAtLT(time.Now()),
			),
		).
		Exec(ctx)
	if err != nil {
		fmt.Printf("Error cleaning up tokens: %v\n", err)
	}
}

func (a *Authentication) IssueNewTokenPair(ctx context.Context, user *generated.User, ipAddress, userAgent string) (*TokenPair, error) {
	accessToken, err := a.CreateAccessTokenForUser(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to create access token: %w", err)
	}

	rb := make([]byte, RefreshTokenBytes)
	if _, err := rand.Read(rb); err != nil {
		return nil, fmt.Errorf("failed to generate refresh token bytes: %w", err)
	}
	refreshTokenString := base64.URLEncoding.EncodeToString(rb)

	refreshTokenHash := sha256.Sum256([]byte(refreshTokenString))
	refreshTokenHashString := base64.URLEncoding.EncodeToString(refreshTokenHash[:])

	refreshExpiresAt := time.Now().Add(RefreshTokenLifeTime)

	_, err = a.entc.RefreshToken.Create().
		SetOwner(user).
		SetTokenHash(refreshTokenHashString).
		SetExpiresAt(refreshExpiresAt).
		SetIPAddress(ipAddress).
		SetUserAgent(userAgent).
		Save(internal.SetUserCtx(ctx, user))
	if err != nil {
		return nil, fmt.Errorf("failed to save refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString,
	}, nil
}
