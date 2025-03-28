package gql

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/caliecode/la-clipasa/internal/client"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/post"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/gql/extramodel"
	"github.com/caliecode/la-clipasa/internal/gql/model"
	"github.com/caliecode/la-clipasa/internal/utils/pointers"
	"github.com/google/uuid"
	"github.com/theopenlane/entx"
)

// CreatePostWithCategories is the resolver for the createPostWithCategories field.
func (r *mutationResolver) CreatePostWithCategories(ctx context.Context, input model.CreatePostWithCategoriesInput) (*model.PostCreatePayload, error) {
	metadata := newPostMetadata()
	if input.Video != nil {
		video, err := r.discord.UploadFile(ctx, *input.Video)
		if err != nil {
			return nil, fmt.Errorf("failed to upload video to discord: %w", err)
		}

		input.Base.Link = video.Attachments[0].URL

		exp, err := client.ParseDiscordExpirationTime(video.Attachments[0].URL)
		if err != nil {
			return nil, fmt.Errorf("failed to parse discord CDN link expiration time: %w", err)
		}
		metadata.Service = extramodel.PostServiceDiscord
		metadata.DiscordVideo = &extramodel.DiscordVideoMetadata{
			ID:         video.ID,
			Expiration: *exp,
		}
	}

	postPayload, err := r.CreatePost(ctx, *input.Base)
	if err != nil {
		return nil, parseRequestError(err, action{action: ActionCreate, object: "post"})
	}

	if metadata.Service != "" {
		r.ent.Post.UpdateOneID(postPayload.Post.ID).SetMetadata(*metadata).Exec(ctx)
	}

	if len(input.Categories) > 0 {
		builders := make([]*generated.PostCategoryCreate, len(input.Categories))
		for i := range input.Categories {
			builders[i] = r.ent.PostCategory.Create().SetInput(generated.CreatePostCategoryInput{
				Category: input.Categories[i],
				PostID:   &postPayload.Post.ID,
			})
		}

		b, err := r.ent.PostCategory.CreateBulk(builders...).Save(ctx)
		if err != nil {
			return nil, parseRequestError(err, action{action: ActionCreate, object: "post category"})
		}
		postPayload.Post.Edges.Categories = b
	}

	return &model.PostCreatePayload{
		Post: postPayload.Post,
	}, nil
}

// RestorePost is the resolver for the restorePost field.
func (r *mutationResolver) RestorePost(ctx context.Context, id uuid.UUID) (*bool, error) {
	// already has role privacy, and else we can't query the post
	ctx = privacy.DecisionContext(ctx, privacy.Allow)
	_, err := r.ent.Post.UpdateOneID(id).ClearDeletedAt().ClearDeletedBy().Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("could not restore post: %w", err)
	}

	return pointers.New(true), nil
}

// RefreshDiscordLink is the resolver for the refreshDiscordLink field.
func (r *mutationResolver) RefreshDiscordLink(ctx context.Context, id uuid.UUID) (*string, error) {
	ctx = entx.SkipSoftDelete(ctx) // maybe a mod wants to see a deleted post
	p, err := r.ent.Post.Get(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get post: %w", err)
	}
	if p.Metadata.Service != extramodel.PostServiceDiscord {
		return nil, fmt.Errorf("post is not from discord")
	}
	if p.Metadata.DiscordVideo.Expiration.After(time.Now().Add(time.Minute)) {
		return pointers.New(p.Link), nil
	}
	res, err := r.discord.RefreshCdnLink(ctx, p.Metadata.DiscordVideo.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh discord link: %w", err)
	}
	m := p.Metadata
	m.DiscordVideo.Expiration = res.Expiration
	_, err = r.ent.Post.UpdateOneID(id).SetLink(res.URL).SetMetadata(m).Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to update post: %w", err)
	}
	return pointers.New(res.URL), nil
}

// ToHTML is the resolver for the toHTML field.
func (r *postResolver) ToHTML(ctx context.Context, obj *generated.Post) (string, error) {
	panic(fmt.Errorf("not implemented: ToHTML - toHTML"))
}

// NodeID is the resolver for the nodeId field.
func (r *postResolver) NodeID(ctx context.Context, obj *generated.Post) (string, error) {
	// this is not a pagination cursor which is an encoded Cursor
	return base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%d", post.Table, obj.ID))), nil
}
