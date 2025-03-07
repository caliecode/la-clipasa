package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"runtime"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/vartanbeno/go-reddit/v2/reddit"
)

// nolint: tagliatelle
type RedditSubmission struct {
	ID string `json:"id"`
}

type RedditAPIResponse []struct {
	Data struct {
		Children []struct {
			Data struct {
				LinkFlairText string `json:"link_flair_text"`
			} `json:"data"`
		} `json:"children"`
	} `json:"data"`
}
type APIResponse struct {
	Data []RedditSubmission `json:"data"`
}

func getUpdatedFlair(client *reddit.Client, permalink string) (string, error) {
	maxRetries := 10
	baseDelay := time.Second

	apiURL := fmt.Sprintf("https://www.reddit.com%s", strings.TrimSuffix(permalink, "/")+".json")

	for attempt := 0; attempt < maxRetries; attempt++ {
		var redditResp RedditAPIResponse
		req, err := client.NewRequest(http.MethodGet, apiURL, nil)
		if err != nil {
			return "", fmt.Errorf("error creating request: %v", err)
		}

		httpclient := &http.Client{
			Timeout: 10 * time.Second,
		}
		resp, err := httpclient.Do(req)
		if err != nil {
			return "", fmt.Errorf("error making request: %v", err)
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			delay := baseDelay * time.Duration(1<<attempt) // Exponential backoff
			log.Printf("Rate limited (429). Retrying in %v...", delay)
			resp.Body.Close()
			time.Sleep(delay)
			continue
		}

		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("json API returned status %d", resp.StatusCode)
		}

		if err := json.NewDecoder(resp.Body).Decode(&redditResp); err != nil {
			return "", fmt.Errorf("error decoding response: %v", err)
		}

		if len(redditResp) > 0 && len(redditResp[0].Data.Children) > 0 {
			return redditResp[0].Data.Children[0].Data.LinkFlairText, nil
		}

		return "", fmt.Errorf("no flair found in response")
	}

	return "", fmt.Errorf("max retries exceeded while attempting to get updated flair")
}

// pullpush does not return updated flairs. must use direct call to each id to get them.
func fetchSubmissions(since, until int64) ([]RedditSubmission, error) {
	if since >= until {
		return nil, nil
	}

	url := fmt.Sprintf(
		"https://api.pullpush.io/reddit/submission/search?html_decode=True&subreddit=caliebre&since=%d&until=%d&size=100",
		since, until,
	)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d for %v", resp.StatusCode, url)
	}

	var apiResponse APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return nil, fmt.Errorf("JSON decode failed: %v", err)
	}

	submissions := apiResponse.Data

	if len(submissions) >= 100 {
		mid := (since + until) / 2
		s1, err := fetchSubmissions(since, mid)
		if err != nil {
			return nil, err
		}
		s2, err := fetchSubmissions(mid+1, until)
		if err != nil {
			return nil, err
		}
		return append(s1, s2...), nil
	}

	return submissions, nil
}

func main() {
	_, b, _, _ := runtime.Caller(0)

	err := godotenv.Load(path.Join(path.Dir(b), ".env"))
	if err != nil {
		log.Fatalf("Error loading .env file: %s", err)
	}
	// credentials := reddit.Credentials{ID: os.Getenv("CLIENT_ID"), Secret: os.Getenv("CLIENT_SECRET")}
	// client, _ := reddit.NewClient(credentials)

	file, err := os.Create("ids.txt")
	if err != nil {
		log.Fatal("Error creating output file:", err)
	}
	defer file.Close()

	// TODO: last batch
	startDate := time.Date(2025, 2, 8, 0, 0, 0, 0, time.UTC)
	endDate := time.Now()

	if startDate.After(endDate) {
		log.Fatal("Start date must be before end date")
	}

	for current := startDate; current.Before(endDate); current = current.AddDate(0, 0, 1) {
		if current.After(endDate) {
			log.Printf("Finished fetching submissions up to %s", endDate.Format("2006-01-02"))
			break
		}
		dayStart := current.Unix()
		nextDay := current.AddDate(0, 0, 1)
		dayEnd := nextDay.Unix() - 1

		// log.Printf("Fetching submissions for %s", current.Format("2006-01-02"))

		submissions, err := fetchSubmissions(dayStart, dayEnd)
		if err != nil {
			log.Printf("Error fetching submissions for %s: %v", current.Format("2006-01-02"), err)
			continue
		}

		log.Printf("Found %d submissions for %s", len(submissions), current.Format("2006-01-02"))

		// terrible ratelimit. instead, get all permalinks and run in browser where its not rate limited (json api used for old.reddit)
		// rateLimitSleep := 2050 * time.Millisecond
		// for i := range submissions {
		// 	updatedFlair, err := getUpdatedFlair(client, submissions[i].Permalink)
		// 	if err != nil {
		// 		log.Printf("Error updating flair for %s: %v", submissions[i].Permalink, err)
		// 		time.Sleep(rateLimitSleep) // rate limited 1rps
		// 		continue
		// 	}
		// 	log.Printf("flair updated")

		// 	submissions[i].LinkFlairText = updatedFlair

		// 	time.Sleep(rateLimitSleep) // rate limited 1rps
		// }

		for _, s := range submissions {
			// append id to ids.txt
			_, err := file.WriteString(s.ID + "\n")
			if err != nil {
				log.Printf("Error writing to file: %s", err)
			}
		}

		time.Sleep(200 * time.Millisecond)
	}

	log.Println("Finished fetching all submissions.")
}
