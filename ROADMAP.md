# Key Finder — Build Roadmap (MVP / v1)

> **Audience**: AI coding agents.
> **Purpose**: a precise, phase-by-phase plan to build the v1 (MVP) from scratch.
> **Source of truth**: `SPECIFICATION.md` (decisions referenced as `D#`).
> Read `SPECIFICATION.md` fully before starting. If a detail is missing here,
> defer to the spec; if both are silent, pick the simplest spec-consistent
> option and record it in the spec's Decisions Log.

---

## 0. Product summary (context for agents)

A web app to **import instrumentals from YouTube**, **analyze BPM + musical key**
(with confidence + alternatives + manual correction), store them in a
**library**, and re-download them with a `[BPM][Key] Title` filename. Signature
UX: a **glassmorphism** UI where a track's **mood (from BPM + key)** drives the
visuals, centered on a **Player page**.

**Core v1 pages**: Home, Player, Library, Settings, Discovery (simple).

**Architecture**: fully **Dockerized**, dedicated container per service —
`frontend` (Next.js), `backend` API (FastAPI), `worker` (download/convert/
analyze), `db` (PostgreSQL). Postgres-backed job queue. Deployable to a container
host (likely Railway).

---

## Conventions & ground rules

- **Languages**: backend Python 3.12 + FastAPI; frontend Next.js (App Router) +
  TypeScript.
- **Monorepo layout**:
  ```
  /frontend            # Next.js app
  /backend             # FastAPI app (API)
  /worker              # worker process (can share /backend code as a package)
  /shared              # optional shared schemas/types (OpenAPI-generated)
  docker-compose.yml
  .env.example
  README.md
  ```
  > `backend` and `worker` MAY live in one Python package with two entrypoints,
  > but MUST run as **two separate containers** (D36).
- **Type safety**: generate the frontend API client/types from the backend
  **OpenAPI** schema. Do not hand-duplicate types.
- **Commits**: small, focused, conventional commits (`feat:`, `fix:`, `chore:`).
- **Each phase ends GREEN**: code builds, linters pass, tests for the phase pass,
  and `docker compose up` still works.
- **No secrets in code or localStorage**. Secrets are backend env vars (D46).
- **Tests-first for analysis & queue logic**; component/E2E tests for UI flows.
- **i18n from the start**: every user-facing string goes through `next-intl`
  (FR + EN), never hard-coded (D10, D34).
- **Theming from the start**: design tokens for color/blur/opacity so the look
  can change without rewrites (D15).

### Environment variables (`.env.example` must list all)
- `DATABASE_URL`
- `AUDIO_STORAGE_PATH` (mounted named volume)
- `MAX_DURATION_SECONDS` (default `1200` = 20 min, D37)
- `QUEUE_CONCURRENCY` (default `2`, D38)
- `YOUTUBE_API_KEY` (backend only; Discovery, D46)
- `NEXT_PUBLIC_API_BASE_URL`

---

## Phase 0 — Project scaffolding & Docker ✅ DONE (2026-06-09)

> **Status**: Complete & verified. `docker compose up` starts all four
> containers; `GET /api/health` returns OK; the frontend renders the
> glassmorphism placeholder and reaches the backend health endpoint through
> `NEXT_PUBLIC_API_BASE_URL`. Acceptance criteria met (verified manually in the
> browser by the user).

**Objective**: a running, empty-but-wired stack via `docker compose up`.

**Tasks**
- Initialize the monorepo structure above; add root `README.md` and
  `.env.example`.
- `frontend`: create Next.js (App Router, TS), Tailwind CSS, shadcn/ui, Lucide.
- `backend`: FastAPI app with `/api/health`; Dockerfile (install ffmpeg).
- `worker`: minimal loop process; Dockerfile (install ffmpeg + analysis deps).
- `db`: official `postgres` image with a named volume.
- Named volume for **audio storage** shared between `backend` and `worker`.
- `docker-compose.yml` wiring all four services on one network.
- Healthchecks for `backend` and `db`.

**Deliverables**: `docker compose up` starts all services; `GET /api/health`
returns OK; frontend renders a placeholder page.

**Acceptance**
- All containers healthy.
- Frontend reaches backend health endpoint through `NEXT_PUBLIC_API_BASE_URL`.

