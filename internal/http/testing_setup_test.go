package http_test

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	"github.com/caliecode/la-clipasa/internal/testutil"

	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var (
	testPool    *pgxpool.Pool
	testSQLPool *sql.DB // for jet, use .Sql() to use pgx directly
)

func TestMain(m *testing.M) {
	os.Exit(testMain(m))
}

func testMain(m *testing.M) int {
	testutil.Setup()

	// call flag.Parse() here if TestMain uses flags
	var err error

	// we may modify env config for the package tests if required
	// internal.Config... = ...

	testPool, testSQLPool, err = testutil.NewDB(testutil.WithMigrations())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Couldn't create testPool: %s\n", err)
		os.Exit(1)
	}

	defer testPool.Close()

	return m.Run()
}
