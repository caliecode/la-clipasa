package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/postcategory"
	_ "github.com/caliecode/la-clipasa/internal/ent/generated/runtime"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/caliecode/la-clipasa/internal/envvar"
	postgresql "github.com/caliecode/la-clipasa/internal/postgres"
	"github.com/caliecode/la-clipasa/internal/random"
	"github.com/caliecode/la-clipasa/internal/utils/logger"
	"github.com/caliecode/la-clipasa/internal/utils/slices"
)

// RedditPost represents the structure of our JSON files
type RedditPost struct {
	ID            string                `json:"id"`
	LinkFlairText postcategory.Category `json:"link_flair_text"`
	Author        string                `json:"author"`
	CreatedUTC    int64                 `json:"created_utc"`
	Title         string                `json:"title"`
	URL           string                `json:"url"`
	IsVideo       bool                  `json:"is_video"`
	Permalink     string                `json:"permalink"`
}

// loadRedditPostsSample reads all JSON files from a directory
func loadRedditPostsSample(dirPath string) ([]RedditPost, error) {
	sample := 50
	posts := make([]RedditPost, sample)

	files, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("reading directory: %w", err)
	}

	for i, file := range files {
		if i >= sample {
			break
		}
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(dirPath, file.Name()))
		if err != nil {
			return nil, fmt.Errorf("reading file %s: %w", file.Name(), err)
		}

		var post RedditPost
		if err := json.Unmarshal(data, &post); err != nil {
			return nil, fmt.Errorf("unmarshaling JSON from %s: %w", file.Name(), err)
		}

		posts[i] = post
	}

	return posts, nil
}

