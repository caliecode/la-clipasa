package http

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/zitadel/oidc/v3/pkg/client/rp"
	"github.com/zitadel/oidc/v3/pkg/oidc"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/caliecode/la-clipasa/internal/http/httputil"
	"github.com/caliecode/la-clipasa/internal/models"
)

const (
	authRedirectCookieKey    = "auth_redirect_uri"
	loginModeCookieKey       = "auth_login_mode"
	broadcastTokensCookieKey = "auth_broadcast_tokens"
)

const (
	broadCasterTokenCtxKey = "broadcast_tokens"
	twitchAuthInfoCtxKey   = "twitch_auth_info"
)

type AuthState struct {
	Nonce       string          `json:"nonce"`
	LoginMode   OAuth2LoginMode `json:"login_mode"`
	RedirectURI string          `json:"redirect_uri"`
	Signature   string          `json:"signature"`
}

func generateState(loginMode OAuth2LoginMode, redirectURI string) (string, error) {
	state := AuthState{
		Nonce:       uuid.New().String(),
		LoginMode:   loginMode,
		RedirectURI: redirectURI,
	}

	mac := hmac.New(sha256.New, []byte(internal.Config.TwitchOIDC.ClientSecret))
	_, err := mac.Write([]byte(fmt.Sprintf("%s|%s|%s", state.Nonce, state.LoginMode, state.RedirectURI)))
	if err != nil {
		return "", err
	}
	state.Signature = hex.EncodeToString(mac.Sum(nil))

	jsonState, err := json.Marshal(state)
	if err != nil {
		return "", err
	}

	return base64.URLEncoding.EncodeToString(jsonState), nil
}

func parseState(encodedState string) (*AuthState, error) {
	jsonState, err := base64.URLEncoding.DecodeString(encodedState)
	if err != nil {
		return nil, err
	}

	var state AuthState
	if err := json.Unmarshal(jsonState, &state); err != nil {
		return nil, err
	}

	mac := hmac.New(sha256.New, []byte(internal.Config.TwitchOIDC.ClientSecret))
	_, err = mac.Write([]byte(fmt.Sprintf("%s|%s|%s", state.Nonce, state.LoginMode, state.RedirectURI)))
	if err != nil {
		return nil, err
	}
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(state.Signature), []byte(expectedSignature)) {
		return nil, errors.New("invalid state signature")
	}

	return &state, nil
}

func marshalToken(w http.ResponseWriter, r *http.Request, tokens *oidc.Tokens[*oidc.IDTokenClaims], state string, rp rp.RelyingParty) {
	data, err := json.Marshal(tokens)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

func (h *Handlers) codeExchange(c *gin.Context) {
	var err error

	rbw := &responseBodyWriter{
		body:           &bytes.Buffer{},
		ResponseWriter: c.Writer,
		headers:        make(http.Header),
	}

	c.Writer = rbw
	defer rbw.writeResponse()

	stateParam := c.Query("state")
	state, err := parseState(stateParam)
	if err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "invalid state"))
		return
	}

	// Store state in context for later use
	c.Set("auth_state", state)

	rp.CodeExchangeHandler(marshalToken, h.oauth2Providers[state.LoginMode]).ServeHTTP(rbw, c.Request)

	oauth2TokenRes := rbw.body.Bytes()

	var tr *oidc.Tokens[*oidc.IDTokenClaims]
	if err = json.Unmarshal(oauth2TokenRes, &tr); err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "could not parse token response"))
		return
	}

	if state.LoginMode == OAuth2LoginModeBroadcaster {
		c.Set(broadCasterTokenCtxKey, oauth2TokenRes)

		return
	}

	req, _ := http.NewRequest(http.MethodGet, "https://id.twitch.tv/oauth2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "could not get userinfo"))
		return
	}
	defer resp.Body.Close()

	var userInfo []byte
	if userInfo, err = io.ReadAll(resp.Body); err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "could not read userinfo"))
		return
	}

	internal.CtxWithUserInfo(c, userInfo)

	// tr.ExpiresIn is empty
	twitchTokenInfo := models.TwitchTokenInfo{
		AccessToken:  tr.AccessToken,
		RefreshToken: tr.RefreshToken,
		Expiry:       tr.Expiry,
		TokenType:    tr.TokenType,
	}
	tokenJSON, err := json.Marshal(twitchTokenInfo)
	if err == nil {
		fmt.Printf("string(tokenJSON): %v\n", string(tokenJSON))
		c.Set(twitchAuthInfoCtxKey, tokenJSON) // will set cookie in callback so that response set-cookie works as expected
	} else {
		h.logger.Errorf("failed to marshal twitch token: %w", err)
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "code exchange: could not marshal twitch token"))
		return
	}

	rbw.body = &bytes.Buffer{}
	c.Next()
}

