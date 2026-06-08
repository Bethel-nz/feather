package auth

import (
	"context"
	"testing"

	"github.com/google/uuid"

	flagv1 "github.com/Bethel-nz/feather/proto/feather/v1"
	"github.com/Bethel-nz/feather/internal/postgres"
)

func uniqueEmail() string {
	return uuid.New().String() + "@test.feather"
}

func TestAuthServer_SignUpAndLogin(t *testing.T) {
	q := postgres.NewTestQueries(t)
	srv := NewAuthServer(q)

	ctx := context.Background()

	email := uniqueEmail()
	resp, err := srv.SignUp(ctx, &flagv1.SignUpRequest{
		Email:    email,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}

	if resp.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
	if resp.UserId == "" {
		t.Error("expected non-empty user id")
	}
	if resp.SdkKey == "" {
		t.Error("expected non-empty SDK key")
	}

	loginResp, err := srv.LogIn(ctx, &flagv1.LogInRequest{
		Email:    email,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("LogIn failed: %v", err)
	}

	if loginResp.AccessToken == "" {
		t.Error("expected non-empty access token on login")
	}
	if loginResp.SdkKey != "" {
		t.Error("expected empty SDK key on login (only returned at signup)")
	}
	if loginResp.UserId != resp.UserId {
		t.Errorf("expected user_id %q, got %q", resp.UserId, loginResp.UserId)
	}
}

func TestAuthServer_SignUpDuplicateEmail(t *testing.T) {
	q := postgres.NewTestQueries(t)
	srv := NewAuthServer(q)

	ctx := context.Background()

	email := uniqueEmail()
	_, err := srv.SignUp(ctx, &flagv1.SignUpRequest{
		Email:    email,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("first SignUp failed: %v", err)
	}

	_, err = srv.SignUp(ctx, &flagv1.SignUpRequest{
		Email:    email,
		Password: "otherpass",
	})
	if err == nil {
		t.Error("expected error for duplicate email")
	}
}

func TestAuthServer_LoginWrongPassword(t *testing.T) {
	q := postgres.NewTestQueries(t)
	srv := NewAuthServer(q)

	ctx := context.Background()

	email := uniqueEmail()
	_, err := srv.SignUp(ctx, &flagv1.SignUpRequest{
		Email:    email,
		Password: "correct",
	})
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}

	_, err = srv.LogIn(ctx, &flagv1.LogInRequest{
		Email:    email,
		Password: "wrong",
	})
	if err == nil {
		t.Error("expected error for wrong password")
	}
}

func TestAuthServer_ValidateToken(t *testing.T) {
	q := postgres.NewTestQueries(t)
	srv := NewAuthServer(q)

	ctx := context.Background()

	signUpResp, err := srv.SignUp(ctx, &flagv1.SignUpRequest{
		Email:    uniqueEmail(),
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}

	valResp, err := srv.ValidateToken(ctx, &flagv1.ValidateTokenRequest{
		AccessToken: signUpResp.AccessToken,
	})
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if !valResp.Valid {
		t.Error("expected valid token")
	}
	if valResp.UserId != signUpResp.UserId {
		t.Errorf("expected user_id %q, got %q", signUpResp.UserId, valResp.UserId)
	}

	valResp, err = srv.ValidateToken(ctx, &flagv1.ValidateTokenRequest{
		AccessToken: "invalid-token",
	})
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if valResp.Valid {
		t.Error("expected invalid token to be rejected")
	}
}
