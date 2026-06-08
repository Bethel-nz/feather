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
- Postgres 16 on localhost:5432
- Bun

### 1. Database

```bash
psql postgres://postgres:password@localhost:5432/feather < internal/postgres/schema.sql
```

### 2. Backend services

```bash
# Terminal 1 — Auth service
go run ./cmd/auth-service

# Terminal 2 — Flag service
go run ./cmd/flag-service
```

### 3. Frontend

```bash
cd frontend && bun dev
```

Open http://localhost:3000. Auto-creates a demo user on first load.

### 4. Demo app

```bash
cd demo && bun dev
```

Open http://localhost:5173. Collaborative music player (Feather Rooms) consuming the flag service over HTTP.

## How It Works

- `sha256(flagKey + ":" + contextKey) % 100` — deterministic bucket, same inputs always produce same result
- JWT authorises management calls (create, toggle, rollout, delete)
- SDK key authorises the hot-path `Evaluate` RPC and HTTP `/evaluate` endpoint
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
├── demo/                 # Vite demo (Feather Rooms)
│   ├── feature-flags/    # SDK used by demo
│   └── src/              # app
├── docker/               # Dockerfiles
└── scripts/              # seed.sh
```
