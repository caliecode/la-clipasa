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

type DiscordHandlers struct {
	botToken string
	baseURL  string
}

func NewDiscordHandlers() *DiscordHandlers {
	cfg := internal.Config
	return &DiscordHandlers{
		botToken: cfg.Discord.BotToken,
		baseURL:  fmt.Sprintf("https://discord.com/api/v10/channels/%s", cfg.Discord.ChannelID),
	}
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

func (h *DiscordHandlers) makeRequest(ctx context.Context, method, endpoint string, body io.Reader, contentType string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, h.baseURL+endpoint, body)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bot "+h.botToken)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var res map[string]interface{}
		if err := json.Unmarshal(responseBody, &res); err != nil {
			return nil, fmt.Errorf("error parsing response: %w", err)
		}

		return nil, fmt.Errorf("discord API error: %v", res["message"])
	}

	return responseBody, nil
}

func (h *DiscordHandlers) UploadFile(ctx context.Context, upload graphql.Upload) (*models.DiscordUploadResponse, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", upload.Filename)
	if err != nil {
		return nil, fmt.Errorf("error creating form file: %w", err)
	}

	if _, err := io.Copy(part, upload.File); err != nil {
		return nil, fmt.Errorf("error copying file content: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("error closing multipart writer: %w", err)
	}

	responseBody, err := h.makeRequest(ctx, http.MethodPost, "/messages", body, writer.FormDataContentType())
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	var uploadResponse models.DiscordUploadResponse
	if err := json.Unmarshal(responseBody, &uploadResponse); err != nil {
		return nil, fmt.Errorf("error parsing response: %w", err)
	}

	return &uploadResponse, nil
}

func (h *DiscordHandlers) RefreshCdnLink(ctx context.Context, messageID string) (*models.DiscordLinkRefresh, error) {
	endpoint := fmt.Sprintf("/messages/%s", messageID)
	responseBody, err := h.makeRequest(ctx, http.MethodGet, endpoint, nil, "")
	if err != nil {
		return nil, fmt.Errorf("request error: %w", err)
	}

	var message models.DiscordUploadResponse
	if err := json.Unmarshal(responseBody, &message); err != nil {
		return nil, fmt.Errorf("error parsing response: %w", err)
	}

	if len(message.Attachments) == 0 {
		return nil, fmt.Errorf("no attachments found in message")
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
