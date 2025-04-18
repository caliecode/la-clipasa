package gql_test

import (
	"context"
	"database/sql"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	_ "github.com/caliecode/la-clipasa/internal/ent/generated/runtime"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/99designs/gqlgen/client"
	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/auth"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/migrate"
	"github.com/caliecode/la-clipasa/internal/ent/generated/post"
	"github.com/caliecode/la-clipasa/internal/ent/generated/postcategory"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	httpServer "github.com/caliecode/la-clipasa/internal/http"
	"github.com/caliecode/la-clipasa/internal/testutil"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/theopenlane/entx"
	"go.uber.org/zap"
)

var (
	testPool    *pgxpool.Pool
	testSQLPool *sql.DB
	testClient  *generated.Client
	testAuthn   *auth.Authentication
	gqlClient   *client.Client
	testLogger  *zap.SugaredLogger
	testServer  *httptest.Server
)

func TestMain(m *testing.M) {
	testutil.Setup()

	testLogger = testutil.NewLogger(&testing.T{})

	var err error
	testPool, testSQLPool, err = testutil.NewDB(testutil.WithMigrations())
	if err != nil {
		testLogger.Fatalf("Failed to create test database: %v", err)
	}
	defer func() {
		if testSQLPool != nil {
			_ = testSQLPool.Close()
		}
		if testPool != nil {
			testPool.Close()
		}
	}()

	drv := entsql.OpenDB(dialect.Postgres, testSQLPool)
	testClient = generated.NewClient(generated.Driver(drv), generated.DB(testPool), generated.Logger(testLogger))

	if err := testClient.Schema.Create(context.Background(), migrate.WithForeignKeys(false)); err != nil {
		testLogger.Fatalf("Failed to create schema resources: %v", err)
	}

	testAuthn = auth.NewAuthentication(testClient)

	ctx := context.Background()

	ctx = generated.NewContext(ctx, testClient)
	ctx = internal.SetLoggerCtx(ctx, testLogger)

	serverConf := httpServer.Config{
		Address: ":0",
		Pool:    testPool,
		SQLPool: testSQLPool,
		Logger:  testLogger,
	}

	srv, err := httpServer.NewServer(ctx, serverConf)
	if err != nil {
		testLogger.Fatalf("Failed to create test server using NewServer: %v", err)
	}

	testServer = httptest.NewServer(srv.Httpsrv.Handler)
	cfg := internal.Config

	gqlClient = client.New(testServer.Config.Handler, client.Path(cfg.APIVersion+"/graphql"))

	code := m.Run()

	testServer.Close()

	os.Exit(code)
}

func createTestUser(ctx context.Context, t *testing.T, role user.Role) (*generated.User, string) {
	t.Helper()
	clientCtx := generated.NewContext(ctx, testClient)

	privacyCtx := token.NewContextWithSystemCallToken(clientCtx)
	privacyCtx = privacy.DecisionContext(privacyCtx, privacy.Allow)

	externalID := uuid.NewString()

	u := testClient.User.Create().
		SetDisplayName(testutil.RandomFirstName() + " " + testutil.RandomLastName()).
		SetExternalID(externalID).
		SetAuthProvider(user.AuthProviderTWITCH).
		SetRole(role).
		SaveX(privacyCtx)

	token, err := testAuthn.CreateAccessTokenForUser(ctx, u)
	require.NoError(t, err, "Failed to create access token for test user")

	return u, token
}

func createTestPost(ctx context.Context, t *testing.T, author *generated.User) *generated.Post {
	t.Helper()
	client := generated.FromContext(ctx)
	require.NotNil(t, client, "Ent client must be present in context for createTestPost")

	ctxWithUser := internal.SetUserCtx(ctx, author)

	ctxWithUser = privacy.DecisionContext(ctxWithUser, privacy.Allow)

	p := client.Post.Create().
		SetTitle(testutil.RandomLoremIpsum(5, 10)).
		SetLink(testutil.RandomLink()).
		SetOwner(author).
		SaveX(ctxWithUser)
	return p
}

