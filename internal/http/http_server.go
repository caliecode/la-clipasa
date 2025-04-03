package http

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"entgo.io/contrib/entgql"
	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/pprof"
	ginzap "github.com/gin-contrib/zap"
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/vektah/gqlparser/v2/ast"
	"github.com/zitadel/oidc/v3/pkg/client/rp"
	httphelper "github.com/zitadel/oidc/v3/pkg/http"
	"go.uber.org/zap"

	laclipasa "github.com/caliecode/la-clipasa"
	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/auth"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/envvar"
	"github.com/caliecode/la-clipasa/internal/gql"
	postgresql "github.com/caliecode/la-clipasa/internal/postgres"
	"github.com/caliecode/la-clipasa/internal/utils/format"
	"github.com/caliecode/la-clipasa/internal/utils/format/colors"
	"github.com/caliecode/la-clipasa/internal/utils/logger"
	postgresqlutils "github.com/caliecode/la-clipasa/internal/utils/postgresql"
)

const (
	ApiKeyHeaderKey        = "x-api-key"
	AuthorizationHeaderKey = "authorization"
)

// Open new connection.
func Open(databaseUrl string) *generated.Client {
	db, err := sql.Open("pgx", databaseUrl)
	if err != nil {
		log.Fatal(err)
	}

	// Create an generated.Driver from `db`.
	drv := entsql.OpenDB(dialect.Postgres, db)
	return generated.NewClient(generated.Driver(drv))
}

// TODO: for internal/rest.runTestServer hopefully an adaptation of https://github.com/99designs/gqlgen/blob/master/client/client.go
// or using https://github.com/Khan/genqlient suffices. we can have formatted and typed queries with a /* GraphQL */ comment

const ValidationErrorSeparator = "$$$$"

type Config struct {
	// Port to listen to. Use ":0" for a random port.
	Address string
	Pool    *pgxpool.Pool
	SQLPool *sql.DB
	Logger  *zap.SugaredLogger
}

// TODO BuildServerConfig with implicit validation instead.
func (c *Config) validate() error {
	if c.Address == "" && os.Getenv("IS_TESTING") == "" {
		return errors.New("no server address provided")
	}
	if c.Pool == nil {
		return errors.New("no Postgres pool provided")
	}
	if c.Logger == nil {
		return errors.New("no logger provided")
	}

	return nil
}

func LogResponseMiddleware(out io.Writer) gin.HandlerFunc {
	return func(c *gin.Context) {
		writer := &responseWriterLogger{ResponseWriter: c.Writer}

		c.Writer = writer

		c.Next()

		fmt.Fprintf(out, colors.Green+"response: %s...\n"+colors.Off, format.Truncate(string(writer.body), 200))
	}
}

type Server struct {
	Httpsrv     *http.Server
	middlewares []gin.HandlerFunc
}

type ServerOption func(*Server)

// WithMiddlewares adds the given middlewares before registering the main routers.
func WithMiddlewares(mws ...gin.HandlerFunc) ServerOption {
	return func(s *Server) {
		s.middlewares = mws
	}
}

var key = []byte("test1234test1234")

type responseWriterLogger struct {
	gin.ResponseWriter
	out  io.Writer
	body []byte
}

func (w *responseWriterLogger) Write(b []byte) (int, error) {
	w.body = b
	return w.ResponseWriter.Write(b)
}

func GinContextToContextMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.WithValue(c.Request.Context(), "GinContextKey", c)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// NewServer returns a new http server.
func NewServer(ctx context.Context, conf Config, opts ...ServerOption) (*Server, error) {
	if err := conf.validate(); err != nil {
		return nil, fmt.Errorf("server config validation: %w", err)
	}

	srv := &Server{}
	for _, o := range opts {
		o(srv)
	}

	cfg := internal.Config

	router := gin.Default()
	// Add a ginzap middleware, which:
	// - Logs all requests, like a combined access and error log.
	// - Logs to stdout.
	// - RFC3339 with UTC time format.
	router.Use(ginzap.GinzapWithConfig(conf.Logger.Desugar(), &ginzap.Config{
		TimeFormat: time.RFC3339,
		UTC:        true,
		// SkipPaths:  []string{"/no_log"},
	}))
	router.Use(ginzap.RecoveryWithZap(conf.Logger.Desugar(), true))

	var host string
	switch cfg.AppEnv {
	case internal.AppEnvProd, internal.AppEnvE2E:
		host = cfg.Domain
	default:
		host = cfg.Domain + ":" + cfg.APIPort
	}
	host = "https://" + host

	router.Use(cors.New(cors.Config{
		AllowWildcard: true,
		// should be appConfig env struct
		AllowOrigins: []string{host, "https://localhost:" + cfg.FrontendPort, "https://laclipasa.pages.dev", "https://*.laclipasa.pages.dev"},
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS", // Required for preflight requests
			"HEAD",
		},

		AllowHeaders: []string{
			"Content-Type",
			"Authorization",
			"Origin",
			"Accept",
			"X-Requested-With",
			"X-CSRF-Token",
			"Access-Control-Allow-Origin",
			"X-Api-Key",
			"Cache-Control",
		},

		ExposeHeaders: []string{
			"Content-Length",
			"Content-Type",
			"Set-Cookie",
			"Authorization",
			"X-Custom-Header",
		},
		AllowCredentials: true,
		AllowWebSockets:  true,
		// AllowOriginFunc: func(origin string) bool {
		// 	return origin == "https://github.com"
		// },
		MaxAge: 12 * time.Hour,
	}))

	// apiRouter.Use(GinContextToContextMiddleware())

	apiRouter := router.Group(cfg.APIVersion)

	if cfg.AppEnv == internal.AppEnvDev {
		pprof.Register(apiRouter, "dev/pprof")
	}
	entclient := generated.FromContext(ctx)

	apiRouter.Use(func(c *gin.Context) {
		requestCtx := context.WithValue(c.Request.Context(), ginCtxKey, c)
		requestCtx = internal.SetLoggerCtx(requestCtx, conf.Logger)
		requestCtx = generated.NewContext(requestCtx, entclient)
		c.Request = c.Request.WithContext(requestCtx)
		c.Next()
	})

	for _, mw := range srv.middlewares {
		apiRouter.Use(mw)
	}

	userScopes := strings.Split(cfg.TwitchOIDC.UserScopes, " ")
	broadcasterScopes := strings.Split(cfg.TwitchOIDC.BroadcasterScopes, " ")

	cookieHandler := httphelper.NewCookieHandler(key, key, httphelper.WithUnsecure())

	providerOptions := []rp.Option{
		rp.WithCookieHandler(cookieHandler),
		rp.WithVerifierOpts(rp.WithIssuedAtOffset(5 * time.Second)),
		rp.WithSigningAlgsFromDiscovery(),
	}

	twitchUserProvider, err := rp.NewRelyingPartyOIDC(ctx,
		cfg.TwitchOIDC.Issuer,
		cfg.TwitchOIDC.ClientID,
		cfg.TwitchOIDC.ClientSecret,
		internal.BuildAPIURL("/auth/twitch/callback"),
		userScopes,
		providerOptions...)
	if err != nil {
		return nil, fmt.Errorf("error creating twitch user provider: %w", err)
	}

	twitchBroadcasterProvider, err := rp.NewRelyingPartyOIDC(ctx,
		cfg.TwitchOIDC.Issuer,
		cfg.TwitchOIDC.ClientID,
		cfg.TwitchOIDC.ClientSecret,
		internal.BuildAPIURL("/auth/twitch/callback"),
		broadcasterScopes,
		providerOptions...)
	if err != nil {
		return nil, fmt.Errorf("error creating twitch broadcast provider: %w", err)
	}

	authn := auth.NewAuthentication(entclient)
	handlers := Handlers{
		logger: conf.Logger,
		authmw: NewAuthMiddleware(conf.Logger, authn),
		oauth2Providers: OAuth2Providers{
			OAuth2LoginModeBroadcaster: twitchBroadcasterProvider,
			OAuth2LoginModeUser:        twitchUserProvider,
		},
		authn: authn,
	}

	go func() {
		ticker := time.NewTicker(time.Hour)
		for range ticker.C {
			authn.CleanupExpiredAndRevokedTokens(ctx)
		}
	}()

	switch cfg.AppEnv {
	case internal.AppEnvProd, internal.AppEnvE2E:
		rlMw := newRateLimitMiddleware(conf.Logger, 15, 5)
		apiRouter.Use(rlMw.Limit())
	case internal.AppEnvDev, internal.AppEnvCI:
		rlMw := newRateLimitMiddleware(conf.Logger, 15, 5)
		if os.Getenv("IS_TESTING") == "" {
			apiRouter.Use(rlMw.Limit())
			apiRouter.Use(LogResponseMiddleware(os.Stdout))
		}
	default:
		panic("unknown app env: " + cfg.AppEnv)
	}

	entClient := generated.FromContext(ctx)

	authg := apiRouter.Group("/auth")
	authg.GET("/twitch/login", handlers.twitchLogin)
	authg.GET("/twitch/callback", handlers.codeExchange, handlers.twitchCallback)

	apiRouter.GET("/gql-apollo", gin.WrapH(playground.ApolloSandboxHandler("GraphQL", apiRouter.BasePath()+"/graphql")))
	apiRouter.GET("/gql-altair", gin.WrapH(playground.AltairHandler("GraphQL", apiRouter.BasePath()+"/graphql", map[string]any{})))

	apiRouter.Use(handlers.authmw.TryAuthentication())

	apiRouter.POST("/graphql", graphqlHandler(entClient))

	// have to define before serving static assets.
	router.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/ui")
	})

	baseUrl := "/ui"
	router.Use(static.Serve(baseUrl+"/", newStaticFileSystem())) // does show at broken routes eg https://localhost:8090/ui/fds

	// Client-side routing fallback
	router.NoRoute(func(c *gin.Context) {
		if !strings.HasPrefix(c.Request.RequestURI, "/api") {
			indexFile, err := laclipasa.FrontendBuildFS.Open("frontend/build/index.html")
			if err != nil {
				fmt.Printf("err: %v\n", err)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			defer indexFile.Close()

			// will load assets via static.Serve at /
			c.DataFromReader(http.StatusOK, -1, "text/html", indexFile, nil)
		}
		// default 404 page not found
	})

	srv.Httpsrv = &http.Server{
		Handler: router,
		Addr:    conf.Address,
		// ReadTimeout:       10 * time.Second,
		ReadHeaderTimeout: 1 * time.Second,
		// WriteTimeout:      10 * time.Second,
		// IdleTimeout:       10 * time.Second,
	}

	return srv, nil
}

