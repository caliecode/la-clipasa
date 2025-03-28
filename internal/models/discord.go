package models

import "time"

type DiscordLinkRefresh struct {
	ID         string    `json:"id"`
	Expiration time.Time `json:"expiration"`
	URL        string    `json:"url"`
}

type DiscordUploadResponse struct {
	Type         int           `json:"type"`
	Content      string        `json:"content"`
	Mentions     []interface{} `json:"mentions"`
	MentionRoles []interface{} `json:"mention_roles"`
	Attachments  []struct {
		ID                 string `json:"id"`
		Filename           string `json:"filename"`
		Size               int    `json:"size"`
		URL                string `json:"url"`
		ProxyURL           string `json:"proxy_url"`
		Width              int    `json:"width"`
		Height             int    `json:"height"`
		ContentType        string `json:"content_type"`
		Placeholder        string `json:"placeholder"`
		PlaceholderVersion int    `json:"placeholder_version"`
	} `json:"attachments"`
	Embeds          []interface{} `json:"embeds"`
	Timestamp       time.Time     `json:"timestamp"`
	EditedTimestamp interface{}   `json:"edited_timestamp"`
	Flags           int           `json:"flags"`
	Components      []interface{} `json:"components"`
	ID              string        `json:"id"`
	ChannelID       string        `json:"channel_id"`
}
