package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"runtime"
	"strings"
	"time"
)

type PostData struct {
	ID             string        `json:"id"`
	LinkFlairText  string        `json:"link_flair_text"`
	ApprovedAtUTC  interface{}   `json:"approved_at_utc"`
	Author         string        `json:"author"`
	ModNote        string        `json:"mod_note"`
	ModReports     []interface{} `json:"mod_reports"`
	ModReasonTitle string        `json:"mod_reason_title"`
	CreatedUTC     float64       `json:"created_utc"`
	Title          string        `json:"title"`
	URL            string        `json:"url"`
	IsVideo        bool          `json:"is_video"`
	Permalink      string        `json:"permalink"`
}

type RedditResponse struct {
	Kind string `json:"kind"`
	Data struct {
		Children []struct {
			Kind string   `json:"kind"`
			Data PostData `json:"data"`
		} `json:"children"`
	} `json:"data"`
}

func main() {
	ids, err := readIDs("ids.txt")
	if err != nil {
		fmt.Printf("Error reading IDs: %v\n", err)
		return
	}

	downloaded, skipped, err := loadProcessedIDs()
	if err != nil {
		fmt.Printf("Error loading processed IDs: %v\n", err)
		return
	}

	processed := make(map[string]bool)
	for id := range downloaded {
		processed[id] = true
	}
	for id := range skipped {
		processed[id] = true
	}

	client := &http.Client{}

	for _, id := range ids {
		if processed[id] {
			continue
		}

		fmt.Printf("Processing ID: %s\n", id)
		backoff := 6 * 60 * time.Second

		for {
			req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("https://www.reddit.com/r/Caliebre/comments/%s.json", id), nil)
			req.Header.Set("User-Agent", "RedditDownloader/1.0")

			resp, err := client.Do(req)
			if err != nil {
				fmt.Printf("Error fetching %s: %v. Retrying in 5s...\n", id, err)
				time.Sleep(5 * time.Second)
				continue
			}

			if resp.StatusCode == http.StatusTooManyRequests {
				fmt.Printf("Rate limited for %s, waiting %s...\n", id, backoff)
				time.Sleep(backoff)
				resp.Body.Close()
				continue
			}

			if resp.StatusCode != http.StatusOK {
				fmt.Printf("Failed to fetch %s: %d. Retrying in 5s...\n", id, resp.StatusCode)
				resp.Body.Close()
				time.Sleep(5 * time.Second)
				continue
			}

			body, err := ioutil.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				fmt.Printf("Error reading response for %s: %v. Retrying...\n", id, err)
				time.Sleep(5 * time.Second)
				continue
			}

			var responses []RedditResponse
			if err := json.Unmarshal(body, &responses); err != nil {
				fmt.Printf("Error parsing JSON for %s: %v. Retrying...\n", id, err)
				time.Sleep(5 * time.Second)
				continue
			}

			if len(responses) == 0 || len(responses[0].Data.Children) == 0 {
				fmt.Printf("No data found for %s. Skipping.\n", id)
				appendToFile("skipped_ids.txt", id)
				break
			}

			postData := responses[0].Data.Children[0].Data
			flair := strings.ToLower(postData.LinkFlairText)

			if shouldSkip(flair) {
				fmt.Printf("Skipping %s with flair: %s\n", id, postData.LinkFlairText)
				appendToFile("skipped_ids.txt", id)
				break
			}

			if err := savePost(postData, id); err != nil {
				fmt.Printf("Error saving post %s: %v. Retrying...\n", id, err)
				time.Sleep(5 * time.Second)
				continue
			}

			appendToFile("downloaded_ids.txt", id)
			fmt.Printf("Successfully saved %s\n", id)
			break
		}

		time.Sleep(2 * time.Second)
	}
}

func shouldSkip(flair string) bool {
	return flair == "" ||
		flair == "clip" ||
		flair == "arte" ||
		strings.Contains(flair, ":woki:") ||
		strings.Contains(flair, ":perroverde:") ||
		strings.Contains(flair, ":iconojo:") ||
		strings.Contains(flair, ":copy:") ||
		strings.Contains(flair, ":sad:") ||
		strings.Contains(flair, ":mute:") ||
		strings.Contains(flair, "caliemeh") ||
		strings.Contains(flair, "video") ||
		strings.Contains(flair, "imagen") ||
		strings.Contains(flair, "no se yo")
}

func savePost(post PostData, id string) error {
	jsonData, err := json.MarshalIndent(post, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(fmt.Sprintf("flair-posts/%s.json", id), jsonData, 0o644)
}

func readIDs(filename string) ([]string, error) {
	_, b, _, _ := runtime.Caller(0)

	file, err := os.Open(path.Join(path.Dir(b), filename))
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var ids []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if id := strings.TrimSpace(scanner.Text()); id != "" {
			ids = append(ids, id)
		}
	}
	return ids, scanner.Err()
}

func loadProcessedIDs() (map[string]bool, map[string]bool, error) {
	downloaded := make(map[string]bool)
	skipped := make(map[string]bool)

	if d, err := readLines("downloaded_ids.txt"); err == nil {
		for _, id := range d {
			downloaded[id] = true
		}
	}

	if s, err := readLines("skipped_ids.txt"); err == nil {
		for _, id := range s {
			skipped[id] = true
		}
	}

	return downloaded, skipped, nil
}

func readLines(filename string) ([]string, error) {
	file, err := os.Open(filename)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, strings.TrimSpace(scanner.Text()))
	}
	return lines, scanner.Err()
}

func appendToFile(filename, id string) error {
	file, err := os.OpenFile(filename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(id + "\n")
	return err
}
