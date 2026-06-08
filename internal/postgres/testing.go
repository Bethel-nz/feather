package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestDB(t *testing.T) *pgxpool.Pool {
	dsn := os.Getenv("FEATHER_TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://feather:feather@localhost:5432/feather?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Skipf("no test database available: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		t.Skipf("test database not reachable: %v", err)
	}
	return pool
}

func NewTestQueries(t *testing.T) *Queries {
	pool := TestDB(t)

	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("failed to begin transaction: %v", err)
	}

	t.Cleanup(func() {
		_ = tx.Rollback(ctx)
	})

	return &Queries{db: tx}
}
