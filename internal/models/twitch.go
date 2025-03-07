// nolint: tagliatelle
package models

import "time"

// TwitchTokenInfo represents the minimal token information stored in a cookie.
// nolint: tagliatelle
type TwitchTokenInfo struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	Expiry       time.Time `json:"expiry"`
	TokenType    string    `json:"token_type,omitempty"`
}

// TwitchTokenValidateResponse represents the response from Twitch’s token validation endpoint.
type TwitchTokenValidateResponse struct {
	ClientID  string   `json:"client_id"`
	Login     string   `json:"login"`
	Scopes    []string `json:"scopes"`
	UserID    string   `json:"user_id"`
	ExpiresIn int      `json:"expires_in"`
}

// TwitchStream represents a single Twitch stream.
type TwitchStream struct {
	ID           string   `json:"id"`
	UserID       string   `json:"user_id"`
	UserLogin    string   `json:"user_login"`
	UserName     string   `json:"user_name"`
	GameID       string   `json:"game_id"`
	GameName     string   `json:"game_name"`
	Type         string   `json:"type"`
	Title        string   `json:"title"`
	ViewerCount  int      `json:"viewer_count"`
	StartedAt    string   `json:"started_at"`
	Language     string   `json:"language"`
	ThumbnailURL string   `json:"thumbnail_url"`
	TagIDs       []string `json:"tag_ids"`
	Tags         []string `json:"tags"`
	IsMature     bool     `json:"is_mature"`
}

// TwitchStreamResponse wraps a list of streams.
type TwitchStreamResponse struct {
	Data []TwitchStream `json:"data"`
}

// TwitchUserFollow represents a follow relationship.
type TwitchUserFollow struct {
	FromID     string `json:"from_id"`
	FromLogin  string `json:"from_login"`
	FromName   string `json:"from_name"`
	ToID       string `json:"to_id"`
	ToLogin    string `json:"to_login"`
	ToName     string `json:"to_name"`
	FollowedAt string `json:"followed_at"`
}

// TwitchUserFollowResponse wraps a list of follows.
type TwitchUserFollowResponse struct {
	Data []TwitchUserFollow `json:"data"`
}

// TwitchUserSubscription represents a subscription.
type TwitchUserSubscription struct {
	BroadcasterID    string `json:"broadcaster_id"`
	BroadcasterName  string `json:"broadcaster_name"`
	BroadcasterLogin string `json:"broadcaster_login"`
	IsGift           bool   `json:"is_gift"`
	Tier             string `json:"tier"`
}

// TwitchUserSubscriptionResponse wraps a list of subscriptions.
type TwitchUserSubscriptionResponse struct {
	Data []TwitchUserSubscription `json:"data"`
}

// TwitchUser represents a Twitch user.
type TwitchUser struct {
	BroadcasterType string `json:"broadcaster_type"`
	Description     string `json:"description"`
	DisplayName     string `json:"display_name"`
	Email           string `json:"email,omitempty"`
	ID              string `json:"id"`
	Login           string `json:"login"`
	OfflineImageURL string `json:"offline_image_url"`
	ProfileImageURL string `json:"profile_image_url"`
	Type            string `json:"type"`
	ViewCount       int    `json:"view_count"`
}

// TwitchUserResponse wraps a list of users.
type TwitchUserResponse struct {
	Data []TwitchUser `json:"data"`
}

type TwitchBanResponse struct {
	Data []BanData `json:"data"`
}

type BanData struct {
	UserID         string `json:"user_id"`
	UserLogin      string `json:"user_login"`
	UserName       string `json:"user_name"`
	ExpiresAt      string `json:"expires_at"`
	CreatedAt      string `json:"created_at"`
	Reason         string `json:"reason"`
	ModeratorID    string `json:"moderator_id"`
	ModeratorLogin string `json:"moderator_login"`
	ModeratorName  string `json:"moderator_name"`
}