**Spec refs**: §5, D13, D36.

---

## Phase 1 — Backend foundation (DB, models, migrations) ✅ DONE (2026-06-09)

> **Status**: Complete. SQLAlchemy (async) + Alembic configured; all six
> tables (`tracks`, `tags`, `track_tags`, `playlists`, `playlist_tracks`,
> `jobs`) implemented per §6 with `user_id` nullable, enum statuses, JSONB
> alternatives/palette, decimal BPM/confidence. First migration
> (`0001_initial`) compiles to valid Postgres DDL (enum types + JSONB + FKs).
> Pydantic schemas (create/update/read) exist for every entity. Seed/smoke
> script (`python -m app.scripts.seed`) and unit tests (4 passing, in-memory
> SQLite) verify create/read of each entity. The backend container runs
> `alembic upgrade head` on start.

**Objective**: persistent data layer matching the spec.

**Tasks**
- Add SQLAlchemy (async) + Alembic; configure `DATABASE_URL`.
- Implement models exactly per `SPECIFICATION.md` §6:
  - `tracks` (incl. `bpm` numeric/decimal, `bpm_alternatives` jsonb,
    `key_alternatives` jsonb, `*_confidence`, `*_manual`, `is_favorite`,
    `mood_palette` jsonb, `status` enum, `user_id` nullable).
  - `tags`, `track_tags`.
  - `playlists`, `playlist_tracks` (with `position`).
  - `jobs` (queue: `status`, `progress`, `error_msg`, `track_id`).
- `user_id` columns nullable now (multi-user later, D1).
- First Alembic migration + a seed/smoke script.
- Pydantic schemas for all entities.

**Deliverables**: migrations apply cleanly; models tested.

**Acceptance**
- `alembic upgrade head` works in the `backend` container.
- Unit tests create/read each entity.

**Spec refs**: §6, D6, D22, D25.

---

## Phase 2 — Download + conversion + queue (worker) ✅ DONE (2026-06-09)

> **Status**: Complete. The worker is now a self-contained async service
> (`worker/app`) with its own DB layer (`db.py`) and ORM models (`models.py`)
> mirroring the backend's `tracks`/`jobs` schema (separate container, D36). A
> thin **queue abstraction** (`queue.py`: `JobQueue` ABC + `PostgresJobQueue`)
> claims work with `SELECT ... FOR UPDATE SKIP LOCKED` (no double-claim, D38)
> and exposes `enqueue/claim/progress/complete/fail/retry` (D14, D17). The
> **pipeline** (`pipeline.py`) fetches metadata (yt-dlp), **rejects videos over
> `MAX_DURATION_SECONDS`** before download (D37), downloads best audio, converts
> to **WAV** via ffmpeg (`media.py`) into the shared audio volume, and drives
> `jobs`/`tracks` state (`queued → downloading → analyzing → done`/`ready`, or
> `error`). The **runner** (`runner.py`) polls with bounded `QUEUE_CONCURRENCY`
> and shuts down gracefully. yt-dlp errors are normalized to clear messages
> (age-restricted/region-blocked/unavailable). Analysis is **stubbed** (Phase 3).
> A manual enqueue helper (`python -m app.scripts.enqueue <url>`) stands in until
> `POST /api/jobs` (Phase 4). 13 unit tests pass (in-memory SQLite): queue
> claim/limit/order/no-double-claim/progress/complete/fail/retry and pipeline
> success/duration-limit/error/retry.

**Objective**: submit a URL → audio downloaded, converted, stored; job tracked.

**Tasks**
- Define a **queue abstraction** interface (enqueue, claim, complete, fail,
  progress) so a Redis backend can replace it later (D14).
- Implement the **Postgres-backed queue**: claim jobs with
  `SELECT ... FOR UPDATE SKIP LOCKED`; honor `QUEUE_CONCURRENCY` (default 2, D38).
- Worker pipeline:
  1. Validate URL + fetch metadata (yt-dlp): title, duration, thumbnail,
     youtube_id.
  2. **Reject if duration > `MAX_DURATION_SECONDS`** (default 20 min, D37) with a
     clear error.
  3. Download bestaudio (yt-dlp).
  4. Convert to **WAV** (ffmpeg); store in the audio volume.
  5. Update `jobs.status`/`progress` (`queued → downloading → analyzing → done`,
     or `error`).
  6. Create/update the `tracks` row; on success the track `status` becomes
     `ready` (job ends `done`).