// Run configures a server and underlying services with the given configuration.
// NewServer takes its own config as is now.
func Run(env string) (<-chan error, error) {
	var err error

	if err = envvar.Load(env); err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeUnknown, "envvar.Load")
	}

	cfg := internal.Config

	logger, err := logger.NewZap()
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeUnknown, "logger.NewZap")
	}

	pool, sqlpool, err := postgresql.New(logger)
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeUnknown, "postgresql.New")
	}

	drv := entsql.OpenDB(dialect.Postgres, sqlpool)
	opts := []generated.Option{generated.Driver(drv), generated.Logger(logger), generated.DB(pool)}
	if cfg.AppEnv == internal.AppEnvDev {
		opts = append(opts, generated.Debug())
	}

	entClient := generated.NewClient(opts...)

	ctx := generated.NewContext(context.Background(), entClient)

	// acquire lock and migrate
	migrateUp(logger, pool)

	srv, err := NewServer(ctx, Config{
		Address: ":" + strings.TrimPrefix(cfg.APIPort, ":"),
		Pool:    pool,
		SQLPool: sqlpool,
		Logger:  logger,
	})
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeUnknown, "NewServer")
	}

	errC := make(chan error, 1)

	ctx, stop := signal.NotifyContext(ctx,
		os.Interrupt,
		syscall.SIGTERM,
		syscall.SIGQUIT)

	go func() {
		<-ctx.Done()

		logger.Info("Shutdown signal received")

		ctxTimeout, cancel := context.WithTimeout(context.Background(), 1*time.Second)

		// any action on shutdown must be deferred here and not in the main block
		defer func() {
			_ = logger.Sync()

			entClient.Close()
			pool.Close()
			// rmq.Close()
			stop()
			cancel()
			close(errC)
		}()

		srv.Httpsrv.SetKeepAlivesEnabled(false)

		if err := srv.Httpsrv.Shutdown(ctxTimeout); err != nil { //nolint: contextcheck
			errC <- err
		}

		logger.Info("Shutdown completed")
	}()

	go func() {
		logger.Infow("Starting server:", zap.String("address", cfg.APIPort), zap.String("env", env))

		// "ListenAndServe always returns a non-nil error. After Shutdown or Close, the returned error is
		// ErrServerClosed."
		var err error

		switch cfg.AppEnv {
		case internal.AppEnvDev, internal.AppEnvCI:
			err = srv.Httpsrv.ListenAndServeTLS("certificates/localhost.pem", "certificates/localhost-key.pem")
		case internal.AppEnvProd, internal.AppEnvE2E:
			err = srv.Httpsrv.ListenAndServe()
		default:
			err = fmt.Errorf("unknown APP_ENV: %s", env)
		}

		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			errC <- err
		}
	}()

	return errC, nil
}

