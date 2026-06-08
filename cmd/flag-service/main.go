package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/Bethel-nz/feather/proto/feather/v1"
	"github.com/Bethel-nz/feather/internal/auth"
	"github.com/Bethel-nz/feather/internal/flag"
	"github.com/Bethel-nz/feather/internal/postgres"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "50052"
	}
	httpPort := os.Getenv("HTTP_PORT")
	if httpPort == "" {
		httpPort = "8080"
	}
	devMode := os.Getenv("DEV_MODE") == "true"

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		if !devMode {
			log.Fatal("DATABASE_URL is required (set DEV_MODE=true to use local defaults)")
		}
		dsn = "postgres://postgres:password@localhost:5432/feather?sslmode=disable"
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if !devMode {
			log.Fatal("JWT_SECRET is required (set DEV_MODE=true to use local defaults)")
		}
		jwtSecret = "feather-dev-secret-do-not-use-in-production"
	}
	auth.InitJWT(jwtSecret)

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	defer pool.Close()

	q := postgres.New(pool)

	httpLis, err := net.Listen("tcp", fmt.Sprintf(":%s", httpPort))
	if err != nil {
		log.Fatalf("failed to listen HTTP: %v", err)
	}
	go func() {
		log.Printf("HTTP evaluate endpoint on :%s (devMode=%v)", httpPort, devMode)
		if err := http.Serve(httpLis, flag.NewHTTPHandler(q, devMode)); err != nil {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	interceptor := flag.NewInterceptor(q)

	srv := grpc.NewServer(
		grpc.UnaryInterceptor(interceptor.Unary()),
	)
	flagv1.RegisterFlagServiceServer(srv, flag.NewFlagServer(q))
	reflection.Register(srv)

	log.Printf("flag service (gRPC) listening on :%s", port)
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