- **Error handling**: capture failures (age-restricted, region-blocked,
  unavailable) into `jobs.error_msg`; status `error`; support retry (D17).

**Deliverables**: enqueue a URL → a `ready` track with a stored WAV (analysis
stubbed in this phase).

**Acceptance**
- Submitting a normal video produces a stored WAV + `ready` track.
- A >20 min video is rejected with the correct error.
- A bad/unavailable URL yields `error` + message; retry re-runs it.
- Two jobs never get double-claimed (concurrency test).

**Spec refs**: §5 (queue), D14, D17, D37, D38.

---

## Phase 3 — Analysis engine (BPM + key) ✅ DONE (2026-06-10)

> **Status**: Complete. `worker/app/analysis.py` implements a two-estimator
> ensemble (librosa `beat_track` + Essentia `RhythmExtractor2013 multifeature`)
> for BPM and a three-profile vote (Krumhansl / Temperley / EDMA via Essentia
> `KeyExtractor`) for key. Both deps are **lazily imported** so tests run
> without them installed. The pipeline's Phase 2 analysis stub is replaced by
> `await asyncio.to_thread(self._analyzer, dest)` where `analyzer` is
> injectable (default `analyze`). BPM/key + confidence + alternatives are
> persisted on the `tracks` row via `_set_track(analysis=result)`. 38 tests
> pass (25 new analysis tests + 13 existing queue/pipeline tests).

**Objective**: accurate BPM + key with confidence and alternatives.

**Tasks**
- Integrate **Essentia** + **librosa**.
- **BPM**: combine algorithms; reconcile via voting; explicitly handle
  **half/double-time**; output a chosen **decimal** BPM (D25), `bpm_alternatives`
  (e.g. half/double), and `bpm_confidence` (0–1).
- **Key**: run multiple key profiles (Krumhansl/Temperley/EDMA); cross-check;
  output chosen key in **standard notation** (e.g. `F# Minor`, D5),
  `key_alternatives` (e.g. relative key), and `key_confidence`.
- Persist all values on the `tracks` row.
- Wire analysis into the worker pipeline (replaces the Phase 2 stub).

**Deliverables**: tracks come out with BPM/key + confidence + alternatives.

**Acceptance**
- Unit tests on a small fixture set assert plausible BPM/key and that
  alternatives are populated when ambiguous.
- BPM stored as decimal; key in standard notation.

**Spec refs**: §4, D3, D5, D24, D25.

---

## Phase 4 — API surface + real-time progress ✅ DONE (2026-06-09)

> **Status**: Complete. Full REST API implemented under `/api` across four
> routers (`jobs`, `tracks`, `playlists`, `tags`) wired into `app.main`, plus an
> SSE progress channel. **Jobs**: `POST/GET /jobs`, `GET /jobs/{id}`,
> `POST /jobs/{id}/retry` (retry only valid for `error` jobs; resets a linked
> track to `queued`), `GET /jobs/stream` (SSE, dependency-injected session
> factory, emits a `jobs` snapshot on change + keep-alive heartbeats, D33).
> **Tracks**: `GET /tracks` (search/sort/filter by title, favorite, key, tag,
> status, bpm range), `GET /tracks/{id}`, `PATCH /tracks/{id}` (manual
> correction auto-sets `bpm_manual`/`key_manual`, D24), `POST
> /tracks/{id}/reanalyze` (enqueues a job linked to the existing track so the
> worker reuses its row), `DELETE /tracks/{id}` (also unlinks audio file),
> `GET /tracks/{id}/audio` (Range-aware `FileResponse`), `GET
> /tracks/{id}/download?format=wav|mp3` (filename `[BPM][Key] Title`; MP3 via
> on-the-fly ffmpeg 320 kbps transcode with temp cleanup, D4). **Playlists**:
> full CRUD + add/remove/reorder (`PUT .../tracks/order`). **Tags**: list/create
> + attach/detach via `/tags/{tag_id}/tracks/{track_id}`.
> New helpers: `app/services/filename.py` (D32 key abbreviation min=`m`,
> maj=`maj`, accidentals preserved; BPM trailing `.0` dropped) and
> `app/services/audio.py` (MP3 export). Fixed a stale-collection bug via
> `populate_existing` on playlist reads. 37 tests pass (15 API integration +
> 7 filename unit + 15 prior + SSE), incl. download filename for
> minor/major/flat keys and a live SSE emit. `httpx` added for the ASGI test
> client (`client` fixture overrides `get_session`/`get_session_factory`).