func main() {
	random.SetSeed(1000)
	r := random.Source()

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

	os.Setenv("SEEDING_MODE", "true")

	logger, _ := logger.NewZap()

	pool, sqlpool, err := postgresql.New(logger)
	if err != nil {
		logger.Fatalf("Couldn't create postgres pool: %s", err)
	}

	drv := entsql.OpenDB(dialect.Postgres, sqlpool)

	entClient := generated.NewClient(generated.Driver(drv), generated.Logger(logger), generated.DB(pool))
	defer entClient.Close()

	ctx := generated.NewContext(context.Background(), entClient)
	ctx = internal.SetLoggerCtx(ctx, logger)

	adminUser := random.NewUser(ctx)
	adminUser.Update().
		SetDisplayName("admin").
		SetRole(user.RoleADMIN).
		SaveX(ctx)
	logger.Debug("created dev admin user")

	redditUsers := make(map[string]*generated.User)
	redditPostsDir := "./flair-posts"

	if internal.Config.AppEnv == internal.AppEnvProd {
		files, err := os.ReadDir(redditPostsDir)
		for _, file := range files {
			if err != nil {
				fmt.Printf("error reading directory: %v", err)
				continue
			}
			if !strings.HasSuffix(file.Name(), ".json") {
				continue
			}

			data, err := os.ReadFile(filepath.Join(redditPostsDir, file.Name()))
			if err != nil {
				fmt.Printf("error reading file %s: %v", file.Name(), err)
				continue
			}

			var rPost RedditPost
			if err = json.Unmarshal(data, &rPost); err != nil {
				fmt.Printf("error unmarshaling JSON from %s: %v", file.Name(), err)
				continue
			}

			if rPost.URL == "" {
				_ = os.Remove(fmt.Sprintf("./flair-posts/%s.json", rPost.ID))
				continue
			}
			redditUser, exists := redditUsers[rPost.Author]
			if !exists {
				redditUser, err = entClient.User.Create().
					SetExternalID(fmt.Sprintf("reddit:%s", rPost.Author)).
					SetDisplayName(rPost.Author + " (Reddit)").
					SetProfileImage("/reddit.svg").
					Save(internal.SetUserCtx(ctx, adminUser))
				if err != nil {
					if !generated.IsConstraintError(err) {
						fmt.Printf("Failed to create Reddit user %s: %s\n", rPost.Author, err)
						continue
					}
					redditUser, err = entClient.User.Query().Where(user.DisplayName(rPost.Author + " (Reddit)")).First(ctx)
					if err != nil {
						fmt.Printf("Failed to retrieve Reddit user %s: %s\n", rPost.Author, err)
						continue
					}
				}
				redditUsers[rPost.Author] = redditUser
			}

			ctx = internal.SetUserCtx(ctx, redditUser)
			categ, err := entClient.PostCategory.Create().
				SetCategory(rPost.LinkFlairText).
				Save(ctx)
			if err != nil {
				fmt.Printf("could not created category: %v\n", err)
				continue
			}
			post, err := entClient.Post.Create().
				SetTitle(rPost.Title).
				SetIsModerated(true).
				SetLink(rPost.URL).
				SetOwner(redditUser).
				AddCategories(
					categ,
				).
				Save(ctx)
			if err != nil {
				fmt.Printf("could not created post: %v\n", err)
				continue
			}

			_, err = pool.Exec(ctx, "UPDATE posts SET created_at = $1 WHERE id = $2", time.Unix(rPost.CreatedUTC, 0), post.ID)
			if err != nil {
				logger.Fatalf("Failed to set created_at for Reddit post %s: %s\n", post.ID, err)
			}

			fmt.Printf("created post %v\n", post.Link)
		}

		return
	}

	uu := []*generated.User{adminUser}
	pp := []*generated.Post{}
	cc := []*generated.Comment{}

	redditPosts, err := loadRedditPostsSample(redditPostsDir)
	if err != nil {
		logger.Fatalf("Couldn't load Reddit posts: %s", err)
	}

	for _, rPost := range redditPosts {
		if rPost.URL == "" {
			_ = os.Remove(fmt.Sprintf("./flair-posts/%s.json", rPost.ID))
			continue
		}
		redditUser, exists := redditUsers[rPost.Author]
		if !exists {
			var err error
			redditUser, err = entClient.User.Create().
				SetExternalID(fmt.Sprintf("reddit:%s", rPost.Author)).
				SetDisplayName(rPost.Author + " (Reddit)").
				SetProfileImage("/reddit.svg").
				Save(internal.SetUserCtx(ctx, adminUser))
			if err != nil {
				logger.Fatalf("Failed to create Reddit user %s: %s", rPost.Author, err)
			}
			redditUsers[rPost.Author] = redditUser
			uu = append(uu, redditUser)
		}

		ctx = internal.SetUserCtx(ctx, redditUser)
		post := entClient.Post.Create().
			SetTitle(rPost.Title).
			SetIsModerated(true).
			SetLink(rPost.URL).
			SetOwner(redditUser).
			AddCategories(
				entClient.PostCategory.Create().
					SetCategory(rPost.LinkFlairText).
					SaveX(ctx),
			).
			SaveX(ctx)

		_, err := pool.Exec(ctx, "UPDATE posts SET created_at = $1 WHERE id = $2", time.Unix(rPost.CreatedUTC, 0), post.ID)
		if err != nil {
			logger.Fatalf("Failed to set created_at for Reddit post %s: %s", post.ID, err)
		}

		pp = append(pp, post)
	}

	logger.Debugf("Finished loading %d Reddit posts", len(pp))

	for range 200 {
		uu = append(uu, random.NewUser(ctx))
	}
	logger.Debugf("Created %d users", len(uu))

	for range 800 {
		u := uu[r.Intn(len(uu))]
		p := random.NewPost(ctx, u)
		ctx = internal.SetUserCtx(ctx, u)
		p = entClient.Post.UpdateOne(p).
			SetIsModerated(true).
			AddCategories(random.NewPostCategory(ctx)).
			SaveX(ctx)
		pp = append(pp, p)
	}
	logger.Debugf("Created %d posts", len(pp))

	for range 600 {
		p := pp[r.Intn(len(pp))]
		u := uu[r.Intn(len(uu))]
		ctx = internal.SetUserCtx(ctx, u)

		updater := entClient.Post.UpdateOne(p)
		if r.Float32() < 0.1 {
			updater.SetPinned(true)
		}
		entClient.Post.UpdateOne(p).AddCategories(random.NewPostCategory(ctx)).Save(ctx) // let it fail if duplicate
		updater.
			AddLikedBy(u).
			AddSavedBy(u)

		owner := slices.Filter(uu, func(u *generated.User, i int) bool {
			return u.ID == p.OwnerID
		})[0]

		updater.SaveX(internal.SetUserCtx(ctx, owner))

		for range r.Intn(5) {
			cc = append(cc, random.NewComment(ctx, uu[r.Intn(len(uu))], p))
		}
	}

	logger.Debug("created random entities and imported Reddit posts")
}
