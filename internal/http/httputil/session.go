package httputil

import (
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/refreshtoken"
	"github.com/gin-gonic/gin"
)

const RefreshTokenCookieName = "rt"

// SignOutUser completely signs out the user from the app.
func SignOutUser(c *gin.Context, client generated.Client) {
	ClearTwitchAuthCookie(c)
	ClearAccessTokenCookie(c)
	ClearRefreshTokenCookie(c, client)

	c.Status(http.StatusOK)
	// FIXME: works in prod but not localhost (bad domain due to port prob?)
}

func ClearTwitchAuthCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.Twitch.AuthInfoCookieKey,
		Value:    "",
		MaxAge:   0, // deletes
		Expires:  time.Now(),
		Path:     "/",
		Secure:   true,
		HttpOnly: true, // prevent js access
		Domain:   internal.Config.CookieDomain,
		SameSite: http.SameSiteLaxMode,
	})
}

func ClearRefreshTokenCookie(c *gin.Context, entClient generated.Client) {
	c.Header("X-Refresh-Token-Deleted", "true")

	rt, err := c.Cookie(RefreshTokenCookieName)
	if err == nil {
		refreshTokenHash := sha256.Sum256([]byte(rt))
		refreshTokenHashString := base64.URLEncoding.EncodeToString(refreshTokenHash[:])
		_, _ = entClient.RefreshToken.Delete().Where(refreshtoken.TokenHash(refreshTokenHashString)).Exec(c.Request.Context())
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    "",
		MaxAge:   0, // deletes
		Expires:  time.Now(),
		Path:     "/",
		Secure:   true,
		HttpOnly: true, // prevent js access
		Domain:   internal.Config.CookieDomain,
		SameSite: http.SameSiteLaxMode,
	})
}

func SetTwitchAuthCookie(c *gin.Context, b64Token string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.Twitch.AuthInfoCookieKey,
		Value:    b64Token,
		Path:     "/",
		MaxAge:   3600 * 24 * 365,
		Secure:   true,
		HttpOnly: true, // prevent js access
		Domain:   internal.Config.CookieDomain,
		SameSite: http.SameSiteLaxMode,
	})
}

func SetRefreshTokenCookie(c *gin.Context, token string, ttl time.Duration) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(ttl.Seconds()),
		Secure:   true,
		HttpOnly: true, // prevent js access
		Domain:   internal.Config.CookieDomain,
		SameSite: http.SameSiteLaxMode,
	})
}

func SetAccessTokenCookie(c *gin.Context, token string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.LoginCookieKey,
		Value:    token,
		Path:     "/",
		MaxAge:   3600 * 24 * 365,
		Domain:   internal.Config.CookieDomain,
		Secure:   true,
		HttpOnly: false, // must access via JS
		SameSite: http.SameSiteNoneMode,
	})
}

func ClearAccessTokenCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.LoginCookieKey,
		Value:    "",
		Path:     "/",
		MaxAge:   0,
		Expires:  time.Now(),
		Domain:   internal.Config.CookieDomain,
		Secure:   true,
		HttpOnly: false, // must access via JS
		SameSite: http.SameSiteNoneMode,
	})
}
