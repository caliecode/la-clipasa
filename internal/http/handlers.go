package http

import (
	"bytes"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/laclipasa/la-clipasa/internal/auth"
	"github.com/zitadel/oidc/v3/pkg/client/rp"
	"go.uber.org/zap"
)

// responseBodyWriter is a wrapper for gin.ResponseWriter to buffer a response.
type responseBodyWriter struct {
	gin.ResponseWriter
	body    *bytes.Buffer
	status  int
	headers http.Header
}

func (w *responseBodyWriter) Write(b []byte) (int, error) {
	return w.body.Write(b)
}

func (w *responseBodyWriter) writeResponse() {
	w.ResponseWriter.Write(w.body.Bytes())
}

type OAuth2Provider interface {
	rp.RelyingParty
}

type OAuth2LoginMode string

const (
	OAuth2LoginModeUser        OAuth2LoginMode = "user"
	OAuth2LoginModeBroadcaster OAuth2LoginMode = "broadcaster"
)

func (l OAuth2LoginMode) Valid() bool {
	return l == OAuth2LoginModeUser || l == OAuth2LoginModeBroadcaster
}

type OAuth2Providers map[OAuth2LoginMode]OAuth2Provider

type Handlers struct {
	logger          *zap.SugaredLogger
	authmw          *authMiddleware
	oauth2Providers OAuth2Providers
	authn           *auth.Authentication
}
