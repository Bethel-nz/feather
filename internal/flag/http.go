package flag

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Bethel-nz/feather/internal/auth"
	"github.com/Bethel-nz/feather/internal/postgres"
)

type evaluateRequest struct {
	Key        string `json:"key"`
	ContextKey string `json:"context_key"`
}

type evaluateResponse struct {
	Enabled bool   `json:"enabled"`
	Reason  string `json:"reason"`
}

type featuresResponse struct {
	Features []string `json:"features"`
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func resolveProject(w http.ResponseWriter, r *http.Request, q *postgres.Queries, devMode bool) (postgres.Project, bool) {
	token := ""
	if ah := r.Header.Get("Authorization"); strings.HasPrefix(ah, "Bearer ") {
		token = strings.TrimPrefix(ah, "Bearer ")
	}

	if token != "" {
		p, err := q.GetProjectBySDKKeyHash(r.Context(), auth.HashSDKKey(token))
		if err != nil {
			http.Error(w, "invalid SDK key", http.StatusUnauthorized)
			return postgres.Project{}, false
		}
		return p, true
	}

	if devMode {
		// DEV ONLY: unauthenticated fallback for local demo; never enable in prod.
		p, err := q.GetFirstProject(r.Context())
		if err != nil {
			http.Error(w, "no project found — create one first", http.StatusNotFound)
			return postgres.Project{}, false
		}
		return p, true
	}

	http.Error(w, "missing authorization", http.StatusUnauthorized)
	return postgres.Project{}, false
}

func NewHTTPHandler(q *postgres.Queries, devMode bool) http.Handler {
	mux := http.NewServeMux()

	// Single-flag evaluation.
	mux.HandleFunc("POST /evaluate", func(w http.ResponseWriter, r *http.Request) {
		var req evaluateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		project, ok := resolveProject(w, r, q, devMode)
		if !ok {
			return
		}

		dbFlag, err := q.GetFlagByKey(r.Context(), postgres.GetFlagByKeyParams{
			ProjectID: project.ID,
			Key:       req.Key,
		})
		if err != nil {
			writeJSON(w, evaluateResponse{Enabled: false, Reason: "flag not found"})
			return
		}

		enabled, reason := EvaluateFlag(dbFlag.Enabled, dbFlag.RolloutPercentage, req.Key, req.ContextKey)
		writeJSON(w, evaluateResponse{Enabled: enabled, Reason: reason})
	})

	// Bulk: all features enabled for a given user (context_key).
	mux.HandleFunc("GET /features", func(w http.ResponseWriter, r *http.Request) {
		contextKey := r.URL.Query().Get("context_key")

		project, ok := resolveProject(w, r, q, devMode)
		if !ok {
			return
		}

		flags, err := q.ListFlagsByProject(r.Context(), project.ID)
		if err != nil {
			http.Error(w, "failed to list flags", http.StatusInternalServerError)
			return
		}

		features := []string{}
		for _, f := range flags {
			if enabled, _ := EvaluateFlag(f.Enabled, f.RolloutPercentage, f.Key, contextKey); enabled {
				features = append(features, f.Key)
			}
		}

		writeJSON(w, featuresResponse{Features: features})
	})

	return cors(mux)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
