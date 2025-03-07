package gql

import (
	"fmt"
	"sync"
	"time"

	"github.com/caliecode/la-clipasa/internal/gql/model"
	lru "github.com/hashicorp/golang-lru/v2"
)

type CacheEntry struct {
	Info      *model.UserTwitchInfo
	Timestamp time.Time
}

var (
	twitchInfoCache *lru.Cache[string, CacheEntry]
	cacheOnce       sync.Once
	twitchCacheTTL  = 5 * time.Minute
	cacheSize       = 50
)

func initTwitchCache() {
	cacheOnce.Do(func() {
		var err error
		twitchInfoCache, err = lru.New[string, CacheEntry](cacheSize)
		if err != nil {
			panic(fmt.Sprintf("failed to create cache: %v", err))
		}
	})
}
