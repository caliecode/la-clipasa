package client

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/http/httputil"
	"github.com/caliecode/la-clipasa/internal/models"
)

const (
	twitchAPIBase     = "https://api.twitch.tv/helix"
	twitchValidateURL = "https://id.twitch.tv/oauth2/validate"
	twitchRefreshURL  = "https://id.twitch.tv/oauth2/token"
	maxRetries        = 2
)

type TwitchHandlers struct {
	client *generated.Client
}

func NewTwitchHandlers(client *generated.Client) *TwitchHandlers {
	return &TwitchHandlers{
		client: client,
	}
}

func (h *TwitchHandlers) getTwitchToken(c *gin.Context) (*models.TwitchTokenInfo, error) {
	tokenJSON, exists := c.Get("twitch_auth_info")
	if !exists {
		// for calls not part of oidc flow
		cookieVal, err := c.Cookie(internal.Config.Twitch.AuthInfoCookieKey)
		if err != nil {
			httputil.SignOutUser(c, *h.client) // if unset then we cannot refresh twitch tokens, etc. so must do oidc flow
			return nil, fmt.Errorf("failed to get twitch token cookie: %w", err)
		}
		tokenJSON, err = base64.URLEncoding.DecodeString(cookieVal)
		if err != nil {
			httputil.SignOutUser(c, *h.client) // migrated cookie structure, etc
			return nil, fmt.Errorf("failed to decode twitch token cookie: %w", err)
		}
	}
	var twitchTokenInfo models.TwitchTokenInfo
	if err := json.Unmarshal(tokenJSON.([]byte), &twitchTokenInfo); err != nil {
		return nil, fmt.Errorf("could not unmarshal twitch token: %w", err)
	}
	return &twitchTokenInfo, nil
}

// see https://dev.twitch.tv/docs/authentication/refresh-tokens/
func (h *TwitchHandlers) refreshTwitchToken(c *gin.Context, tokenInfo *models.TwitchTokenInfo) (*models.TwitchTokenInfo, error) {
	logger := internal.GetLoggerFromCtx(c.Request.Context())

	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("refresh_token", tokenInfo.RefreshToken)
	form.Set("client_id", internal.Config.TwitchOIDC.ClientID)
	form.Set("client_secret", internal.Config.TwitchOIDC.ClientSecret)

	req, err := http.NewRequest(http.MethodPost, twitchRefreshURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create twitch token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var newToken models.TwitchTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&newToken); err != nil {
		return nil, fmt.Errorf("failed to decode twitch token response: %w", err)
	}

	tokenJSON, err := json.Marshal(newToken)
	if err == nil {
		httputil.SetTwitchAuthCookie(c, base64.URLEncoding.EncodeToString(tokenJSON))
	} else {
		logger.Warnf("failed to marshal twitch token: %v", err)
	}
	return &newToken, nil
}

// ValidateTwitchToken validates the Twitch token without attempting refresh on failure.
func (h *TwitchHandlers) ValidateTwitchToken(c *gin.Context) (*models.TwitchTokenValidateResponse, error) {
	tokenInfo, err := h.getTwitchToken(c)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodGet, twitchValidateURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "OAuth "+tokenInfo.AccessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		httputil.SignOutUser(c, *h.client)
		return nil, errors.New("twitch token invalid; user signed out")
	}

	var result models.TwitchTokenValidateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (h *TwitchHandlers) makeUserTwitchRequest(c *gin.Context, endpoint string, queryParams map[string]string) (*http.Response, error) {
	tokenInfo, err := h.getTwitchToken(c)
	if err != nil {
		return nil, err
	}

	if time.Now().After(tokenInfo.Expiry) {
		tokenInfo, err = h.refreshTwitchToken(c, tokenInfo)
		if err != nil {
			httputil.SignOutUser(c, *h.client)
			return nil, fmt.Errorf("error refreshing expired twitch token: %w", err)
		}
	}

	reqURL := endpoint
	if len(queryParams) > 0 {
		q := url.Values{}
		for key, val := range queryParams {
			q.Set(key, val)
		}
		reqURL += "?" + q.Encode()
	}

	var resp *http.Response
	for attempt := 0; attempt <= maxRetries; attempt++ {
		req, err := http.NewRequest(http.MethodGet, reqURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+tokenInfo.AccessToken)
		req.Header.Set("Client-Id", internal.Config.TwitchOIDC.ClientID)

		resp, err = http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}

		if resp.StatusCode != http.StatusUnauthorized {
			return resp, nil
		}

		resp.Body.Close()

		if attempt < maxRetries {
			tokenInfo, err = h.refreshTwitchToken(c, tokenInfo)
			if err != nil {
				httputil.SignOutUser(c, *h.client)
				return nil, fmt.Errorf("error refreshing twitch token on retry: %w", err)
			}
		}
	}

	httputil.SignOutUser(c, *h.client)
	return nil, errors.New("twitch API unauthorized after token refresh")
}

