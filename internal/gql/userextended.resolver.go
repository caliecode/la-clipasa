package gql

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/laclipasa/la-clipasa/internal"
	"github.com/laclipasa/la-clipasa/internal/client"
	"github.com/laclipasa/la-clipasa/internal/ent/generated"
	"github.com/laclipasa/la-clipasa/internal/gql/model"
)

// Me is the resolver for the me field.
func (r *queryResolver) Me(ctx context.Context) (*generated.User, error) {
	u := internal.GetUserFromCtx(ctx)
	if u == nil {
		ginCtx, _ := GinContextFromCtx(ctx)
		ginCtx.AbortWithStatus(http.StatusUnauthorized)

		return nil, internal.NewErrorf(internal.ErrorCodeUnauthorized, "unauthenticated")
	}
	return u, nil
}

// TwitchInfo is the resolver for the twitchInfo field.
func (r *userResolver) TwitchInfo(ctx context.Context, obj *generated.User) (*model.UserTwitchInfo, error) {
	initTwitchCache()
	l := internal.GetLoggerFromCtx(ctx)
	twitch := client.NewTwitchHandlers()

	ginCtx, err := GinContextFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	u, err := twitch.GetUser(ginCtx)
	if err != nil {
		return nil, err
	}
	if len(u.Data) == 0 {
		return nil, errors.New("no Twitch user data found")
	}
	twitchUserID := u.Data[0].ID

	if entry, found := twitchInfoCache.Get(twitchUserID); found {
		if time.Since(entry.Timestamp) < twitchCacheTTL {
			l.Debugf("Twitch info found in cache for user %s", twitchUserID)
			return entry.Info, nil
		}
		twitchInfoCache.Remove(twitchUserID)
	}

	isBroadcaster := (twitchUserID == internal.Config.Twitch.BroadcasterID)

	var wg sync.WaitGroup
	var isSubscriber, isFollower, isBanned bool
	var subErr, followErr, banErr, timeoutErr error

	wgTasks := 3
	wg.Add(wgTasks)

	go func() {
		defer wg.Done()
		subscription, err := twitch.GetUserSubscription(ginCtx, twitchUserID)
		if err != nil {
			subErr = err
			return
		}
		if len(subscription.Data) > 0 {
			isSubscriber = true
		}
	}()

	go func() {
		defer wg.Done()
		follow, err := twitch.GetUserFollower(ginCtx, twitchUserID)
		if err != nil {
			followErr = err
			return
		}
		if len(follow.Data) > 0 {
			isFollower = true
		}
	}()

	// TODO: requires broadcaster request
	go func() {
		defer wg.Done()
		// ban, err := twitch.GetUserBanStatus(ginCtx, twitchUserID)
		// if err != nil {
		// 	banErr = err
		// 	return
		// }
		// if len(ban.Data) > 0 {
		// 	isBanned = true
		// }
	}()

	wg.Wait()

	multiErr := errors.Join(subErr, followErr, banErr, timeoutErr)
	if multiErr != nil {
		return nil, fmt.Errorf("failed to get all Twitch user info: %w", multiErr)
	}

	info := &model.UserTwitchInfo{
		IsBroadcaster: &isBroadcaster,
		IsSubscriber:  &isSubscriber,
		IsFollower:    &isFollower,
		IsBanned:      &isBanned,
	}

	twitchInfoCache.Add(twitchUserID, CacheEntry{
		Info:      info,
		Timestamp: time.Now(),
	})

	return info, nil
}
