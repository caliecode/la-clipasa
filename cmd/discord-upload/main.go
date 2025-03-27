package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strings"

	"github.com/caliecode/la-clipasa/internal/envvar"
)

func uploadVideo(filePath, channelID, botToken string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	payload := `{"content": "Uploading video!"}`
	if err := writer.WriteField("payload_json", payload); err != nil {
		return fmt.Errorf("failed to write payload_json: %w", err)
	}

	part, err := writer.CreateFormFile("file", "video.mp4")
	if err != nil {
		return fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err = io.Copy(part, file); err != nil {
		return fmt.Errorf("failed to copy file content: %w", err)
	}

	writer.Close()

	url := fmt.Sprintf("https://discord.com/api/v10/channels/%s/messages", channelID)

	req, err := http.NewRequest("POST", url, &requestBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bot "+botToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		var jsonBody map[string]interface{}
		json.Unmarshal(body, &jsonBody)

		return fmt.Errorf("upload failed (%s): %v", resp.Status, jsonBody["message"])
	}

	body, _ := io.ReadAll(resp.Body)
	fmt.Println("Response Body:", string(body))

	return nil
}

func main() {
	var env string

	flag.StringVar(&env, "env", "", "Environment Variables filename")
	flag.Parse()

	var errs []string
	if env == "" {
		errs = append(errs, "    - env is required but unset")
	}

	if len(errs) > 0 {
		log.Fatal("error: \n" + strings.Join(errs, "\n"))
	}

	if err := envvar.Load(env); err != nil {
		log.Fatalf("Couldn't load env: %s", err)
	}

	filePath := "./cmd/discord-upload/file_example_MP4_1280_10MG.mp4"
	// filePath := "./cmd/discord-upload/file_example_MP4_1920_18MG.mp4" // entity too large

	channelID := os.Getenv("DISCORD_CHANNEL_ID")
	botToken := os.Getenv("DISCORD_BOT_TOKEN")

	if err := uploadVideo(filePath, channelID, botToken); err != nil {
		fmt.Println("discord upload error:", err)
	}
}
