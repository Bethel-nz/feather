#!/usr/bin/env bash
#
# Seed the feather database with a demo user, project, and the dashboard flags.
# Idempotent: safe to run repeatedly. Talks straight to Postgres (no gRPC).
#
# Usage:  ./scripts/seed.sh
# Env overrides: CONTAINER, DB, DB_USER, DEMO_EMAIL, DEMO_PASSWORD
set -euo pipefail

CONTAINER="${CONTAINER:-feather-postgres}"
DB="${DB:-feather}"
DB_USER="${DB_USER:-postgres}"
DEMO_EMAIL="${DEMO_EMAIL:-demo@feather.dev}"
DEMO_PASSWORD="${DEMO_PASSWORD:-demo-pass}"
DEMO_SDK_KEY="${DEMO_SDK_KEY:-demo-sdk-key}"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# --- preflight -------------------------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "✗ postgres container '$CONTAINER' is not running." >&2
  echo "  start it, e.g.: docker start $CONTAINER" >&2
  exit 1
fi

echo "› waiting for postgres…"
until docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB" >/dev/null 2>&1; do
  sleep 1
done

# --- generate hashes using the project's own crypto ------------------------
# password_hash = bcrypt(DEMO_PASSWORD); sdk_key_hash = HMAC-SHA256 of the key
# with the same salt the auth package uses (internal/auth/jwt.go).
echo "› generating password + sdk-key hashes…"
HASHGEN_DIR="$(mktemp -d "$REPO/.hashgen.XXXXXX")"
trap 'rm -rf "$HASHGEN_DIR"' EXIT
cat > "$HASHGEN_DIR/main.go" <<'GO'
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	ph, err := bcrypt.GenerateFromPassword([]byte(os.Getenv("DEMO_PASSWORD")), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	h := hmac.New(sha256.New, []byte("feather-sdk-key-salt"))
	h.Write([]byte(os.Getenv("DEMO_SDK_KEY")))
	fmt.Printf("%s\n%s\n", string(ph), hex.EncodeToString(h.Sum(nil)))
}
GO
HASHES="$(cd "$REPO" && DEMO_PASSWORD="$DEMO_PASSWORD" DEMO_SDK_KEY="$DEMO_SDK_KEY" go run "$HASHGEN_DIR/main.go")"
PASS_HASH="$(printf '%s\n' "$HASHES" | sed -n '1p')"
SDK_HASH="$(printf '%s\n' "$HASHES" | sed -n '2p')"

# --- seed ------------------------------------------------------------------
echo "› seeding user, project, and flags…"
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB" \
  -v ON_ERROR_STOP=1 \
  -v email="$DEMO_EMAIL" \
  -v phash="$PASS_HASH" \
  -v sdkhash="$SDK_HASH" <<'SQL'
WITH u AS (
    INSERT INTO users (email, password_hash)
    VALUES (:'email', :'phash')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id
), new_p AS (
    -- create a project only if this user has none yet
    INSERT INTO projects (owner_id, name, sdk_key_hash)
    SELECT u.id, 'Default', :'sdkhash'
    FROM u
    WHERE NOT EXISTS (SELECT 1 FROM projects WHERE owner_id = u.id)
    RETURNING id
), proj AS (
    SELECT id FROM new_p
    UNION ALL
    SELECT id FROM projects WHERE owner_id = (SELECT id FROM u)
    LIMIT 1
)
INSERT INTO flags (project_id, key, description, enabled, rollout_percentage)
SELECT proj.id, f.key, f.descr, true, f.pct
FROM proj, (VALUES
    ('advanced-analytics', 'Charts & analytics panel', 40),
    ('data-export',        'Export CSV button',        60),
    ('ai-insights',        'Beta AI summary card',     30),
    ('dark-mode',          'Dark theme',               50)
) AS f(key, descr, pct)
ON CONFLICT (project_id, key) DO UPDATE
    SET enabled            = EXCLUDED.enabled,
        rollout_percentage = EXCLUDED.rollout_percentage,
        updated_at         = now();
SQL

echo "› done. flags now in the database:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB" -tA \
  -c "SELECT key, enabled, rollout_percentage FROM flags ORDER BY key;"

cat <<EOF

✓ Seeded.
  Login:    $DEMO_EMAIL / $DEMO_PASSWORD
  Admin:    http://localhost:3000  (lists & controls these flags)
  The demo dashboard will now show features per user id.
EOF