**Objective**: complete REST API + SSE progress, per spec §5.

**Tasks**
- Implement endpoints (prefix `/api`):
  - **Jobs**: `POST /jobs`, `GET /jobs`, `GET /jobs/{id}`,
    `POST /jobs/{id}/retry`.
  - **Tracks**: `GET /tracks` (search/sort/filter), `GET /tracks/{id}`,
    `PATCH /tracks/{id}` (manual correction, favorite), `POST /tracks/{id}/reanalyze`,
    `DELETE /tracks/{id}`, `GET /tracks/{id}/audio` (stream),
    `GET /tracks/{id}/download?format=wav|mp3` (filename per §7).
  - **Playlists**: full CRUD + add/remove/reorder tracks.
  - **Tags**: list/create + attach/detach.
- **Manual correction** rules: setting bpm/key sets `*_manual=true`; saved value
  persists and is used everywhere (D24).
- **Download**: build filename `[BPM][Key] Title`; key abbreviation minor=`m`,
  major=`maj`, accidentals `#`/`b` (D32); MP3 path = ffmpeg 320 kbps (D4).
- **SSE**: `GET /jobs/stream` pushing status/progress/errors; polling fallback
  via `GET /jobs` (D33).
- Ensure OpenAPI schema is complete (frontend will generate its client from it).

**Deliverables**: a fully exercisable API (via OpenAPI docs / curl).

**Acceptance**
- Integration tests cover each endpoint's happy path + key errors.
- Download returns correct filename for minor/major/flat keys.
- SSE emits progress for a live job.

**Spec refs**: §5 (API surface, real-time), §7, D4, D24, D32, D33.

---

## Phase 5 — Frontend foundation & design system ✅ DONE (2026-06-09)

> **Status**: Complete & verified in the browser. The Next.js App Router shell
> renders the glassmorphism system from the Claude Design handoff. Design
> tokens (`--kf-*` glass surfaces, ink/line, aurora base) live in
> `globals.css` + `tailwind.config.ts`, with Space Grotesk + JetBrains Mono via
> `next/font`. Dark is default; `.light` overrides; **next-themes** drives a
> persisted dark/light toggle. **next-intl** (no-routing, cookie-based) ships
> FR + EN catalogs (`messages/*.json`) with a language switcher that swaps all
> visible strings and persists. **TanStack Query** (server state) +
> **Zustand** (`lib/store.ts`, persisted UI prefs) are wired via
> `components/providers.tsx`. A **type-safe API client** (`openapi-fetch` over
> `lib/api/schema.d.ts`, regenerable with `npm run gen:api`) backs query hooks
> (`useHealth`, `useTracks`); the Home page's backend-status card is a live
> sample query through it. Reusable glass primitives: `GlassPanel`
> (default/soft), `Aurora`, `KeyChip`, `Confidence`, plus the mood engine
> (`lib/mood.ts`). Global `NavRail` (logo, neon active indicator, language +
> theme switchers) links Home/Discover/Library/Settings; Player is a route
> reached contextually (matching the mockups). Routes scaffolded for all five
> pages via `PageScaffold` (full builds land in Phases 6–10). `next build`
> passes (lint + types green); dev server verified.

**Objective**: themed, i18n-ready Next.js shell with the glassmorphism system.

**Tasks**
- App Router structure + routes for Home, Player, Library, Settings, Discovery.
- **Theming tokens** (colors, blur, opacity, radii) supporting **dark (default)**
  + light (D28); shadcn/ui themed accordingly.
- **Glassmorphism** primitives (frosted panels, neon/psychedelic accents) as
  reusable components (D15).