func migrateUp(logger *zap.SugaredLogger, pool *pgxpool.Pool) {
	cfg := internal.Config
	dbName := cfg.Postgres.DB
	dsn := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(cfg.Postgres.User, cfg.Postgres.Password),
		Host:     net.JoinHostPort(cfg.Postgres.Server, cfg.Postgres.Port),
		Path:     dbName,
		RawQuery: "sslmode=disable",
	}

	migrationsLockID, _ := strconv.ParseInt(dbName, 10, 32)

	lock, err := postgresqlutils.NewAdvisoryLock(pool, int(migrationsLockID))
	if err != nil {
		panic(fmt.Sprintf("NewAdvisoryLock: %s\n", err))
	}
	acquired, err := lock.TryLock(context.Background())
	if err != nil {
		panic(fmt.Sprintf("lock.TryLock: %s\n", err))
	}
	if !acquired {
		logger.Warn("Couldn't acquire lock: %s\n", err)
		return
	}
	defer func() {
		for range 10 {
			if lock.Release() || !lock.IsLocked() {
				return
			}
		}
		lock.ReleaseConn() // does not guarantee lock release, hence the above.
	}()

	d, err := iofs.New(laclipasa.Migrations, "db/migrations")
	if err != nil {
		log.Fatalf("Couldn't create migration source: %s\n", err)
	}

	mMigrations, err := migrate.NewWithSourceInstance("iofs", d, dsn.String())
	if err != nil {
		log.Fatalf("Couldn't migrate (post-migrations): %s\n", err)
	}
	if err = mMigrations.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatalf("Couldnt' migrate up (migrations): %s\n", err)
	}

	v, dirty, _ := mMigrations.Version()
	logger.Infof("Migrations completed: %d (dirty=%v)", v, dirty)
}

func graphqlHandler(entClient *generated.Client) gin.HandlerFunc {
	// NewExecutableSchema and Config are in the generated.go file
	srv := handler.New(gql.NewExecutableSchema(gql.NewResolver(entClient)))

	srv.Use(entgql.Transactioner{
		TxOpener: entClient,
		// see https://entgo.io/docs/tutorial-todo-gql-tx-mutation for skipping tx based on ops, etc.
	})
	srv.Use(extension.FixedComplexityLimit(200))
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.MultipartForm{
		MaxMemory:     10 << 20,
		MaxUploadSize: 10 << 20,
	})
	srv.AddTransport(transport.Websocket{
		KeepAlivePingInterval: 10 * time.Second,
	})

	/**
	 * SSE via gqlgen: https://gqlgen.com/recipes/subscriptions/#adding-server-sent-events-transport
	 *  				 and https://github.com/enisdenjo/graphql-sse
	 */
	// srv.AddTransport(transport.SSE{})

	srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))

	srv.Use(extension.Introspection{})
	srv.Use(extension.AutomaticPersistedQuery{
		Cache: lru.New[string](100),
	})

	return func(c *gin.Context) {
		srv.ServeHTTP(c.Writer, c.Request)
	}
}

const ginCtxKey = "GinContextKey" // no type so we can use in different pkgs - else key differs with raw string. prevents circular import.

// GinContext returns the gin context from the request context.
func GinContextFromCtx(ctx context.Context) (*gin.Context, error) {
	ginCtx, ok := ctx.Value(ginCtxKey).(*gin.Context)
	if !ok {
		return nil, fmt.Errorf("failed to get gin context from request context")
	}
	return ginCtx, nil
}

/** frontend build */
type staticFileSystem struct {
	httpFs http.FileSystem
}

func newStaticFileSystem() *staticFileSystem {
	sub, err := fs.Sub(laclipasa.FrontendBuildFS, "frontend/build")
	if err != nil {
		panic(err)
	}

	return &staticFileSystem{
		httpFs: http.FS(sub), // Convert fs.FS to http.FileSystem
	}
}

func (s *staticFileSystem) Open(name string) (http.File, error) {
	return s.httpFs.Open(strings.TrimPrefix(name, "/"))
}

func (s *staticFileSystem) Exists(prefix string, path string) bool {
	cleanPath := strings.TrimPrefix(path, prefix)
	cleanPath = strings.TrimPrefix(cleanPath, "/")

	f, err := s.httpFs.Open(cleanPath)
	if err != nil {
		// Check if directory with index.html exists
		if entries, err := fs.ReadDir(laclipasa.FrontendBuildFS, filepath.Join("frontend/build", cleanPath)); err == nil {
			for _, entry := range entries {
				if entry.Name() == "index.html" {
					return true
				}
			}
		}
		return false
	}
	defer f.Close()

	return true
}
