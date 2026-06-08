package flag

import (
	"strings"
	"testing"
)

func TestEvaluateFlag_Disabled(t *testing.T) {
	enabled, reason := EvaluateFlag(false, 100, "test-flag", "user-1")
	if enabled {
		t.Error("expected disabled flag to return false")
	}
	if reason != "flag disabled" {
		t.Errorf("expected 'flag disabled', got %q", reason)
	}
}

func TestEvaluateFlag_HundredPercentRollout(t *testing.T) {
	enabled, reason := EvaluateFlag(true, 100, "test-flag", "user-1")
	if !enabled {
		t.Error("expected 100% rollout to return true")
	}
	if reason != "100% rollout — everyone on" {
		t.Errorf("expected '100%% rollout', got %q", reason)
	}
}

func TestEvaluateFlag_ZeroPercentRollout(t *testing.T) {
	enabled, reason := EvaluateFlag(true, 0, "test-flag", "user-1")
	if enabled {
		t.Error("expected 0% rollout to return false")
	}
	if reason != "0% rollout — everyone off" {
		t.Errorf("expected '0%% rollout', got %q", reason)
	}
}

func TestEvaluateFlag_Deterministic(t *testing.T) {
	r1, _ := EvaluateFlag(true, 50, "my-flag", "alice")
	r2, _ := EvaluateFlag(true, 50, "my-flag", "alice")
	if r1 != r2 {
		t.Error("same inputs must produce same output")
	}
}

func TestEvaluateFlag_DifferentContextsGetDifferentBuckets(t *testing.T) {
	results := make(map[bool]int)
	for i := 0; i < 100; i++ {
		ctx := "user-" + strings.Repeat("x", i)
		enabled, _ := EvaluateFlag(true, 50, "test-flag", ctx)
		results[enabled]++
	}
	if results[true] == 0 || results[false] == 0 {
		t.Errorf("expected mix of true/false with 50%% rollout, got %v", results)
	}
}

func TestEvaluateFlag_BucketBoundary(t *testing.T) {
	tests := []struct {
		rollout int16
		context string
		want    bool
	}{
		{0, "anyone", false},
		{100, "anyone", true},
	}

	for _, tc := range tests {
		got, _ := EvaluateFlag(true, tc.rollout, "boundary-flag", tc.context)
		if got != tc.want {
			t.Errorf("rollout=%d, context=%q: got %v, want %v", tc.rollout, tc.context, got, tc.want)
		}
	}
}

func TestBucket_ProducesInRange(t *testing.T) {
	for i := 0; i < 1000; i++ {
		b := bucket("flag", "context", 100)
		if b < 0 || b >= 100 {
			t.Fatalf("bucket out of range: %d", b)
		}
	}
}

func TestEvaluateFlag_ReasonFormat(t *testing.T) {
	_, reason := EvaluateFlag(true, 60, "my-flag", "some-user")
	if !strings.HasPrefix(reason, "in rollout bucket (") &&
		!strings.HasPrefix(reason, "out of rollout bucket (") {
		t.Errorf("unexpected reason format: %q", reason)
	}

	_, reason = EvaluateFlag(true, 10, "my-flag", "some-user")
	if !strings.HasPrefix(reason, "in rollout bucket (") &&
		!strings.HasPrefix(reason, "out of rollout bucket (") {
		t.Errorf("unexpected reason format: %q", reason)
	}
}