func (h *Handlers) twitchCallback(c *gin.Context) {
	stateVal, exists := c.Get("auth_state")
	if !exists {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(nil, internal.ErrorCodeOIDC, "missing auth state"))
		return
	}
	state, _ := stateVal.(*AuthState)

	// TODO: for refresh token setup for streamer, the login request will return tokens as string from where we can hardcode the refresh token which shouldnt expire,
	// why we may need twitch tokens on the backend -> we cannot use a normal user twitch token to check some info from streamer channel, for example, or read the chat.
	// otherwise, we can use client_credentials flow to get server-server tokens if we just need generic twitch information
	if state.LoginMode == OAuth2LoginModeBroadcaster {
		tokenBytes, exists := c.Get(broadCasterTokenCtxKey)
		if !exists {
			c.AbortWithError(500, fmt.Errorf("broadcast tokens not found in context"))
			return
		}
		c.String(200, string(tokenBytes.([]byte)))
		return
	}

	tokenJSON, exists := c.Get(twitchAuthInfoCtxKey)
	if !exists {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(nil, internal.ErrorCodeOIDC, "twitch token not found in context"))
		return
	}
	var twitchTokenInfo models.TwitchTokenInfo
	if err := json.Unmarshal(tokenJSON.([]byte), &twitchTokenInfo); err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "could not unmarshal twitch token"))
		return
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.Twitch.AuthInfoCookieKey,
		Value:    base64.URLEncoding.EncodeToString(tokenJSON.([]byte)),
		Path:     "/",
		Expires:  twitchTokenInfo.Expiry.Add(7 * 24 * time.Hour), // we will verify manually token expiration manually and use refresh token
		Secure:   true,
		HttpOnly: false, // must access via JS
		Domain:   internal.Config.CookieDomain,
		SameSite: http.SameSiteNoneMode,
	})

	userinfo, err := internal.GetUserInfoFromCtx(c)
	if err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "user info not found"))
	}

	ctxWithPrivacyToken := token.NewContextWithOauth2Token(c.Request.Context(), userinfo.Subject)
	c.Request = c.Request.WithContext(ctxWithPrivacyToken)

	u, err := h.authn.GetOrRegisterUserFromUserInfo(c, userinfo)
	if err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "could not get or register user"))
	}

	accessToken, err := h.authn.CreateAccessTokenForUser(ctxWithPrivacyToken, u)
	if err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "could not create access token"))
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     internal.Config.LoginCookieKey,
		Value:    accessToken,
		Path:     "/",
		MaxAge:   3600 * 24 * 7,
		Domain:   internal.Config.CookieDomain,
		Secure:   true,
		HttpOnly: false, // must access via JS
		SameSite: http.SameSiteNoneMode,
	})

	c.String(200, "Successfully logged in")

	redirectURI := state.RedirectURI
	if redirectURI == "" {
		redirectURI = internal.BuildAPIURL("docs")
	}

	c.Redirect(http.StatusMovedPermanently, redirectURI)
}

func (h *Handlers) twitchLogin(c *gin.Context) {
	authRedirectUri := c.Query("auth:redirect-uri")
	loginMode := OAuth2LoginMode(c.Query("auth:login-mode"))
	if !loginMode.Valid() {
		h.logger.Errorf("invalid login mode: %v", loginMode)
		loginMode = OAuth2LoginModeUser
	}

	state, err := generateState(loginMode, authRedirectUri)
	if err != nil {
		httputil.RenderError(c, "OIDC", internal.WrapErrorf(err, internal.ErrorCodeOIDC, "failed to generate state"))
		return
	}

	gin.WrapH(rp.AuthURLHandler(func() string { return state }, h.oauth2Providers[loginMode]))(c)
}
