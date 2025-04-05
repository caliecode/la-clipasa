package gql

import (
	"context"
	"fmt"

	"github.com/99designs/gqlgen/graphql"
	"github.com/caliecode/la-clipasa/internal/client"
	"github.com/caliecode/la-clipasa/internal/ent/generated/postcategory"
	"github.com/caliecode/la-clipasa/internal/gql/extramodel"
)

var mutuallyExclCats = map[postcategory.Category]bool{
	postcategory.CategoryRANA:     true,
	postcategory.CategoryORO:      true,
	postcategory.CategoryDIAMANTE: true,
}

func newPostMetadata() *extramodel.PostMetadata {
	return &extramodel.PostMetadata{
		Version: 1,
		Service: extramodel.PostServiceUnknown,
	}
}

func (r *mutationResolver) DiscordUpload(ctx context.Context, videoUpload graphql.Upload) (string, *extramodel.PostMetadata, error) {
	video, err := r.discord.UploadFile(ctx, videoUpload)
	if err != nil {
		return "", nil, fmt.Errorf("failed to upload video to discord: %w", err)
	}

	link := video.Attachments[0].URL

	exp, err := client.ParseDiscordExpirationTime(link)
	if err != nil {
		return "", nil, fmt.Errorf("failed to parse discord CDN link expiration time: %w", err)
	}

	metadata := &extramodel.PostMetadata{
		Service: extramodel.PostServiceDiscord,
		DiscordVideo: &extramodel.DiscordVideoMetadata{
			ID:         video.ID,
			Expiration: *exp,
		},
	}

	return link, metadata, nil
}