- **next-intl** setup with FR + EN message catalogs and a language switcher (D10).
- **TanStack Query** for server state; **Zustand** for client/UI state (D34).
- Generate the typed API client from backend OpenAPI.
- Global layout/nav linking the five pages.

**Deliverables**: navigable shell, theme toggle, language toggle, API client.

**Acceptance**
- Dark/light toggle works; persists.
- FR/EN toggle swaps all visible strings.
- A sample query hits the backend through the generated client.

**Spec refs**: §8, §10, D10, D15, D28, D34.

---

## Phase 6 — Home page ✅ DONE (2026-06-09)

> **Status**: Complete. `next build` passes (lint + types green). The Home
> route (`app/page.tsx`, now a client component) is the functional
> paste-and-process entry. The glass **pill** submits to `POST /jobs` via a
> typed mutation (`useCreateJob`) with lightweight URL validation + inline
> errors and a spinner while pending. A **global SSE subscriber**
> (`components/jobs-stream.tsx`, mounted in `Providers`) streams
> `GET /jobs/stream` snapshots into the React Query cache and invalidates
> tracks on completion — so jobs keep running and stay observable after
> leaving Home (background processing, D19); a 5 s `useJobs` poll is the
> fallback (D33). The **processing queue** renders live job state via
> `components/queue-row.tsx` (faithful QueueRow: mood-tinted thumb,
> per-state orb/spinner, progress bar, % and Retry → `useRetryJob`), joined
> to track BPM/key for `done` rows. **Adaptive background** (`lib/background.ts`,
> D42) computes aurora blobs for three modes — `library` (aggregated mood from
> favorites/recent, default), `time` (hue by time of day), `random` — selected
> via the top-bar pill (persisted in the Zustand store; full control lands in
> Settings, Phase 9); mode-dependent blobs render only after mount to avoid
> hydration drift. On completion of a session-submitted job, a Framer-Motion
> **TransitionOverlay** (mood-tinted radial burst + title) plays and routes to
> `/player?track={id}` when **auto-transition** is ON (D26/D27, store default
> ON). New deps: `framer-motion`. New i18n keys (en/fr) for the kicker,
> queue, states, background modes, and transition.

**Objective**: the paste-and-process entry experience.

**Tasks**
- Central glassmorphism **"pill" URL input** with decorative motifs background.
- On submit: call `POST /jobs`; show a **stylish processing animation**
  (Framer Motion) while subscribed to **SSE** progress.
- **Adaptive background** with 3 modes (D42), default **aggregated library mood**:
  - Mode 1: aggregate mood/colors from favorites/recent tracks.
  - Mode 2: time of day.
  - Mode 3: random/subtle on load.
  - Mode selectable in Settings.
- Background processing: leaving Home does NOT cancel the job (queue continues,
  D19); the user can navigate to Library and return.
- On completion: **smooth transition into the Player** (default), per D26/D27.

**Deliverables**: working Home → job → progress → transition.

**Acceptance**
- Submitting a URL creates a job and shows live progress.
- Navigating away and back keeps the job running.
- On finish, transitions to Player (when auto-transition is ON).

**Spec refs**: §9.1, D19, D42.

---

## Phase 7 — Player page (signature experience) ✅ DONE (2026-06-09)

> **Status**: Complete. `next build` passes (lint + types green). The Player
> route (`app/player/page.tsx`) now renders the real signature experience via
> `components/player-view.tsx` (a Suspense-wrapped client component reached at
> `/player?track={id}`). **Mood mapping** reuses `lib/mood.ts` (circle-of-fifths
> → HSL, C=red 0° clockwise; BPM energy `smoothstep`) to paint a mood-tinted
> aurora (`moodBlobs`, speed = `0.8 + energy*1.6`) + the result-card glow; the
> computed palette is **persisted once to `tracks.mood_palette`** (`moodPalette`)
> on first view if absent (`useUpdateTrack` PATCH). The card shows the YouTube
> **thumbnail** (mood-tinted placeholder fallback), title, duration, an
> **open-original** link, and big **BPM / KEY readouts** with a `Confidence`
> badge (High/Med/Low + %) and the half/double-time + relative/alt readouts.
> **Playback** uses **wavesurfer.js** via `lib/use-wave-player.ts` (dynamic
> import, mood-colored progress, play/pause overlay + control, BPM-driven `EQ`
> "now playing", live time + waveform). **Download** is a split button with a
> WAV/MP3 format chooser (`trackDownloadUrl`) and a `[BPM][Key] Title` filename
> preview. **D27** is respected: when `autoTransition` (store) is OFF the Player
> is **download-only** (no waveform/playback), gated on a `mounted` flag to keep
> SSR/client agreement. New deps: `wavesurfer.js`. New hooks `useTrack` /
> `useUpdateTrack` + `trackAudioUrl`/`trackDownloadUrl` helpers; new components
> `eq.tsx`, `player-view.tsx`; `mood.ts` gained `moodWord`/`moodPalette`. Full
> en/fr `player.*` i18n (replaced the placeholder keys).

