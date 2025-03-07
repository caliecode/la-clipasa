//go:build ignore

package main

import (
	"context"
	"log"
	"net"
	"net/url"
	"os"

	_ "github.com/lib/pq"

	_ "github.com/caliecode/la-clipasa/internal/ent/generated/runtime"

	atlas "ariga.io/atlas/sql/migrate"
	"ariga.io/atlas/sql/sqltool"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/sql/schema"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated/migrate"
	"github.com/caliecode/la-clipasa/internal/envvar"
)

// Usage: go run -mod=mod ent/migrate/main.go <name>
// Generates a migration diff file for golang-migrate.
func main() {
	// this is used only in dev mode to generate versioned migration files.
	if err := envvar.Load(".env.dev"); err != nil {
		log.Fatalf("failed loading .env.dev file: %v", err)
	}
	if err := internal.NewAppConfig(); err != nil {
		log.Fatalf("failed loading app config: %v", err)
	}
	cfg := internal.Config

	ctx := context.Background()
	// Create a local migration directory able to understand golang-migrate migration file format for replay.
	dir, err := sqltool.NewGolangMigrateDir("db/migrations")
	if err != nil {
		log.Fatalf("failed creating atlas migration directory: %v", err)
	}
	// Migrate diff options.
	opts := []schema.MigrateOption{
		schema.WithDir(dir), // migration directory
		schema.WithMigrationMode(schema.ModeReplay),
		schema.WithDialect(dialect.Postgres),
		schema.WithDropColumn(true),
		schema.WithDropIndex(true),
		schema.WithFormatter(atlas.DefaultFormatter),
	}
	if len(os.Args) != 2 {
		log.Fatalln("migration name is required. Usage: 'go run -mod=mod ent/migrate/main.go <name>'")
	}

	dsn := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.Postgres.User, cfg.Postgres.Password),
		Host:   net.JoinHostPort(cfg.Postgres.Server, cfg.Postgres.Port),
		Path:   os.Getenv("GEN_POSTGRES_DB"), // for replay mode we just need an empty db
	}

	err = migrate.NamedDiff(ctx, dsn.String()+"?sslmode=disable", os.Args[1], opts...)
	if err != nil {
		log.Fatalf("failed generating migration file: %v", err)
	}
}
