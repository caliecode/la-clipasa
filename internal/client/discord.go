package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/models"
)

/**
 *
 * TODO:
 *
 * curl -H 'Authorization: Bot <...>' https://discord.com/api/channels/1058424616726565007/messages
 *
 * returns cdn links with expire headers (hex to dec) -> 24hs expiration
 *
 * bot api 50rps
 *
 * we could let users upload file via frontend to our dedicated discord channel
 * and regenerate links when they expire. then the post table is updated with the new links when a user visits it
 *
 * in the future we can have a small cache layer too. as a poor man's queue maybe write locking each cache entry prevents spamming discord calls if +50 people visit the same expired discord post,
 * while others work as usual.
 *
 */

type DiscordHandlers struct {
	botToken  string
	channelID string
}

func ParseDiscordExpirationTime(videoURL string) (*time.Time, error) {
	parsedURL, err := url.Parse(videoURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse video URL: %w", err)
	}

	exParam := parsedURL.Query().Get("ex")
	if exParam == "" {
		return nil, fmt.Errorf("no expiration parameter found in URL")
	}

	expirationTimestamp, err := strconv.ParseInt(exParam, 16, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode expiration timestamp: %w", err)
	}

	expirationTime := time.Unix(expirationTimestamp, 0)

	return &expirationTime, nil
}

func NewDiscordHandlers() *DiscordHandlers {
	cfg := internal.Config

	return &DiscordHandlers{
		botToken:  cfg.Discord.BotToken,
		channelID: cfg.Discord.ChannelID,
	}
}

func (h *DiscordHandlers) UploadFile(ctx context.Context, upload graphql.Upload) (*models.DiscordUploadResponse, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", upload.Filename)
	if err != nil {
		return &models.DiscordUploadResponse{}, fmt.Errorf("error creating form file: %w", err)
	}

	if _, err := io.Copy(part, upload.File); err != nil {
		return &models.DiscordUploadResponse{}, fmt.Errorf("error copying file content: %w", err)
	}

	if err := writer.Close(); err != nil {
		return &models.DiscordUploadResponse{}, fmt.Errorf("error closing multipart writer: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("https://discord.com/api/v10/channels/%s/messages", h.channelID), body)
	if err != nil {
		return &models.DiscordUploadResponse{}, fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bot "+h.botToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return &models.DiscordUploadResponse{}, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return &models.DiscordUploadResponse{}, fmt.Errorf("error reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return &models.DiscordUploadResponse{}, fmt.Errorf("upload failed with status %d: %s", resp.StatusCode, string(responseBody))
	}

	var uploadResponse models.DiscordUploadResponse
	if err := json.Unmarshal(responseBody, &uploadResponse); err != nil {
		return &models.DiscordUploadResponse{}, fmt.Errorf("error parsing response: %w", err)
	}

	return &uploadResponse, nil
}

func (h *DiscordHandlers) RefreshCdnLink(messageId string) (*models.DiscordLinkRefresh, error) {
	url := fmt.Sprintf("https://discord.com/api/v10/channels/%s/messages/%s", h.channelID, messageId)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bot "+h.botToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch message, status code: %d", resp.StatusCode)
	}

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %w", err)
	}
	var message models.DiscordUploadResponse
	if err := json.Unmarshal(responseBody, &message); err != nil {
		return nil, fmt.Errorf("error parsing response: %w", err)
	}

	att := message.Attachments[0]
	exp, err := ParseDiscordExpirationTime(att.URL)
	if err != nil {
		return nil, fmt.Errorf("error parsing expiration time: %w", err)
	}

	return &models.DiscordLinkRefresh{
		ID:         att.ID,
		Expiration: *exp,
		URL:        att.URL,
	}, nil
}