**Objective**: mood-driven playback page.

**Tasks**
- Implement **mood mapping** (D39, D43, D44):
  - Default **circle of fifths → HSL wheel**, **C = red (0°), clockwise**;
    major brighter/more saturated, minor darker/desaturated.
  - **BPM energy** = `smoothstep(clamp((bpm-60)/120, 0, 1))` (60–180 range)
    driving animation speed/intensity.
  - Persist the computed palette to `tracks.mood_palette`.
- Player UI: YouTube **thumbnail/cover**, artwork+mood-driven background and
  transitions, full info (BPM, key, **confidence badge + %**, duration).
- Controls: **Play / Pause** (wavesurfer.js) + **Download** (format chooser).
- **Confidence display**: badge High/Med/Low + exact % on hover/detail; flag low
  confidence (D23).
- Respect the **auto-transition/auto-play toggle** (D27): when off, show
  download-only, no playback.

**Deliverables**: a track plays with mood visuals; download works from here (D29).

**Acceptance**
- Default mapping produces distinct, key-correct hues; tempo changes energy.
- Confidence badge + % render; low-confidence flagged.
- Toggle off → download-only behavior.

**Spec refs**: §8 (mood mapping), §9.2, D23, D26, D27, D29, D39, D43, D44.

---

## Phase 8 — Library ✅ DONE (2026-06-10)

> **Status**: Complete. `next build` passes (lint + types green). The Library
> route (`app/library/page.tsx`) renders the full `LibraryView` client component.
> **Collapsible left sidebar** (D45) has three sections — All tracks, Favorites,
> Playlists — with an icon rail when collapsed; **collapsing persisted** via Zustand.
> **View toggle cards ↔ list** (default cards, D41) is also Zustand-persisted.
> **Track cards** (D20): YouTube thumbnail / mood-gradient fallback, decorative
> waveform bars seeded from the track ID, title, BPM, `KeyChip`, `Confidence`
> badge, duration, favorite toggle, YouTube link, download split-button (WAV/MP3),
> tags on hover, filename preview on hover, ⋯ more-menu. **Track list rows**:
> compact sortable rows with the same actions + inline tag display. **Toolbar**:
> debounced title search, sort dropdown (date/title/BPM/key/confidence + asc/desc),
> key filter, view toggle. **Integrated mini-player** (D33): a bottom glass bar
> with wavesurfer.js waveform, play/pause, time display, and "Open in Player"
> link; auto-plays on click; dismissed with ✕. **Re-analyze** queues a new job;
> **manual correction** (`CorrectionModal`) sets `bpm`/`key` with `*_manual=true`
> and shows detected alternatives as quick-apply chips. **Playlists** (D22):
> create/rename/delete in sidebar; add/remove/reorder tracks via card ⋯ menus.
> **Tags**: attach/detach from an all-tags picker + inline new-tag creation.
> **Delete track** is two-step (confirm inside the menu). Twelve new hooks added
> to `lib/api/hooks.ts` (playlists CRUD, tags CRUD, deleteTrack, reanalyzeTrack);
> `useTracks` extended with `status`/`bpm_min`/`bpm_max` params. FR + EN i18n
> catalogs extended with ~55 new `library.*` keys.

**Objective**: browse, organize, correct, and export the collection.

**Tasks**
- **Collapsible left sidebar** (D45): sections **All tracks**, **Favorites**,
  then **playlists**; collapses to an icon rail.
