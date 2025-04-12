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
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.Twitch.AuthInfoCookieKey,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   true,
	})
	ClearAccessTokenCookie(c)
	ClearRefreshTokenCookie(c, client)

	RenderError(c, "Sign out", internal.NewErrorf(internal.ErrorCodeSignedOut, "sign out"), RenderWithoutPanic())

	c.Redirect(http.StatusFound, "/")
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
		MaxAge:   -1, // deletes
		Path:     "/",
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
		Expires:  time.Unix(0, 0),
		Domain:   internal.Config.CookieDomain,
		Secure:   true,
		HttpOnly: false, // must access via JS
		SameSite: http.SameSiteNoneMode,
	})
}