func TestPostResolvers(t *testing.T) {
	ctx := context.Background()
	ctx = generated.NewContext(ctx, testClient)

	testUser, userToken := createTestUser(ctx, t, user.RoleUSER)
	require.NotNil(t, testUser)
	require.NotEmpty(t, userToken)

	modUser, modToken := createTestUser(ctx, t, user.RoleMODERATOR)
	require.NotNil(t, modUser)
	require.NotEmpty(t, modToken)

	t.Run("CreatePost", func(t *testing.T) {
		title := "My First Test Post " + testutil.RandomString(5)
		link := testutil.RandomLink()

		var resp struct {
			CreatePost struct {
				Post struct {
					ID    string `json:"id"`
					Title string `json:"title"`
					Link  string `json:"link"`
					Owner struct {
						ID          string `json:"id"`
						DisplayName string `json:"displayName"`
					} `json:"owner"`
				} `json:"post"`
			} `json:"createPost"`
		}

		mutation := `
			mutation CreatePost($input: CreatePostInput!) {
				createPost(input: $input) {
					post {
						id
						title
						link
						owner { id displayName }
					}
				}
			}`
		variables := map[string]any{
			"input": map[string]any{
				"title":   title,
				"link":    link,
				"ownerID": testUser.ID,
			},
		}

		err := gqlClient.Post(mutation, &resp, client.Var("input", variables["input"]), client.AddHeader("Authorization", "Bearer "+userToken))
		require.NoError(t, err)

		postID, err := uuid.Parse(resp.CreatePost.Post.ID)
		require.NoError(t, err)
		ownerID, err := uuid.Parse(resp.CreatePost.Post.Owner.ID)
		require.NoError(t, err)

		assert.NotEmpty(t, postID)
		assert.Equal(t, title, resp.CreatePost.Post.Title)
		assert.Equal(t, link, resp.CreatePost.Post.Link)
		assert.Equal(t, testUser.ID, ownerID)
		assert.Equal(t, testUser.DisplayName, resp.CreatePost.Post.Owner.DisplayName)

		dbPost, err := testClient.Post.Get(ctx, postID)
		require.NoError(t, err)
		assert.Equal(t, title, dbPost.Title)
		assert.Equal(t, link, dbPost.Link)
		assert.Equal(t, testUser.ID, dbPost.OwnerID)
	})

	t.Run("CreatePostWithCategories", func(t *testing.T) {
		title := "Post With Categories " + testutil.RandomString(5)
		link := testutil.RandomLink()
		categories := []postcategory.Category{postcategory.CategoryRANA, postcategory.CategoryMEME_ARTESANAL}

		var resp struct {
			CreatePostWithCategories struct {
				Post struct {
					ID         string `json:"id"`
					Title      string `json:"title"`
					Categories []*struct {
						ID       string                `json:"id"`
						Category postcategory.Category `json:"category"`
					} `json:"categories"`
					Owner struct {
						ID string `json:"id"`
					} `json:"owner"`
				} `json:"post"`
			} `json:"createPostWithCategories"`
		}

		mutation := `
			mutation CreatePostWithCategories($input: CreatePostWithCategoriesInput!) {
				createPostWithCategories(input: $input) {
					post {
						id
						title
						categories { id category }
						owner { id }
					}
				}
			}`
		variables := map[string]any{
			"input": map[string]any{
				"base": map[string]any{
					"title":   title,
					"link":    link,
					"ownerID": testUser.ID,
				},
				"categories": categories,
			},
		}

		err := gqlClient.Post(mutation, &resp, client.Var("input", variables["input"]), client.AddHeader("Authorization", "Bearer "+userToken))
		require.NoError(t, err)

		postID, err := uuid.Parse(resp.CreatePostWithCategories.Post.ID)
		require.NoError(t, err)
		ownerID, err := uuid.Parse(resp.CreatePostWithCategories.Post.Owner.ID)
		require.NoError(t, err)

		assert.NotEmpty(t, postID)
		assert.Equal(t, title, resp.CreatePostWithCategories.Post.Title)
		assert.Equal(t, testUser.ID, ownerID)
		require.Len(t, resp.CreatePostWithCategories.Post.Categories, 2)

		foundCategories := make(map[postcategory.Category]bool)
		for _, cat := range resp.CreatePostWithCategories.Post.Categories {
			require.NotNil(t, cat)
			catID, err := uuid.Parse(cat.ID)
			require.NoError(t, err)
			assert.NotEmpty(t, catID)
			foundCategories[cat.Category] = true
		}
		assert.True(t, foundCategories[postcategory.CategoryRANA])
		assert.True(t, foundCategories[postcategory.CategoryMEME_ARTESANAL])

		dbPost, err := testClient.Post.Query().
			Where(post.ID(postID)).
			WithCategories().
			Only(ctx)
		require.NoError(t, err)
		require.Len(t, dbPost.Edges.Categories, 2)
		dbFoundCategories := make(map[postcategory.Category]bool)
		for _, cat := range dbPost.Edges.Categories {
			dbFoundCategories[cat.Category] = true
		}
		assert.True(t, dbFoundCategories[postcategory.CategoryRANA])
		assert.True(t, dbFoundCategories[postcategory.CategoryMEME_ARTESANAL])
	})

	t.Run("UpdatePost_Self", func(t *testing.T) {
		ctxWithClient := generated.NewContext(ctx, testClient)
		ctxWithUser := internal.SetUserCtx(ctxWithClient, testUser)
		p := createTestPost(ctxWithUser, t, testUser)

		newTitle := "Updated Title " + testutil.RandomString(5)
		newContent := "Updated content."

		var resp struct {
			UpdatePost struct {
				Post struct {
					ID      string  `json:"id"`
					Title   string  `json:"title"`
					Content *string `json:"content"`
				} `json:"post"`
			} `json:"updatePost"`
		}

		mutation := `
			mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
				updatePost(id: $id, input: $input) {
					post {
						id
						title
						content
					}
				}
			}`
		variables := map[string]any{
			"id": p.ID.String(),
			"input": map[string]any{
				"title":   newTitle,
				"content": newContent,
			},
		}

		err := gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.Var("input", variables["input"]), client.AddHeader("Authorization", "Bearer "+userToken))
		require.NoError(t, err)

		postID, err := uuid.Parse(resp.UpdatePost.Post.ID)
		require.NoError(t, err)
		assert.Equal(t, p.ID, postID)
		assert.Equal(t, newTitle, resp.UpdatePost.Post.Title)
		require.NotNil(t, resp.UpdatePost.Post.Content)
		assert.Equal(t, newContent, *resp.UpdatePost.Post.Content)

		dbPost, err := testClient.Post.Get(ctx, p.ID)
		require.NoError(t, err)
		assert.Equal(t, newTitle, dbPost.Title)
		require.NotNil(t, dbPost.Content)
		assert.Equal(t, newContent, *dbPost.Content)
	})

	t.Run("UpdatePost_Moderator", func(t *testing.T) {
		ctxWithClient := generated.NewContext(ctx, testClient)
		ctxWithUser := internal.SetUserCtx(ctxWithClient, testUser)
		p := createTestPost(ctxWithUser, t, testUser)

		newTitle := "Moderator Updated Title " + testutil.RandomString(5)
		modComment := "Moderator approved this."

		var resp struct {
			UpdatePost struct {
				Post struct {
					ID                string  `json:"id"`
					Title             string  `json:"title"`
					ModerationComment string  `json:"moderationComment"`
					IsModerated       bool    `json:"isModerated"`
					ModeratedAt       *string `json:"moderatedAt"`
				} `json:"post"`
			} `json:"updatePost"`
		}

		mutation := `
			mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
				updatePost(id: $id, input: $input) {
					post {
						id
						title
						moderationComment
						isModerated
						moderatedAt
					}
				}
			}`
		variables := map[string]any{
			"id": p.ID.String(),
			"input": map[string]any{
				"title":             newTitle,
				"moderationComment": modComment,
				"isModerated":       true,
			},
		}

		err := gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.Var("input", variables["input"]), client.AddHeader("Authorization", "Bearer "+modToken))
		require.NoError(t, err, "Moderator should be allowed by policy")

		postID, err := uuid.Parse(resp.UpdatePost.Post.ID)
		require.NoError(t, err)
		assert.Equal(t, p.ID, postID)
		assert.Equal(t, newTitle, resp.UpdatePost.Post.Title)
		assert.Equal(t, modComment, resp.UpdatePost.Post.ModerationComment)
		assert.True(t, resp.UpdatePost.Post.IsModerated)
		assert.NotNil(t, resp.UpdatePost.Post.ModeratedAt)

		dbPost, err := testClient.Post.Get(ctx, p.ID)
		require.NoError(t, err)
		assert.Equal(t, newTitle, dbPost.Title)
		assert.Equal(t, modComment, dbPost.ModerationComment)
		assert.True(t, dbPost.IsModerated)
		assert.NotNil(t, dbPost.ModeratedAt)
		assert.WithinDuration(t, time.Now(), *dbPost.ModeratedAt, 5*time.Second)
	})

	t.Run("DeletePost_Self", func(t *testing.T) {
		ctxWithClient := generated.NewContext(ctx, testClient)
		ctxWithUser := internal.SetUserCtx(ctxWithClient, testUser)
		p := createTestPost(ctxWithUser, t, testUser)

		var resp struct {
			DeletePost struct {
				DeletedID string `json:"deletedID"`
			} `json:"deletePost"`
		}

		mutation := `
			mutation DeletePost($id: ID!) {
				deletePost(id: $id) {
					deletedID
				}
			}`
		variables := map[string]any{
			"id": p.ID.String(),
		}

		err := gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.AddHeader("Authorization", "Bearer "+userToken))
		require.NoError(t, err)

		deletedID, err := uuid.Parse(resp.DeletePost.DeletedID)
		require.NoError(t, err)
		assert.Equal(t, p.ID, deletedID)

		softDeleteCtx := entx.SkipSoftDelete(ctx)
		dbPost, err := testClient.Post.Query().Where(post.ID(p.ID)).Only(softDeleteCtx)
		require.NoError(t, err)
		require.NotNil(t, dbPost.DeletedAt)
		require.NotEmpty(t, dbPost.DeletedBy)
		assert.Equal(t, testUser.ID.String(), dbPost.DeletedBy)

		_, err = testClient.Post.Get(ctx, p.ID)
		require.Error(t, err)
		assert.True(t, generated.IsNotFound(err))
	})

	t.Run("RestorePost_Moderator", func(t *testing.T) {
		ctxWithClient := generated.NewContext(ctx, testClient)
		ctxWithMod := internal.SetUserCtx(ctxWithClient, modUser)
		ctxWithMod = privacy.DecisionContext(ctxWithMod, privacy.Allow)
		p := createTestPost(ctxWithMod, t, modUser)
		err := testClient.Post.DeleteOne(p).Exec(ctxWithMod)
		require.NoError(t, err)

		softDeleteCtx := entx.SkipSoftDelete(ctx)
		dbPost, err := testClient.Post.Get(softDeleteCtx, p.ID)
		require.NoError(t, err)
		require.NotNil(t, dbPost.DeletedAt)

		var resp struct {
			RestorePost *bool `json:"restorePost"`
		}

		mutation := `
			mutation RestorePost($id: ID!) {
				restorePost(id: $id)
			}`
		variables := map[string]any{
			"id": p.ID.String(),
		}

		err = gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.AddHeader("Authorization", "Bearer "+modToken))
		require.NoError(t, err, "Moderator should be allowed by policy")
		require.NotNil(t, resp.RestorePost)
		assert.True(t, *resp.RestorePost)

		dbPost, err = testClient.Post.Get(ctx, p.ID)
		require.NoError(t, err)
		assert.True(t, dbPost.DeletedAt.IsZero())
		assert.Empty(t, dbPost.DeletedBy)
	})

	t.Run("QueryPosts", func(t *testing.T) {
		ctxWithClient := generated.NewContext(ctx, testClient)
		ctxWithUser := internal.SetUserCtx(ctxWithClient, testUser)
		p1 := createTestPost(ctxWithUser, t, testUser)
		p2 := createTestPost(ctxWithUser, t, testUser)
		_ = createTestPost(ctx, t, modUser)

		var resp struct {
			Posts struct {
				TotalCount int `json:"totalCount"`
				Edges      []*struct {
					Node struct {
						ID    string `json:"id"`
						Title string `json:"title"`
						Owner *struct {
							ID string `json:"id"`
						} `json:"owner"`
					} `json:"node"`
				} `json:"edges"`
			} `json:"posts"`
		}

		query := `
			query GetPosts($first: Int, $where: PostWhereInput) {
				posts(first: $first, where: $where) {
					totalCount
					edges {
						node {
							id
							title
							owner { id }
						}
					}
				}
			}`
		variables := map[string]any{
			"first": 50,
			"where": map[string]any{
				"hasOwnerWith": []map[string]any{{"id": testUser.ID.String()}},
			},
		}

		err := gqlClient.Post(query, &resp, client.Var("first", variables["first"]), client.Var("where", variables["where"]), client.AddHeader("Authorization", "Bearer "+userToken))
		require.NoError(t, err)

		require.GreaterOrEqual(t, resp.Posts.TotalCount, 2)
		require.GreaterOrEqual(t, len(resp.Posts.Edges), 2)

		foundIDs := make(map[uuid.UUID]bool)
		for _, edge := range resp.Posts.Edges {
			require.NotNil(t, edge.Node)
			require.NotNil(t, edge.Node.Owner)

			postID, err := uuid.Parse(edge.Node.ID)
			require.NoError(t, err)
			ownerID, err := uuid.Parse(edge.Node.Owner.ID)
			require.NoError(t, err)

			assert.Equal(t, testUser.ID, ownerID)
			foundIDs[postID] = true
		}
		assert.True(t, foundIDs[p1.ID])
		assert.True(t, foundIDs[p2.ID])
	})

	t.Run("QueryPosts_IncludingDeleted_AsModerator", func(t *testing.T) {
		ctxWithClient := generated.NewContext(ctx, testClient)
		ctxWithUser := internal.SetUserCtx(ctxWithClient, testUser)
		p1 := createTestPost(ctxWithUser, t, testUser)
		p2 := createTestPost(ctxWithUser, t, testUser)

		ctxWithMod := internal.SetUserCtx(ctx, modUser)
		ctxWithMod = privacy.DecisionContext(ctxWithMod, privacy.Allow)
		err := testClient.Post.DeleteOne(p1).Exec(ctxWithMod)
		require.NoError(t, err)

		var resp struct {
			Posts struct {
				TotalCount int `json:"totalCount"`
				Edges      []*struct {
					Node struct {
						ID        string  `json:"id"`
						Title     string  `json:"title"`
						DeletedAt *string `json:"deletedAt"`
					} `json:"node"`
				} `json:"edges"`
			} `json:"posts"`
		}

		query := `
			query GetPosts($first: Int, $where: PostWhereInput) {
				posts(first: $first, where: $where) {
					totalCount
					edges {
						node {
							id
							title
							deletedAt
						}
					}
				}
			}`
		variables := map[string]any{
			"first": 50,
			"where": map[string]any{
				"includeDeleted": true,
				"hasOwnerWith":   []map[string]any{{"id": testUser.ID.String()}},
			},
		}

		err = gqlClient.Post(query, &resp, client.Var("first", variables["first"]), client.Var("where", variables["where"]), client.AddHeader("Authorization", "Bearer "+modToken))
		require.NoError(t, err)

		require.GreaterOrEqual(t, resp.Posts.TotalCount, 2)
		require.GreaterOrEqual(t, len(resp.Posts.Edges), 2)

		foundP1 := false
		foundP2 := false
		for _, edge := range resp.Posts.Edges {
			require.NotNil(t, edge.Node)
			postID, err := uuid.Parse(edge.Node.ID)
			require.NoError(t, err)

			if postID == p1.ID {
				foundP1 = true
				assert.NotNil(t, edge.Node.DeletedAt)
			}
			if postID == p2.ID {
				foundP2 = true
				assert.Nil(t, edge.Node.DeletedAt)
			}
		}
		assert.True(t, foundP1, "Deleted post p1 was not found")
		assert.True(t, foundP2, "Active post p2 was not found")
	})
}