- **View toggle cards ↔ list** (default cards, remembered) (D41).
- **Track card** (D20): thumbnail, title, BPM, key, confidence, duration,
  waveform, favorite toggle, **open original YouTube link** button.
- **Tags on hover/detail only** (D41); keep cards clean.
- **Search / sort / filter** by title, BPM, key, date, favorite, tag (§3).
- **Integrated player + waveform** in-list (wavesurfer.js).
- **Re-analyze** (`POST /tracks/{id}/reanalyze`) and **manual correction** of
  BPM/key (with alternatives shown; saved value persists, D24).
- **Tags & favorites** management.
- **User-created playlists**: create/rename/delete, add/remove/reorder tracks
  (D22).
- **Download** from each card (format chooser) (D29).

**Deliverables**: a fully usable library.

**Acceptance**
- Cards/list toggle persists; sidebar collapses.
- Search/sort/filter return correct results.
- Correcting BPM/key persists and updates filename on next download.
- Playlist create + add/reorder works.

**Spec refs**: §3, §9.3, D20, D22, D24, D41, D45.

---

## Phase 9 — Settings ✅ DONE (2026-06-10)

> **Status**: Complete. `next build` passes (lint + types green). Full
> `SettingsView` client component replaces the Phase 5 placeholder at
> `/settings`. Seven sections, all wired to the app:
> **Appearance** — theme dark/light (next-themes) + language FR/EN
> (next-intl cookie); **Playback** — auto-transition toggle (D27) + default
> export format WAV/MP3 (affects Player download button primary action);
> **Mood** — source toggle circle-of-fifths vs thumbnail-derived (D31,
> thumbnail v1 = BPM energy warm/cool palette) + **palette preset editor**
> (D40, hue anchor 0–359° slider, clockwise/counter-CW direction, 12-key
> color preview, save-as/update/delete named presets stored in
> localStorage); the Player uses `moodWithPreset` or `moodFromBpmTone`
> based on `moodSource` + active preset; **Home** — background mode
> (D42, already in store, now surfaced); **Library** — default view
> cards/list (D41, already in store, now surfaced); **Processing** —
> duration limit (default 20 min, D37; updates the "Max X min" hint on
> Home via parametrized `hintDuration` i18n key) + queue concurrency
> (informational, points to `QUEUE_CONCURRENCY` env var); **Discovery** —
> add/remove linked YouTube playlist URLs (D46-safe, validated client-side,
> stored for Phase 10). New lib: `lib/mood-presets.ts` (`MoodPreset` type,
> `FIFTHS_ORDER`, `presetKeyHue`, `moodWithPreset`, `moodFromBpmTone`).
> Store extended with 7 new fields + setters. EN + FR catalogs each
> gained ~40 new `settings.*` keys.

**Objective**: expose all v1 preferences.

**Tasks** (persist client-side/localStorage except secrets, D35)
- **Theme** dark (default)/light; **Language** FR/EN.
- **Auto-transition + auto-play to Player** toggle (default ON) (D27).
- **Player mood source**: circle-of-fifths→HSL (default) or thumbnail-derived
  palette + adjustment (D31).
- **Mood palette editor + presets** (D40): edit key→color mapping (hue anchor,
  direction), preview, **create/name/save/switch presets**; stored in
  localStorage.
- **Home background mode** (D42).
- **Library default view** cards/list (D41).
- **Default export format** + **filename pattern**.
- **Duration limit** (default 20 min) + **queue concurrency** (default 2).
- **Linked YouTube playlists** for Discovery (add/remove links).
- Note: `YOUTUBE_API_KEY` is a **backend secret**, NOT a UI setting (D46).

**Deliverables**: settings that actually drive app behavior.

**Acceptance**
- Changing each setting visibly affects the app.
- A saved mood preset reloads and re-applies after refresh.

**Spec refs**: §9.4, §8, D27, D31, D35, D40, D41, D42.

---

## Phase 10 — Discovery (simple v1) ✅ DONE (2026-06-10)