func (h *TwitchHandlers) makeBroadcasterTwitchRequest(c *gin.Context, endpoint string, queryParams map[string]string) (*http.Response, error) {
	// TODO: broadcaster uses code flow method "get broadcaster token" before app released and we store refresh token, etc in secrets
	// and call twitch's validate every hour or on every app startup (gocron)
	return nil, fmt.Errorf("not implemented")
}

func (h *TwitchHandlers) GetUser(c *gin.Context) (models.TwitchUserResponse, error) {
	resp, err := h.makeUserTwitchRequest(c, twitchAPIBase+"/users", nil)
	if err != nil {
		return models.TwitchUserResponse{}, err
	}
	defer resp.Body.Close()

	var result models.TwitchUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return result, err
	}
	return result, nil
}

func (h *TwitchHandlers) GetUserSubscription(c *gin.Context, twitchUserID string) (models.TwitchUserSubscriptionResponse, error) {
	params := map[string]string{
		"user_id":        twitchUserID,
		"broadcaster_id": internal.Config.Twitch.BroadcasterID,
	}
	resp, err := h.makeUserTwitchRequest(c, twitchAPIBase+"/subscriptions/user", params)
	if err != nil {
		return models.TwitchUserSubscriptionResponse{}, err
	}
	defer resp.Body.Close()

	var result models.TwitchUserSubscriptionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return result, err
	}
	return result, nil
}

func (h *TwitchHandlers) GetUserFollower(c *gin.Context, twitchUserID string) (models.TwitchUserFollowResponse, error) {
	params := map[string]string{
		"broadcaster_id": internal.Config.Twitch.BroadcasterID,
		"user_id":        twitchUserID,
	}

	resp, err := h.makeUserTwitchRequest(c, twitchAPIBase+"/channels/followed", params)
	if err != nil {
		return models.TwitchUserFollowResponse{}, err
	}
	defer resp.Body.Close()

	var result models.TwitchUserFollowResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return result, err
	}

	return result, nil
}

func (h *TwitchHandlers) GetBroadcasterLive(c *gin.Context) (models.TwitchStreamResponse, error) {
	params := map[string]string{
		"user_id": internal.Config.Twitch.BroadcasterID,
	}
	resp, err := h.makeUserTwitchRequest(c, twitchAPIBase+"/streams", params)
	if err != nil {
		return models.TwitchStreamResponse{}, err
	}
	defer resp.Body.Close()

	var result models.TwitchStreamResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return result, err
	}
	return result, nil
}

// GetUserBanStatus checks if a user is banned from the broadcaster's channel
func (h *TwitchHandlers) GetUserBanStatus(c *gin.Context, userID string) (models.TwitchBanResponse, error) {
	params := map[string]string{
		"broadcaster_id": internal.Config.Twitch.BroadcasterID,
		"user_id":        userID,
	}

	resp, err := h.makeUserTwitchRequest(c, twitchAPIBase+"/moderation/banned", params)
	if err != nil {
		return models.TwitchBanResponse{}, err
	}
	defer resp.Body.Close()

	var result models.TwitchBanResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return result, fmt.Errorf("failed to decode ban status response: %w", err)
	}

	return result, nil
}
