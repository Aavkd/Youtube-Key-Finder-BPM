# Key Finder

Import instrumentals from YouTube, analyze **BPM + musical key** (with
confidence, alternatives, and manual correction), store them in a **library**,
and re-download them with a `[BPM][Key] Title` filename. The signature UX is a
**glassmorphism** UI whose visuals are driven by a track's mood (BPM + key),
centered on a **Player** page.

See [`SPECIFICATION.md`](./SPECIFICATION.md) for the full design and
[`ROADMAP.md`](./ROADMAP.md) for the phased build plan.

---

## Architecture

Fully Dockerized — one dedicated container per service, on one Compose network:

| Service    | Stack                                   | Port |
|------------|-----------------------------------------|------|
| `frontend` | Next.js (App Router) + TS + Tailwind    | 3000 |
| `backend`  | FastAPI (REST + SSE)                     | 8000 |
| `worker`   | yt-dlp + ffmpeg + Essentia/librosa      | —    |
| `db`       | PostgreSQL 16 (named volume)            | 5432 |

`backend` and `worker` are **separate containers** (heavy analysis never blocks
the API, D36). Audio is stored in a **named volume** shared by `backend` and
`worker`. The job queue is **Postgres-backed** in v1.

```
/frontend            # Next.js app
/backend             # FastAPI app (API)
/worker              # worker process (download/convert/analyze)
/shared              # generated shared schemas/types (OpenAPI)
docker-compose.yml
.env.example
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2

## Quick start

```bash
# 1. Configure environment
cp .env.example .env        # (Windows: copy .env.example .env)

# 2. Build and start the whole stack
docker compose up --build
```

Then open:

- **Frontend**: http://localhost:3000
- **Backend health**: http://localhost:8000/api/health
- **API docs (OpenAPI)**: http://localhost:8000/docs

Stop with `Ctrl+C`; tear down with `docker compose down` (add `-v` to also
remove the database + audio volumes).

---

## Environment variables

All variables live in `.env` (see `.env.example`):

| Variable                   | Default                        | Purpose                                   |
|----------------------------|--------------------------------|-------------------------------------------|
| `DATABASE_URL`             | `postgresql+asyncpg://…/db`    | Postgres connection (backend + worker)    |
| `AUDIO_STORAGE_PATH`       | `/data/audio`                  | Shared audio volume mount path            |
| `MAX_DURATION_SECONDS`     | `1200`                         | Reject videos longer than this (D37)      |
| `QUEUE_CONCURRENCY`        | `2`                            | Parallel jobs in the worker (D38)         |
| `YOUTUBE_API_KEY`          | _(empty)_                      | Discovery; **backend only** secret (D46)  |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000`        | Browser-facing backend base URL           |

> Secrets are backend env vars only — never committed to code or stored in
> `localStorage` (D46).

---

## Development phases

This repo is built phase-by-phase per [`ROADMAP.md`](./ROADMAP.md). **Phase 0**
(this scaffolding) delivers a running, empty-but-wired stack: all containers
healthy, `GET /api/health` returns OK, and the frontend renders a placeholder
that reaches the backend health endpoint.