> **Status**: Complete. `next build` passes (lint + types green). The Discovery
> route (`app/discovery/page.tsx`) renders the full `DiscoveryView` client
> component. Backend: two proxy endpoints under `/api/discovery` — `GET
> /search?q=` (YouTube `search.list`) and `GET /playlist?url=|id=` (YouTube
> `playlistItems.list`) — using `httpx.AsyncClient`; the `YOUTUBE_API_KEY` stays
> on the server and is never forwarded to the client (D46); returns 503 with a
> clear message if not configured. Frontend: search bar (glassmorphism pill)
> submits a query and shows a live `SearchSection` powered by
> `useDiscoverySearch`; a `PlaylistSection` with tab buttons for each linked
> playlist URL from the Zustand store (added in Settings Phase 9) renders items
> via `useDiscoveryPlaylist`; each video shows as a `VideoCard` (thumbnail,
> title, channel, Import button) that calls the existing `POST /jobs` flow with
> the YouTube video URL; import state machine (idle/loading/done/error) tracks
> each video independently. A `NoApiKeyBanner` appears when the backend returns
> 503. Empty states guide users to Settings when no playlists are linked. EN + FR
> i18n extended with ~22 new `discovery.*` keys. `DiscoveryItem` type added to
> `schema.d.ts`; two new hooks (`useDiscoverySearch`, `useDiscoveryPlaylist`)
> added to `hooks.ts`.

**Objective**: discover/import instrumentals from linked YouTube playlists + search.

**Tasks**
- Backend **proxy endpoints** (key stays server-side, D46):
  - `GET /api/discovery/search?q=` → YouTube Data API `search.list`.
  - `GET /api/discovery/playlist?url=|id=` → `playlistItems.list`.
- Discovery UI: browse items of **linked playlists** (from Settings) and a
  **keyword/tag search**; play preview; **import** a chosen track via the
  existing `POST /jobs` flow.
- Wrap in the app's mood aesthetic.
- Smart recommendation engine is **out of scope** for v1 (deferred, D21).

**Deliverables**: a working simple Discovery tab.

**Acceptance**
- A linked public playlist's items list and are importable.
- Keyword search returns results; importing one creates a job.
- API key never reaches the client (network inspection).

**Spec refs**: §9.5, D21, D46.

---

## Phase 11 — Integration, testing, polish

**Objective**: cohesive, robust v1.

**Tasks**
- **E2E** (Playwright) of the golden path: paste URL → progress → Player → play +
  download → appears in Library → add to playlist → correct BPM/key → re-download.
- Discovery path E2E (mock YouTube API).
- Verify the **Home→Player transition** and all 3 background modes.
- Accessibility pass (focus, contrast in both themes), responsive layout.
- Performance: audio streaming, list virtualization for large libraries.
- Empty/error/loading states everywhere; finalize FR + EN catalogs.

**Acceptance**
- E2E suites pass headless.
- No console errors; lints/type-checks clean.

---

## Phase 12 — Deployment

**Objective**: deploy the containerized stack to a container host.

**Tasks**
- Production Dockerfiles (multi-stage, slim) for all services.
- Externalize config via env vars; document required secrets.
- Provision managed Postgres + a persistent volume for audio on the host.
- Target **Railway** (likely; final host TBD, D2) — keep host-agnostic.
- Run migrations on deploy; smoke-test health + golden path in prod.
- Update `README.md` with local dev + deploy instructions.

**Acceptance**
- Public URL serves the app; golden path works against managed DB/storage.
- Re-deploy is repeatable (migrations + config documented).

**Spec refs**: §5 (deployment), D2, D13.

---

## Definition of Done (v1)

- All five pages implemented per spec; golden path + Discovery path pass E2E.
- Analysis returns BPM (decimal) + key (standard notation) + confidence +
  alternatives; manual correction persists.
- Mood mapping drives the Player; palette editor + presets work.
- Dockerized; deploys to a container host; secrets via env.
- FR/EN complete; dark/light themes complete; no hard-coded strings/secrets.
- All v1 Decisions Log items (`SPECIFICATION.md` §12) honored.

## Deferred to post-v1 (do NOT build now)
- Multi-user auth & private libraries (schema already supports it).
- YouTube **playlist import** of whole playlists (D12).
- **Mood visualizer** full feature (D16).
- Discovery **smart recommendation engine** (D21).
- Redis-backed queue migration (interface already abstracts it, D14).
- Camelot harmonic notation.
