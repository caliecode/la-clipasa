package gql_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/Yamashou/gqlgenc/clientv2"
	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/auth"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/migrate"
	"github.com/caliecode/la-clipasa/internal/ent/generated/post"
	"github.com/caliecode/la-clipasa/internal/ent/generated/postcategory"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	_ "github.com/caliecode/la-clipasa/internal/ent/generated/runtime"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/caliecode/la-clipasa/internal/ent/privacy/token"
	"github.com/caliecode/la-clipasa/internal/gql/testclient"
	httpServer "github.com/caliecode/la-clipasa/internal/http"
	"github.com/caliecode/la-clipasa/internal/testutil"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
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
	testLogger  *zap.SugaredLogger
	testServer  *httptest.Server
)

func newAuthClient(token string) testclient.TestGraphClient {
	httpClient := testServer.Client()

	graphqlURL := testServer.URL + internal.Config.APIVersion + "/graphql"
	gqlClient := testclient.NewClient(httpClient, graphqlURL,
		&clientv2.Options{
			ParseDataAlongWithErrors: false,
		},
		func(ctx context.Context, req *http.Request, gqlInfo *clientv2.GQLRequestInfo, res any, next clientv2.RequestInterceptorFunc) error {
			req.Header.Set("Authorization", "Bearer "+token)
			return next(ctx, req, gqlInfo, res)
		},
	)

	return gqlClient
}

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
	if client == nil {
		client = testClient
		ctx = generated.NewContext(ctx, client)
	}

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

	userGQLClient := newAuthClient(userToken)
	modGQLClient := newAuthClient(modToken)

	t.Run("CreatePost", func(t *testing.T) {
		title := "My First Test Post " + testutil.RandomString(5)
		link := testutil.RandomLink()

		input := testclient.CreatePostInput{
			Title: title,
			Link:  link,
		}

		resp, err := userGQLClient.CreatePostMutation(ctx, input)
		require.NoError(t, err)
		require.NotNil(t, resp, "Response should not be nil")

		require.NotNil(t, resp.GetCreatePost(), "CreatePost payload should not be nil")
		require.NotNil(t, resp.GetCreatePost().GetPost(), "Created post should not be nil")

		createdPost := resp.GetCreatePost().GetPost()
		postID := createdPost.GetID()
		owner := createdPost.GetOwner()
		require.NotNil(t, owner, "Post owner should not be nil")
		ownerID := owner.GetID()

		assert.NotEmpty(t, postID)
		assert.Equal(t, title, createdPost.GetTitle())
		assert.Equal(t, link, createdPost.GetLink())
		assert.EqualValues(t, testUser.ID, *ownerID)
		assert.Equal(t, testUser.DisplayName, owner.GetDisplayName())

		dbPost, err := testClient.Post.Get(ctx, *postID)
		require.NoError(t, err)
		assert.Equal(t, title, dbPost.Title)
		assert.Equal(t, link, dbPost.Link)

		ownerEdge, err := dbPost.QueryOwner().OnlyID(ctx)
		require.NoError(t, err)
		assert.Equal(t, testUser.ID, ownerEdge)
	})

	t.Run("CreatePostWithCategories", func(t *testing.T) {
		title := "Post With Categories " + testutil.RandomString(5)
		link := testutil.RandomLink()
		categories := []postcategory.Category{
			postcategory.CategoryRANA,
			postcategory.CategoryMEME_ARTESANAL,
		}

		input := testclient.CreatePostWithCategoriesInput{
			Base: &testclient.CreatePostInput{
				Title: title,
				Link:  link,
			},
			Categories: categories,
		}

		resp, err := userGQLClient.CreatePostWithCategoriesMutation(ctx, input)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.NotNil(t, resp.GetCreatePostWithCategories())
		require.NotNil(t, resp.GetCreatePostWithCategories().GetPost())

		createdPost := resp.GetCreatePostWithCategories().GetPost()
		postID := createdPost.GetID()
		owner := createdPost.GetOwner()
		require.NotNil(t, owner)
		ownerID := owner.GetID()

		assert.NotEmpty(t, postID)
		assert.Equal(t, title, createdPost.GetTitle())
		assert.Equal(t, testUser.ID, *ownerID)
		require.Len(t, createdPost.GetCategories(), 2)

		foundCategories := make(map[postcategory.Category]bool)
		for _, cat := range createdPost.GetCategories() {
			require.NotNil(t, cat)
			assert.NotEmpty(t, cat.GetID())
			foundCategories[*cat.GetCategory()] = true
		}
		assert.True(t, foundCategories[postcategory.CategoryRANA])
		assert.True(t, foundCategories[postcategory.CategoryMEME_ARTESANAL])

		dbPost, err := testClient.Post.Query().
			Where(post.ID(*postID)).
			WithOwner().
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
		p := createTestPost(ctx, t, testUser)

		newTitle := "Updated Title " + testutil.RandomString(5)
		newContent := "Updated content."

		input := testclient.UpdatePostInput{
			Title:   &newTitle,
			Content: &newContent,
		}

		resp, err := userGQLClient.UpdatePostMutation(ctx, p.ID, input)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.NotNil(t, resp.GetUpdatePost())
		require.NotNil(t, resp.GetUpdatePost().GetPost())

		updatedPost := resp.GetUpdatePost().GetPost()
		postID := updatedPost.GetID()
		assert.Equal(t, p.ID, *postID)
		assert.Equal(t, newTitle, updatedPost.GetTitle())
		require.NotNil(t, updatedPost.GetContent())
		assert.Equal(t, newContent, *updatedPost.GetContent())

		dbPost, err := testClient.Post.Get(ctx, p.ID)
		require.NoError(t, err)
		assert.Equal(t, newTitle, dbPost.Title)
		require.NotNil(t, dbPost.Content)
		assert.Equal(t, newContent, *dbPost.Content)
	})

	t.Run("UpdatePost_Moderator", func(t *testing.T) {
		p := createTestPost(ctx, t, testUser)

		newTitle := "Moderator Updated Title " + testutil.RandomString(5)
		modComment := "Moderator approved this."
		isModerated := true

		input := testclient.UpdatePostInput{
			Title:             &newTitle,
			ModerationComment: &modComment,
			IsModerated:       &isModerated,
		}

		resp, err := modGQLClient.UpdatePostMutation(ctx, p.ID, input)
		require.NoError(t, err, "Moderator should be allowed by policy")
		require.NotNil(t, resp)
		require.NotNil(t, resp.GetUpdatePost())
		require.NotNil(t, resp.GetUpdatePost().GetPost())

		updatedPost := resp.GetUpdatePost().GetPost()
		postID := updatedPost.GetID()

		assert.Equal(t, p.ID, *postID)
		assert.Equal(t, newTitle, updatedPost.GetTitle())
		require.NotNil(t, updatedPost.GetModerationComment())
		assert.Equal(t, modComment, *updatedPost.GetModerationComment())
		assert.True(t, updatedPost.GetIsModerated())
		require.NotNil(t, updatedPost.GetModeratedAt())
		assert.WithinDuration(t, time.Now(), *updatedPost.GetModeratedAt(), 5*time.Second)

		dbPost, err := testClient.Post.Get(ctx, p.ID)
		require.NoError(t, err)
		assert.Equal(t, newTitle, dbPost.Title)
		require.NotNil(t, dbPost.ModerationComment)
		assert.Equal(t, modComment, dbPost.ModerationComment)
		assert.True(t, dbPost.IsModerated)
		assert.NotNil(t, dbPost.ModeratedAt)
		assert.WithinDuration(t, time.Now(), *dbPost.ModeratedAt, 5*time.Second)
	})

	t.Run("DeletePost_Self", func(t *testing.T) {
		p := createTestPost(ctx, t, testUser)

		resp, err := userGQLClient.DeletePostMutation(ctx, p.ID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.NotNil(t, resp.GetDeletePost())

		deletedID := resp.GetDeletePost().GetDeletedID()
		require.NotNil(t, deletedID, "Deleted ID should not be nil")
		assert.Equal(t, p.ID, *deletedID)

		softDeleteCtx := entx.SkipSoftDelete(ctx)
		dbPost, err := testClient.Post.Query().Where(post.ID(p.ID)).Only(softDeleteCtx)
		require.NoError(t, err)
		require.NotNil(t, dbPost.DeletedAt)

		require.NotNil(t, dbPost.DeletedBy)
		assert.Equal(t, testUser.ID.String(), dbPost.DeletedBy)

		_, err = testClient.Post.Get(ctx, p.ID)
		require.Error(t, err)
		assert.True(t, generated.IsNotFound(err))
	})

	t.Run("RestorePost_Moderator", func(t *testing.T) {
		ctxWithMod := internal.SetUserCtx(ctx, modUser)

		ctxWithMod = privacy.DecisionContext(ctxWithMod, privacy.Allow)

		p := createTestPost(ctxWithMod, t, modUser)
		err := testClient.Post.DeleteOne(p).Exec(ctxWithMod)
		require.NoError(t, err)

		softDeleteCtx := entx.SkipSoftDelete(ctx)
		dbPost, err := testClient.Post.Get(softDeleteCtx, p.ID)
		require.NoError(t, err)
		require.NotNil(t, dbPost.DeletedAt)

		resp, err := modGQLClient.RestorePostMutation(ctx, p.ID)
		require.NoError(t, err, "Moderator should be allowed by policy")
		require.NotNil(t, resp)

		require.NotNil(t, resp.GetRestorePost(), "RestorePost boolean pointer should not be nil")
		assert.True(t, *resp.GetRestorePost(), "RestorePost should return true")

		dbPost, err = testClient.Post.Get(ctx, p.ID)
		require.NoError(t, err)
		assert.True(t, dbPost.DeletedAt.IsZero())
		assert.Empty(t, dbPost.DeletedBy)
	})

	t.Run("QueryPosts", func(t *testing.T) {
		p1 := createTestPost(ctx, t, testUser)
		p2 := createTestPost(ctx, t, testUser)
		_ = createTestPost(ctx, t, modUser)

		first := int64(50)
		where := testclient.PostWhereInput{
			HasOwnerWith: []*testclient.UserWhereInput{
				{ID: &testUser.ID},
			},
		}

		resp, err := userGQLClient.GetPostsQuery(ctx, &first, nil, nil, nil, &where)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.NotNil(t, resp.GetPosts())

		postsConn := resp.GetPosts()
		require.GreaterOrEqual(t, postsConn.GetTotalCount(), int64(2))
		require.GreaterOrEqual(t, len(postsConn.GetEdges()), 2)

		foundIDs := make(map[uuid.UUID]bool)
		for _, edge := range postsConn.GetEdges() {
			require.NotNil(t, edge)
			node := edge.GetNode()
			require.NotNil(t, node)
			owner := node.GetOwner()
			require.NotNil(t, owner)

			postID := node.GetID()
			require.NotNil(t, postID)
			ownerID := owner.GetID()
			require.NotNil(t, ownerID)

			assert.Equal(t, testUser.ID, *ownerID)
			foundIDs[*postID] = true
		}
		assert.True(t, foundIDs[p1.ID])
		assert.True(t, foundIDs[p2.ID])
	})

	t.Run("QueryPosts_IncludingDeleted_AsModerator", func(t *testing.T) {
		p1 := createTestPost(ctx, t, testUser)
		p2 := createTestPost(ctx, t, testUser)

		ctxWithMod := internal.SetUserCtx(ctx, modUser)
		ctxWithMod = privacy.DecisionContext(ctxWithMod, privacy.Allow)
		err := testClient.Post.DeleteOne(p1).Exec(ctxWithMod)
		require.NoError(t, err)

		first := int64(50)
		includeDeleted := true
		where := testclient.PostWhereInput{
			IncludeDeleted: &includeDeleted,
			HasOwnerWith: []*testclient.UserWhereInput{
				{ID: &testUser.ID},
			},
		}

		resp, err := modGQLClient.GetPostsQuery(ctx, &first, nil, nil, nil, &where)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.NotNil(t, resp.GetPosts())

		postsConn := resp.GetPosts()
		require.GreaterOrEqual(t, postsConn.GetTotalCount(), int64(2))
		require.GreaterOrEqual(t, len(postsConn.GetEdges()), 2)

		foundP1 := false
		foundP2 := false
		for _, edge := range postsConn.GetEdges() {
			require.NotNil(t, edge)
			node := edge.GetNode()
			require.NotNil(t, node)
			postID := node.GetID()
			require.NotNil(t, postID)

			deletedAt := node.GetDeletedAt()

			if *postID == p1.ID {
				foundP1 = true
				require.NotNil(t, deletedAt, "Deleted post p1 should have DeletedAt set")
				assert.False(t, deletedAt.IsZero())
			}
			if *postID == p2.ID {
				foundP2 = true
				assert.Nil(t, deletedAt, "Active post p2 should have nil DeletedAt")
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

	user1GQLClient := newAuthClient(user1Token)
	user2GQLClient := newAuthClient(user2Token)
	modGQLClient := newAuthClient(modToken)

	post1 := createTestPost(ctx, t, user1)

	t.Run("UpdatePost_Fail_NonOwnerNonModerator", func(t *testing.T) {
		title := "Attempted Update"
		input := testclient.UpdatePostInput{Title: &title}

		_, err := user2GQLClient.UpdatePostMutation(ctx, post1.ID, input)

		require.Error(t, err)

		assert.Contains(t, err.Error(), "not found", "Expected permission error")

		dbPost, dbErr := testClient.Post.Get(ctx, post1.ID)
		require.NoError(t, dbErr)
		assert.Equal(t, post1.Title, dbPost.Title)
	})

	t.Run("UpdatePost_Success_Moderator", func(t *testing.T) {
		newTitle := "Mod Update " + testutil.RandomString(3)
		input := testclient.UpdatePostInput{Title: &newTitle}
		fmt.Printf("modUser.ID: %v\n", modUser.ID)
		resp, err := modGQLClient.UpdatePostMutation(ctx, post1.ID, input)
		require.NoError(t, err, "Moderator should be allowed to update")
		require.NotNil(t, resp)
		require.NotNil(t, resp.GetUpdatePost())
		require.NotNil(t, resp.GetUpdatePost().GetPost())

		updatedPost := resp.GetUpdatePost().GetPost()
		postID := updatedPost.GetID()
		require.NotNil(t, postID)
		assert.Equal(t, post1.ID, *postID)
		assert.Equal(t, newTitle, updatedPost.GetTitle())

		dbPost, dbErr := testClient.Post.Get(ctx, post1.ID)
		require.NoError(t, dbErr)
		assert.Equal(t, newTitle, dbPost.Title)
	})

	t.Run("DeletePost_Fail_NonOwnerNonModerator", func(t *testing.T) {
		post2 := createTestPost(ctx, t, user1)

		_, err := user2GQLClient.DeletePostMutation(ctx, post2.ID)
		require.Error(t, err)

		assert.Contains(t, err.Error(), "not found", "Expected permission error")

		dbPost, err := testClient.Post.Get(ctx, post2.ID)
		require.NoError(t, err)
		assert.True(t, dbPost.DeletedAt.IsZero())
	})

	t.Run("DeletePost_Success_Moderator", func(t *testing.T) {
		post3 := createTestPost(ctx, t, user1)

		resp, err := modGQLClient.DeletePostMutation(ctx, post3.ID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.NotNil(t, resp.GetDeletePost())

		deletedID := resp.GetDeletePost().GetDeletedID()
		require.NotNil(t, deletedID)
		assert.Equal(t, post3.ID, *deletedID)

		softDeleteCtx := entx.SkipSoftDelete(ctx)
		dbPost, err := testClient.Post.Query().Where(post.ID(post3.ID)).Only(softDeleteCtx)
		require.NoError(t, err)
		require.False(t, dbPost.DeletedAt.IsZero())
		require.NotNil(t, dbPost.DeletedBy)
		assert.Equal(t, modUser.ID.String(), dbPost.DeletedBy)
	})

	t.Run("RestorePost_Fail_NonModerator", func(t *testing.T) {
		ctxWithMod := internal.SetUserCtx(ctx, modUser)
		ctxWithMod = privacy.DecisionContext(ctxWithMod, privacy.Allow)
		p := createTestPost(ctxWithMod, t, modUser)
		err := testClient.Post.DeleteOne(p).Exec(ctxWithMod)
		require.NoError(t, err)

		_, err = user1GQLClient.RestorePostMutation(ctx, p.ID)
		require.Error(t, err)
		require.Contains(t, err.Error(), "unauthorized", "Expected unauthorized/permission error")

		softDeleteCtx := entx.SkipSoftDelete(ctx)
		dbPost, err := testClient.Post.Get(softDeleteCtx, p.ID)
		require.NoError(t, err)
		require.NotNil(t, dbPost.DeletedAt)
	})
}

func PtrTo[T any](v T) *T {
	return &v
}

func assertGraphQLErrorCode(t *testing.T, err error, expectedCode string) {
	t.Helper()
	require.Error(t, err)
	var gqlErrList *clientv2.GqlErrorList
	if errors.As(err, &gqlErrList) {
		require.NotEmpty(t, gqlErrList.Errors, "GqlErrorList should contain errors")
		found := false
		for _, gqlErr := range gqlErrList.Errors {
			if code, ok := gqlErr.Extensions["code"].(string); ok && code == expectedCode {
				found = true
				break
			}
		}
		assert.Truef(t, found, "Expected error code '%s' not found in extensions: %v", expectedCode, gqlErrList.Errors)
	} else {
		assert.Failf(t, "Error was not a GqlErrorList", "Error type: %T, Error: %v", err, err)
	}
}
