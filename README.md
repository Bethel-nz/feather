# Feather — Deterministic Feature-Flag Service

gRPC feature-flag service with Postgres, JWT auth, SDK-key evaluation, and a Next.js admin dashboard.

## Architecture

```
┌─────────────┐     gRPC      ┌──────────────┐
│  Auth Service │◄────────────│  Flag Service  │
│   :50051      │              │   :50052       │
└──────┬───────┘              └──────┬─────────┘
       │                             │
       └──────────Postgres───────────┘
                ▲
                │  server actions (gRPC)
       ┌────────┴────────┐
       │  Next.js Frontend │
       │   localhost:3000   │
       └──────────────────┘
```

## Stack

| Layer | Technology |
|-------|-----------|
| API | gRPC (protobuf) |
| Backend | Go, sqlc, pgx v5 |
| Database | Postgres 16 |
| Frontend | Next.js, Tailwind v4, Motion, Lucide |

## Getting Started

### Prerequisites

- Go
- Docker (runs Postgres 16)
- Bun

### 1. Database

Run Postgres in a container named `feather-postgres` (the default
`DATABASE_URL` and `scripts/seed.sh` both expect this), then load the schema:

```bash
docker run -d --name feather-postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=feather \
  -p 5432:5432 postgres:16-alpine

docker exec -i feather-postgres psql -U postgres -d feather < internal/postgres/schema.sql
```

### 2. Backend services

```bash
# Terminal 1 — Auth service
DEV_MODE=true go run ./cmd/auth-service

# Terminal 2 — Flag service
DEV_MODE=true go run ./cmd/flag-service
```

### 3. Seed demo data (optional)

```bash
./scripts/seed.sh
```

Creates the `demo@feather.dev` / `demo-pass` user, its project, and the four
dashboard flags (`advanced-analytics`, `data-export`, `ai-insights`,
`dark-mode`) straight in Postgres — so the demo app has flags to show without
clicking through the admin. Idempotent, safe to re-run.

Assumes Postgres is running in a Docker container named `feather-postgres`
(override with `CONTAINER=…`, or `DEMO_EMAIL` / `DEMO_PASSWORD` / `DEMO_SDK_KEY`
to change the seeded values). Requires Go on `PATH` (it generates the bcrypt +
SDK-key hashes using the project's own crypto).

### 4. Frontend

```bash
cd frontend && bun install && bun dev
```

Open http://localhost:3000. Auto-creates the demo user on first load if you skipped the seed.

### 5. Demo app

```bash
cd demo && bun install && bun dev
```

Open http://localhost:5173. An "Acme Analytics" dashboard whose sections are gated by flags: it polls `GET /features?context_key=<user>` every 3s (via TanStack Query) and renders only the features enabled for the current user. Switch user ids in the bottom-left simulator to watch rollouts change live.

## How It Works

- `sha256(flagKey + ":" + contextKey) % 100` — deterministic bucket, same inputs always produce same result
- JWT authorises management calls (create, toggle, rollout, delete)
- SDK key authorises the hot-path `Evaluate` RPC and the HTTP `/evaluate` (single flag) and `/features` (all enabled flags for a user, in one request) endpoints
- `DEV_MODE=true` falls back to `GetFirstProject` so the demo works without copying SDK keys

## Project Structure

```
feather/
├── proto/feather/v1/     # .proto + generated Go code (single source of truth)
├── cmd/
│   ├── auth-service/     # entry: gRPC :50051
│   └── flag-service/     # entry: gRPC :50052 + HTTP :8080
├── internal/
│   ├── auth/             # JWT, signup, login
│   ├── flag/             # CRUD, eval, interceptor, HTTP handler
│   └── postgres/         # schema, queries, sqlc Go
├── frontend/             # Next.js admin dashboard
│   ├── actions/          # server actions (gRPC clients)
│   ├── components/       # flag-card, switch, slider, bucket-grid, etc.
│   └── app/              # pages
├── demo/                 # Vite demo (Acme Analytics dashboard)
│   ├── feature-flags/    # SDK used by demo
│   └── src/              # app
├── docker/               # Dockerfiles
└── scripts/              # seed.sh
```