func TestPostAuthorization(t *testing.T) {
	ctx := context.Background()
	ctx = generated.NewContext(ctx, testClient)

	user1, user1Token := createTestUser(ctx, t, user.RoleUSER)
	_, user2Token := createTestUser(ctx, t, user.RoleUSER)
	modUser, modToken := createTestUser(ctx, t, user.RoleMODERATOR)

	ctxWithUser1 := internal.SetUserCtx(ctx, user1)
	post1 := createTestPost(ctxWithUser1, t, user1)

	t.Run("UpdatePost_Fail_NonOwnerNonModerator", func(t *testing.T) {
		var resp struct {
			UpdatePost struct{ Post struct{ ID string } } `json:"updatePost"`
		}
		mutation := `mutation ($id: ID!, $input: UpdatePostInput!) { updatePost(id: $id, input: $input) { post { id } } }`
		variables := map[string]any{"id": post1.ID.String(), "input": map[string]any{"title": "Attempted Update"}}

		err := gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.Var("input", variables["input"]), client.AddHeader("Authorization", "Bearer "+user2Token))
		require.Error(t, err)
		require.Contains(t, err.Error(), "post not found", "Expected access denied error") // Privacy rule should deny - TODO: override error message instead of giving X not found

		dbPost, dbErr := testClient.Post.Get(ctx, post1.ID)
		require.NoError(t, dbErr)
		assert.Equal(t, post1.Title, dbPost.Title)
	})

	t.Run("UpdatePost_Success_Moderator", func(t *testing.T) {
		var resp struct {
			UpdatePost struct {
				Post struct {
					ID    string `json:"id"`
					Title string `json:"title"`
				} `json:"post"`
			} `json:"updatePost"`
		}
		mutation := `mutation ($id: ID!, $input: UpdatePostInput!) { updatePost(id: $id, input: $input) { post { id title } } }`
		newTitle := "Mod Update " + testutil.RandomString(3)
		variables := map[string]any{"id": post1.ID.String(), "input": map[string]any{"title": newTitle}}

		err := gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.Var("input", variables["input"]), client.AddHeader("Authorization", "Bearer "+modToken))
		require.NoError(t, err, "Moderator role should pass privacy check")

		postID, err := uuid.Parse(resp.UpdatePost.Post.ID)
		require.NoError(t, err)
		assert.Equal(t, post1.ID, postID)
		assert.Equal(t, newTitle, resp.UpdatePost.Post.Title)

		dbPost, dbErr := testClient.Post.Get(ctx, post1.ID)
		require.NoError(t, dbErr)
		assert.Equal(t, newTitle, dbPost.Title)
	})

	t.Run("DeletePost_Fail_NonOwnerNonModerator", func(t *testing.T) {
		ctxWithUser1 := internal.SetUserCtx(ctx, user1)
		post2 := createTestPost(ctxWithUser1, t, user1)

		var resp struct {
			DeletePost struct{ DeletedID string } `json:"deletePost"`
		}
		mutation := `mutation ($id: ID!) { deletePost(id: $id) { deletedID } }`
		variables := map[string]any{"id": post2.ID.String()}

		err := gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.AddHeader("Authorization", "Bearer "+user2Token))
		require.Error(t, err)
		require.Contains(t, err.Error(), "not found", "Expected access denied error") // TODO: replace error messages when user owned kicks in

		dbPost, err := testClient.Post.Get(ctx, post2.ID)
		require.NoError(t, err)
		assert.True(t, dbPost.DeletedAt.IsZero())
	})

	t.Run("DeletePost_Success_Moderator", func(t *testing.T) {
		ctxWithUser1 := internal.SetUserCtx(ctx, user1)
		post3 := createTestPost(ctxWithUser1, t, user1)

		var resp struct {
			DeletePost struct {
				DeletedID string `json:"deletedID"`
			} `json:"deletePost"`
		}
		mutation := `mutation ($id: ID!) { deletePost(id: $id) { deletedID } }`
		variables := map[string]any{"id": post3.ID.String()}

		err := gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.AddHeader("Authorization", "Bearer "+modToken))
		require.NoError(t, err)

		deletedID, err := uuid.Parse(resp.DeletePost.DeletedID)
		require.NoError(t, err)
		assert.Equal(t, post3.ID, deletedID)

		softDeleteCtx := entx.SkipSoftDelete(ctx)
		dbPost, err := testClient.Post.Query().Where(post.ID(post3.ID)).Only(softDeleteCtx)
		require.NoError(t, err)
		require.NotNil(t, dbPost.DeletedAt)
		require.NotEmpty(t, dbPost.DeletedBy)
		assert.Equal(t, modUser.ID.String(), dbPost.DeletedBy)
	})

	t.Run("RestorePost_Fail_NonModerator", func(t *testing.T) {
		ctxWithMod := internal.SetUserCtx(ctx, modUser)
		ctxWithMod = privacy.DecisionContext(ctxWithMod, privacy.Allow)
		p := createTestPost(ctxWithMod, t, modUser)
		err := testClient.Post.DeleteOne(p).Exec(ctxWithMod)
		require.NoError(t, err)

		var resp struct {
			RestorePost *bool `json:"restorePost"`
		}
		mutation := `mutation RestorePost($id: ID!) { restorePost(id: $id) }`
		variables := map[string]any{"id": p.ID.String()}

		err = gqlClient.Post(mutation, &resp, client.Var("id", variables["id"]), client.AddHeader("Authorization", "Bearer "+user1Token))
		require.Error(t, err)

		require.Contains(t, err.Error(), "unauthorized", "Expected unauthorized/access denied error from directive")

		softDeleteCtx := entx.SkipSoftDelete(ctx)
		dbPost, err := testClient.Post.Get(softDeleteCtx, p.ID)
		require.NoError(t, err)
		require.NotNil(t, dbPost.DeletedAt)
	})
}
