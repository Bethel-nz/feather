package flag

import (
	"context"
	"testing"

	"github.com/Bethel-nz/feather/internal/auth"
	"github.com/Bethel-nz/feather/internal/postgres"
	"github.com/google/uuid"

	flagv1 "github.com/Bethel-nz/feather/proto/feather/v1"
)

func setupFlagServer(t *testing.T) (*FlagServer, string, uuid.UUID) {
	t.Helper()
	auth.InitJWT("test-secret")

	q := postgres.NewTestQueries(t)
	srv := NewFlagServer(q)

	ctx := context.Background()

	user, err := q.CreateUser(ctx, postgres.CreateUserParams{
		Email:        "flag-test-" + uuid.New().String() + "@feather.test",
		PasswordHash: "hash",
	})
	if err != nil {
		t.Fatalf("CreateUser failed: %v", err)
	}

	err = q.CreateProject(ctx, postgres.CreateProjectParams{
		OwnerID:    user.ID,
		Name:       "Test Project",
		SdkKeyHash: auth.HashSDKKey("test-sdk-key"),
	})
	if err != nil {
		t.Fatalf("CreateProject failed: %v", err)
	}

	project, err := q.GetProjectByOwnerID(ctx, user.ID)
	if err != nil {
		t.Fatalf("GetProjectByOwnerID failed: %v", err)
	}
	projectID := postgres.ToUUID(project.ID)

	uid := postgres.ToUUID(user.ID)
	token, _, err := auth.GenerateToken(uid)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	return srv, token, projectID
}

func ctxWithProjectID(projectID uuid.UUID) context.Context {
	return context.WithValue(context.Background(), ctxProjectID, projectID)
}

func TestFlagServer_CreateAndListFlags(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	created, err := srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{
		Key:               "new-feature",
		Description:       "A test feature flag",
		Enabled:           true,
		RolloutPercentage: 50,
	})
	if err != nil {
		t.Fatalf("CreateFlag failed: %v", err)
	}

	if created.Key != "new-feature" {
		t.Errorf("expected key 'new-feature', got %q", created.Key)
	}
	if !created.Enabled {
		t.Error("expected flag to be enabled")
	}
	if created.RolloutPercentage != 50 {
		t.Errorf("expected rollout 50, got %d", created.RolloutPercentage)
	}

	list, err := srv.ListFlags(ctx, &flagv1.ListFlagsRequest{})
	if err != nil {
		t.Fatalf("ListFlags failed: %v", err)
	}

	if len(list.Flags) != 1 {
		t.Fatalf("expected 1 flag, got %d", len(list.Flags))
	}
	if list.Flags[0].Key != "new-feature" {
		t.Errorf("expected key 'new-feature', got %q", list.Flags[0].Key)
	}
}

func TestFlagServer_ToggleFlag(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	_, err := srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{
		Key:     "toggle-me",
		Enabled: false,
	})
	if err != nil {
		t.Fatalf("CreateFlag failed: %v", err)
	}

	toggled, err := srv.ToggleFlag(ctx, &flagv1.ToggleFlagRequest{
		Key:     "toggle-me",
		Enabled: true,
	})
	if err != nil {
		t.Fatalf("ToggleFlag failed: %v", err)
	}

	if !toggled.Enabled {
		t.Error("expected flag to be enabled after toggle")
	}
}

func TestFlagServer_UpdateRollout(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	_, err := srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{
		Key:               "rollout-me",
		Enabled:           true,
		RolloutPercentage: 0,
	})
	if err != nil {
		t.Fatalf("CreateFlag failed: %v", err)
	}

	updated, err := srv.UpdateRollout(ctx, &flagv1.UpdateRolloutRequest{
		Key:               "rollout-me",
		RolloutPercentage: 75,
	})
	if err != nil {
		t.Fatalf("UpdateRollout failed: %v", err)
	}

	if updated.RolloutPercentage != 75 {
		t.Errorf("expected rollout 75, got %d", updated.RolloutPercentage)
	}
}

