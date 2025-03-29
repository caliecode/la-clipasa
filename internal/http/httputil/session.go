package httputil

import (
	"net/http"
	"time"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/gin-gonic/gin"
)

const RefreshTokenCookieName = "rt"

// SignOutUser completely signs out the user from the app.
func SignOutUser(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.Twitch.AuthInfoCookieKey,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   true,
	})
	ClearAccessTokenCookie(c)
	ClearRefreshTokenCookie(c)

	RenderError(c, "Sign out", internal.NewErrorf(internal.ErrorCodeSignedOut, "sign out"), RenderWithoutPanic())

	c.Redirect(http.StatusFound, "/")
}

func ClearRefreshTokenCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    "",
		MaxAge:   -1, // deletes
		Path:     "/",
		Secure:   true,
		HttpOnly: true, // prevent js access
		Domain:   internal.Config.CookieDomain,
	})
}

func SetRefreshTokenCookie(c *gin.Context, token string, ttl time.Duration) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    token,
		Path:     "/",
		Expires:  time.Unix(time.Now().Add(ttl).Unix(), 0),
		Secure:   true,
		HttpOnly: true, // prevent js access
		Domain:   internal.Config.CookieDomain,
	})
}

func SetAccessTokenCookie(c *gin.Context, token string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.LoginCookieKey,
		Value:    token,
		Path:     "/",
		MaxAge:   3600 * 24 * 7,
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
