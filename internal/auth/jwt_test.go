package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func init() {
	InitJWT("test-secret-key")
}

func TestGenerateAndValidateToken(t *testing.T) {
	uid := uuid.New()
	token, expiresAt, err := GenerateToken(uid)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	if token == "" {
		t.Fatal("expected non-empty token")
	}

	if expiresAt.Before(time.Now()) {
		t.Error("expiresAt should be in the future")
	}

	claims, err := ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.UserID != uid {
		t.Errorf("expected user_id %v, got %v", uid, claims.UserID)
	}
}

func TestValidateInvalidToken(t *testing.T) {
	_, err := ValidateToken("invalid-token")
	if err == nil {
		t.Error("expected error for invalid token")
	}
}

func TestValidateWrongSecret(t *testing.T) {
	InitJWT("other-secret")
	uid := uuid.New()
	token, _, err := GenerateToken(uid)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	InitJWT("different-secret")
	_, err = ValidateToken(token)
	if err == nil {
		t.Error("expected error when validating with wrong secret")
	}

	InitJWT("test-secret-key")
}

func TestHashSDKKey_Deterministic(t *testing.T) {
	h1 := HashSDKKey("my-sdk-key")
	h2 := HashSDKKey("my-sdk-key")
	if h1 != h2 {
		t.Error("hash must be deterministic")
	}
}

func TestHashSDKKey_DifferentKeys(t *testing.T) {
	h1 := HashSDKKey("key-1")
	h2 := HashSDKKey("key-2")
	if h1 == h2 {
		t.Error("different keys must produce different hashes")
	}
}

func TestHashSDKKey_NotEmpty(t *testing.T) {
	h := HashSDKKey("any-key")
	if h == "" {
		t.Error("hash must not be empty")
	}
}
