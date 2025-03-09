package httputil

import (
	"net/http"
	"time"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/gin-gonic/gin"
)

// SignOutUser completely signs out the user from the app.
func SignOutUser(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.LoginCookieKey,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   true,
	})
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.Twitch.AuthInfoCookieKey,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   true,
	})

	RenderError(c, "Sign out", internal.NewErrorf(internal.ErrorCodeSignedOut, "sign out"), RenderWithoutPanic())

	c.Redirect(http.StatusFound, "/")
}
