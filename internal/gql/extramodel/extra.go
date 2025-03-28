package extramodel

import (
	"fmt"
	"io"
	"strconv"
	"time"
)

type DiscordVideoMetadata struct {
	ID         string    `json:"id"` // for cdn refreshing
	Expiration time.Time `json:"expiration"`
}

type PostMetadata struct {
	// Version is the version of the Post metadata.
	Version int `json:"version"`
	// Service represents the provider of the Post link.
	Service      PostService           `json:"service,omitempty"`
	DiscordVideo *DiscordVideoMetadata `json:"discord,omitempty"`
}

type PostService string

const (
	PostServiceDiscord PostService = "DISCORD"
	PostServiceUnknown PostService = "UNKNOWN"
)

var AllPostService = []PostService{
	PostServiceDiscord,
	PostServiceUnknown,
}

func (e PostService) IsValid() bool {
	switch e {
	case PostServiceDiscord, PostServiceUnknown:
		return true
	}
	return false
}

func (e PostService) String() string {
	return string(e)
}

func (e *PostService) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = PostService(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid PostService", str)
	}
	return nil
}

func (e PostService) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