func TestFlagServer_DeleteFlag(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	_, err := srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{
		Key:     "delete-me",
		Enabled: false,
	})
	if err != nil {
		t.Fatalf("CreateFlag failed: %v", err)
	}

	del, err := srv.DeleteFlag(ctx, &flagv1.DeleteFlagRequest{Key: "delete-me"})
	if err != nil {
		t.Fatalf("DeleteFlag failed: %v", err)
	}

	if !del.Deleted {
		t.Error("expected deleted to be true")
	}

	list, err := srv.ListFlags(ctx, &flagv1.ListFlagsRequest{})
	if err != nil {
		t.Fatalf("ListFlags failed: %v", err)
	}

	if len(list.Flags) != 0 {
		t.Errorf("expected 0 flags after delete, got %d", len(list.Flags))
	}
}

func TestFlagServer_DeleteNonExistentFlag(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	resp, err := srv.DeleteFlag(ctx, &flagv1.DeleteFlagRequest{Key: "does-not-exist"})
	if err != nil {
		t.Fatalf("DeleteFlag failed: %v", err)
	}
	if resp.Deleted {
		t.Error("expected deleted to be false for non-existent flag")
	}
}

func TestFlagServer_EvaluateFlagNotFound(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	resp, err := srv.Evaluate(ctx, &flagv1.EvaluateRequest{
		Key:        "non-existent",
		ContextKey: "user-1",
	})
	if err != nil {
		t.Fatalf("Evaluate failed: %v", err)
	}

	if resp.Enabled {
		t.Error("expected non-existent flag to be disabled")
	}
	if resp.Reason != "flag not found" {
		t.Errorf("expected 'flag not found', got %q", resp.Reason)
	}
}

func TestFlagServer_EvaluateFlagDisabled(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	_, err := srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{
		Key:     "disabled-flag",
		Enabled: false,
	})
	if err != nil {
		t.Fatalf("CreateFlag failed: %v", err)
	}

	resp, err := srv.Evaluate(ctx, &flagv1.EvaluateRequest{
		Key:        "disabled-flag",
		ContextKey: "user-1",
	})
	if err != nil {
		t.Fatalf("Evaluate failed: %v", err)
	}

	if resp.Enabled {
		t.Error("expected disabled flag to return false")
	}
	if resp.Reason != "flag disabled" {
		t.Errorf("expected 'flag disabled', got %q", resp.Reason)
	}
}

func TestFlagServer_EvaluateFlagHundredPercent(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	_, err := srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{
		Key:               "full-rollout",
		Enabled:           true,
		RolloutPercentage: 100,
	})
	if err != nil {
		t.Fatalf("CreateFlag failed: %v", err)
	}

	resp, err := srv.Evaluate(ctx, &flagv1.EvaluateRequest{
		Key:        "full-rollout",
		ContextKey: "any-user",
	})
	if err != nil {
		t.Fatalf("Evaluate failed: %v", err)
	}

	if !resp.Enabled {
		t.Error("expected 100%% rollout to return true")
	}
}

func TestFlagServer_EvaluateDeterministic(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	_, err := srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{
		Key:               "deterministic",
		Enabled:           true,
		RolloutPercentage: 50,
	})
	if err != nil {
		t.Fatalf("CreateFlag failed: %v", err)
	}

	r1, _ := srv.Evaluate(ctx, &flagv1.EvaluateRequest{Key: "deterministic", ContextKey: "alice"})
	r2, _ := srv.Evaluate(ctx, &flagv1.EvaluateRequest{Key: "deterministic", ContextKey: "alice"})

	if r1.Enabled != r2.Enabled {
		t.Error("evaluation must be deterministic for same context")
	}
}

func TestFlagServer_CreateDuplicateFlag(t *testing.T) {
	srv, token, projectID := setupFlagServer(t)
	ctx := ctxWithProjectID(projectID)
	_ = token

	_, err := srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{Key: "dup"})
	if err != nil {
		t.Fatalf("first CreateFlag failed: %v", err)
	}

	_, err = srv.CreateFlag(ctx, &flagv1.CreateFlagRequest{Key: "dup"})
	if err == nil {
		t.Error("expected error for duplicate flag key")
	}
}
