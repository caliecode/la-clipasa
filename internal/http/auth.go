package http

import (
	"github.com/caliecode/la-clipasa/internal/http/httputil"
	"github.com/gin-gonic/gin"
)

func (h *Handlers) SignOut(c *gin.Context) {
	httputil.SignOutUser(c, *h.client)
}
