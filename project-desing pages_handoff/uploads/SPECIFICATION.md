# Key Finder — Application Specification

> Living design document. All product and technical decisions are recorded here.
> Status: **Planning** (no code written yet).
> Last updated: 2026-06-08

---

## 1. Overview

**Key Finder** is a web app for music producers and artists. A user finds an
instrumental/beat on YouTube, pastes the video URL into the app, and the app
**downloads the audio, analyzes it (BPM + musical key/scale), and stores it in a
library**. The user can then download the file locally with the BPM and key
embedded in the filename, ready to use in a DAW.

The core value: **one paste → audio + accurate BPM + accurate key**, without
juggling multiple separate tools/services.

### Primary user
Music producers who source beats/instrumentals from YouTube and need precise
tempo and key information to produce music on top of them.

### Core principle
**Accuracy is the top priority.** The BPM and key values are used for real music
production, so they must be reliable. We surface a confidence score and always
allow manual correction.

---

## 2. User Flow

1. User finds a track on YouTube and copies the video URL.
2. User pastes the URL into the app.
3. The URL is added to a **processing queue**.
4. Backend pipeline runs: **download → convert → analyze (BPM + key)**.
5. The track is **saved to the library** with its metadata.
6. User can **preview** the track (audio player + waveform) in the library.
7. User can **download** the file locally; the filename includes BPM + key.
8. User can **re-analyze** or **manually correct** BPM/key if needed.

---

## 3. Feature Scope

### v1 (MVP)
- Paste a **single YouTube video URL** (no playlists yet).
- **Processing queue** supporting multiple stacked URLs, with per-track
  progress status (`downloading → analyzing → ready`).
- **Download** audio from YouTube.
- **Audio analysis**: BPM + musical key/scale, with a **confidence score**.
- **Library** persisting all imported tracks and metadata.
- Library functions:
  - **Search** by title, **sort/filter** by BPM, key, date added.
  - **Integrated audio player** with **waveform** preview.
  - **Re-analyze** and **manual correction** of BPM/key.
  - **Tags** (custom) and **favorites**.
  - **User-created playlists** (collections) with a sidebar.
- **Export/download** to local machine as **WAV (default)** or **MP3 320 kbps**.
- Filename pattern: **`[BPM][Key] Title`** (see §7).
- **Bilingual UI** (French + English) with a language switcher.
- **Error handling**: clear per-track error message in the queue + **retry**
  button (e.g. age-restricted, region-blocked, unavailable videos).
- **Configurable duration limit** (**default 20 min**) to avoid accidentally
  analyzing full DJ mixes.
- **Glassmorphism design**, **dark by default** + light theme (see §8).
- **Library view toggle** (cards ↔ list, default cards); **tags shown on
  hover/detail** only.
- **Mood palette editor with savable presets** to fine-tune key→color over time.
- **Adaptive Home background** with 3 modes (default = aggregated library mood).
- **Discovery tab (simple)**: linked YouTube playlists + simple YouTube search,
  with play/import (smart recommendation engine comes later, see §9.5).
- **Player page**: after analysis, a fluid transition auto-plays the track with a
  **mood (from BPM + key) driving the visuals** — this behavior is **toggleable**
  (default ON; off = download-only). Requires a **basic mood→visual mapping** in
  v1 (the full mood *visualizer* remains a post-v1 feature, see §8).

### Later (post-v1)
- **Multi-user accounts** with private libraries (architecture designed to
  support this from the start — see §5).
- **YouTube playlist import** (paste a playlist link → import all tracks).
- Possible: harmonic notation (Camelot) as a secondary display.
- **Mood visualizer**: derive a "mood" from the extracted BPM + key and drive
  reactive, colorful/psychedelic visuals from it (see §8). A signature feature
  planned before opening the app to others.

---

## 4. Analysis Strategy (Accuracy Focus)

We use **open-source** tooling to keep costs at zero, with a custom **ensemble**
layer on top to maximize reliability.

### BPM detection
- Combine multiple algorithms (e.g. Essentia `RhythmExtractor2013`, librosa
  beat/tempo, multi-window analysis).
- **Vote / reconcile** results across algorithms.
- Explicitly handle the **half-time / double-time** pitfall (e.g. 70 vs 140 BPM)
  by checking octave relationships and picking the most plausible tempo.

### Key / scale detection
- Run multiple key profiles (e.g. **Krumhansl**, **Temperley**, **EDMA**).
- Cross-check the outputs and pick the agreed result.
- Output a **confidence score** so the user knows how trustworthy it is.

### Values & alternatives
- Show the **best estimate** plus **alternatives** when the algorithm hesitates:
  - BPM: e.g. `140` with alternative `70` (half/double-time).
  - Key: e.g. `F# Minor` with alternative `A Major` (relative key).
- The user can **correct** the value; the **chosen/saved value is what persists**
  and is used everywhere (card, export, filename).
- **BPM is stored and displayed as a decimal** (e.g. `140.0`) for precision —
  many tracks aren't exactly on a whole number.

### Confidence display
- Show a **colored badge** (High / Medium / Low) for quick reading.
- Show the **exact percentage** on hover / in the detail view.
- On **Low** confidence: flag it visually and suggest manual verification.

### Human-in-the-loop
- Allow **manual override** of BPM and key — the producer is the final judge.
- Once corrected, the manual value takes precedence and is persisted.

### Notes
- Realistically, beating a tuned single engine like Essentia from scratch is hard
  and not the goal. The added value is the **ensemble + confidence + manual
  correction** workflow, not a hand-written DSP engine.
- Key is displayed in **standard musical notation** (e.g. `F# Minor`, `C Major`).

---

## 5. Architecture

**Fully containerized from day one.** Every component runs in its own dedicated
Docker container, orchestrated locally via **Docker Compose**. This makes the
whole stack portable and ready to deploy as-is to a container host later
(**likely Railway**, to be confirmed). We develop locally with the exact same
containers we will deploy.

```
                        Docker Compose (one network)
┌──────────────────────┐  ┌──────────────────────────┐  ┌──────────────────┐
│  frontend            │  │  backend (API)           │  │  db              │
│  Next.js + React/TS  │<>│  Python + FastAPI        │<>│  PostgreSQL      │
│  Tailwind + shadcn   │  │  REST + progress channel │  │  (named volume)  │
│  player + waveform   │  └──────────────────────────┘  └──────────────────┘
└──────────────────────┘            ^                                       
                                    │ jobs                                  
                          ┌──────────────────────────┐  ┌──────────────────┐
                          │  worker                  │  │  audio storage   │
                          │  yt-dlp + ffmpeg         │<>│  (named volume)  │
                          │  Essentia / librosa      │  │                  │
                          └──────────────────────────┘  └──────────────────┘
```

> Note: the **API** and the **worker** are **separate containers from v1** so
> heavy analysis (ffmpeg/Essentia) never blocks API responsiveness and each can
> scale independently.

### Containers
- **`frontend`**: Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui,
  Lucide icons.
- **`backend` (API)**: **Python + FastAPI**. Serves audio/metadata via a REST
  API plus an **SSE** progress channel for the queue (see Real-time, D33).
- **`worker`**: download + conversion + analysis (yt-dlp, ffmpeg, Essentia,
  librosa). Consumes jobs from the queue. **Dedicated container from v1**
  (separate from the API).
- **`db`**: **PostgreSQL**, data in a named volume.
- **Audio storage**: a **named Docker volume** (not a host-specific path), so
  files persist and the setup is portable across environments.
- Orchestrated by **`docker-compose.yml`** for local dev; the same images deploy
  to the chosen container host.

#### Queue mechanism (recommendation)
For v1, use a **Postgres-backed queue**: the `jobs` table is the queue and the
worker polls it. This avoids running an extra Redis service and keeps the stack
minimal for low-volume personal use. We wrap it behind a **thin queue
abstraction** in the worker so we can swap to **Redis + RQ/arq** later (for
parallelism, retries, and priorities) without touching business logic.
- **Concurrency**: **configurable, default 2** parallel jobs. Safe parallel
  claiming uses `SELECT ... FOR UPDATE SKIP LOCKED` so two workers/tasks never
  pick the same job.
- **Duration limit**: **default 20 min** (configurable); longer videos are
  rejected before download.

### Deployment target (revised)
Given the constraints of running download/analysis on Vercel, we will **deploy
the whole stack to a container host** (most **likely Railway**, final choice
TBD) instead of splitting frontend (Vercel) and backend (home server). Because
everything is containerized, the deployment target stays flexible (Railway,
Render, Fly.io, a VPS, or a home server) without code changes.

### API surface (draft)
REST API served by FastAPI. All paths prefixed with `/api`.

**Jobs / processing**
- `POST /api/jobs` — submit a YouTube URL; creates a job, returns its id.
- `GET /api/jobs` — list the queue (with statuses/progress).
- `GET /api/jobs/{id}` — single job status.
- `POST /api/jobs/{id}/retry` — retry a failed job.

**Tracks**
- `GET /api/tracks` — list with `?search=&sort=&filter=` (BPM, key, date,
  favorite, tag).
- `GET /api/tracks/{id}` — single track + metadata + alternatives + mood palette.
- `PATCH /api/tracks/{id}` — manual correction (bpm/key), favorite toggle.
- `POST /api/tracks/{id}/reanalyze` — re-run analysis.
- `DELETE /api/tracks/{id}` — remove from library.
- `GET /api/tracks/{id}/audio` — stream audio for the in-app player.
- `GET /api/tracks/{id}/download?format=wav|mp3` — export with the
  `[BPM][Key] Title` filename.

**Playlists**
- `GET /api/playlists`, `POST /api/playlists`, `PATCH /api/playlists/{id}`,
  `DELETE /api/playlists/{id}`.
- `POST /api/playlists/{id}/tracks` (add), `DELETE /api/playlists/{id}/tracks/{trackId}`,
  reorder via `position`.

**Tags**
- `GET /api/tags`, `POST /api/tags`; attach/detach on a track via `PATCH`.

**Discovery (v1, proxied to YouTube Data API)**
- `GET /api/discovery/search?q=` — keyword/tag search.
- `GET /api/discovery/playlist?url=` (or `?id=`) — items of a linked playlist.
- The backend holds the API key and proxies these calls; results can be sent to
  the existing `POST /api/jobs` flow to import a chosen track.

**Settings**
- v1: stored **client-side (localStorage)** for the single-user case; moves to a
  per-user server record when accounts are added.

### Real-time / progress (recommendation)
Use **Server-Sent Events (SSE)** for live queue/job progress:
- `GET /api/jobs/stream` — server pushes `downloading → analyzing → ready` /
  progress % / errors.
- Rationale: progress is **one-way** (server → client); SSE is simpler than
  WebSocket, plays well with FastAPI, and auto-reconnects.
- **Polling fallback** (`GET /api/jobs`) if SSE is unavailable.
- Can upgrade to **WebSocket** later if bidirectional needs appear (e.g.
  collaborative or Discovery features).

### Future-proofing for multi-user
Even though v1 has **no authentication**, the data model includes an optional
`owner/user` concept so we can add accounts and private libraries later without
a major rewrite (see §6).

---

## 6. Data Model (initial draft)

> Postgres. `user_id` is nullable in v1 (single shared library) and becomes
> required once accounts are added.

### `tracks`
| Field             | Type        | Notes                                            |
|-------------------|-------------|--------------------------------------------------|
| `id`              | UUID (PK)   |                                                  |
| `user_id`         | UUID (FK)   | Nullable in v1; for future multi-user            |
| `source_url`      | text        | Original YouTube URL                             |
| `youtube_id`      | text        | Extracted video id                               |
| `title`          | text        | Original title from YouTube                      |
| `duration_sec`    | int         | Track length                                     |
| `thumbnail_url`   | text        | YouTube thumbnail (optional)                     |
| `bpm`             | numeric     | Chosen tempo, **decimal** (e.g. `140.0`)         |
| `bpm_alternatives`| jsonb       | Other plausible tempos (e.g. half/double-time)   |
| `bpm_confidence`  | numeric     | 0–1 confidence score                             |
| `key`             | text        | Chosen key, standard notation, e.g. `F# Minor`   |
| `key_alternatives`| jsonb       | Other plausible keys (e.g. relative key)         |
| `key_confidence`  | numeric     | 0–1 confidence score                             |
| `bpm_manual`      | bool        | True if user overrode the value                  |
| `key_manual`      | bool        | True if user overrode the value                  |
| `is_favorite`     | bool        | Favorite flag                                    |
| `mood_palette`    | jsonb       | Derived colors for the Player (from key/BPM/thumb)|
| `audio_path_wav`  | text        | Path to stored WAV                               |
| `status`          | enum        | `queued`/`downloading`/`analyzing`/`ready`/`error`|
| `created_at`      | timestamp   | Date added                                       |
| `updated_at`      | timestamp   |                                                  |

### `tags`
| Field    | Type      | Notes              |
|----------|-----------|--------------------|
| `id`     | UUID (PK) |                    |
| `name`   | text      | Tag label          |
| `user_id`| UUID (FK) | Nullable in v1     |

### `track_tags` (many-to-many)
| Field      | Type      |
|------------|-----------|
| `track_id` | UUID (FK) |
| `tag_id`   | UUID (FK) |

### `playlists` (user-created collections)
| Field        | Type      | Notes                          |
|--------------|-----------|--------------------------------|
| `id`         | UUID (PK) |                                |
| `name`       | text      | Playlist name                  |
| `user_id`    | UUID (FK) | Nullable in v1                 |
| `created_at` | timestamp |                                |

### `playlist_tracks` (many-to-many, ordered)
| Field         | Type      | Notes                         |
|---------------|-----------|-------------------------------|
| `playlist_id` | UUID (FK) |                               |
| `track_id`    | UUID (FK) |                               |
| `position`    | int       | Order within the playlist     |

### `jobs` (processing queue)
| Field          | Type      | Notes                                        |
|----------------|-----------|----------------------------------------------|
| `id`           | UUID (PK) |                                              |
| `source_url`   | text      | URL submitted                                |
| `status`       | enum      | `queued`/`downloading`/`analyzing`/`done`/`error` |
| `progress`     | int       | 0–100                                        |
| `error_msg`    | text      | If failed                                    |
| `track_id`     | UUID (FK) | Set once a track is created                  |
| `created_at`   | timestamp |                                              |

> Status lifecycles differ: a **job** ends in `done` (or `error`), while the
> resulting **track** ends in `ready` (or `error`). The SSE stream reports job
> progress; the track becomes `ready` on success.

---

## 7. Export / Filename Format

- Default export format: **WAV** (standard working format for MAO/DAW).
- Optional export format: **MP3 320 kbps**.
- Note: YouTube audio is already lossy; WAV does not recover lost quality but is
  the standard production working format.

**Filename pattern: `[BPM][Key] Title`**

Examples:
- `[140][F#m] Dark Type Beat.wav`
- `[90][Cmaj] Smooth Soul Loop.mp3`

### Key abbreviation scheme (filenames)
- **Minor** keys: tonic + **`m`** → `F#m`, `Am`, `Bbm`.
- **Major** keys: tonic + **`maj`** → `Cmaj`, `F#maj`, `Bbmaj`.
- Accidentals use the spelling from analysis: **`#`** for sharps, **`b`** for
  flats (e.g. `F#m`, `Ebmaj`).
- On-screen the key is shown in **full standard notation** (`F# Minor`,
  `C Major`); the compact form above is used only in filenames.

> BPM is stored as a decimal; in the filename, a trailing `.0` may be omitted for
> whole numbers (e.g. `[140]` vs `[140.5]`). To finalize during implementation.

---

## 8. Design & Visual Direction

The visual direction is a **first-class concern** and is expected to **evolve a
lot** over time. v1 must already look polished, stylish, and functional, while
laying groundwork for richer, reactive visuals later.

### v1 direction
- **Glassmorphism** as the core aesthetic (frosted/blurred translucent panels,
  depth, soft borders, subtle highlights). This is the signature vibe.
- **Dark + light themes** with a toggle (glassmorphism tuned for both).
- **Neon-ish, slightly psychedelic** color accents — vivid but tasteful, not
  overwhelming.
- Modern, smooth, comfortable for long sessions.

### Future (post-v1, before opening to others) — Mood Visualizer
- From the extracted **BPM + key**, derive a **"mood"** for each track.
- Use that mood to drive **reactive, colorful/psychedelic visuals** (e.g. color
  palettes and animations that change based on tempo and key).
- This is intended as a **signature feature** of the product.

### Mood mapping (v1 — drives the Player visuals)
- **Default (circle of fifths → HSL wheel)**: the 12 tonics are placed around the
  hue wheel following the **circle of fifths**; **major = more saturated /
  bright**, **minor = more desaturated / dark**; **BPM modulates energy**
  (animation speed/intensity). Musically coherent and deterministic.
- **Hue anchoring (default)**: **C = red (hue 0°)**, walking the circle of fifths
  **clockwise** (C → G → D → A …). Editable in the palette editor.
- **BPM energy curve (proposed default)**: normalize BPM over **60–180** (clamped
  outside), then apply a gentle **smoothstep** ease so extremes stay calmer and
  mid-tempo changes feel organic: `energy = smoothstep(clamp((bpm-60)/120,0,1))`.
  Tunable via the editor.
- **Alternative (Settings option): thumbnail-derived palette + adjustment**:
  extract the dominant colors from the YouTube thumbnail, then **adjust** them
  using BPM/key. Visually cohesive with the cover art.
- Switchable in **Settings**; circle-of-fifths→HSL is the default.

### Mood palette editor + presets
- An **in-app tool** to **fine-tune the key→color mapping** over time and craft a
  **curated artistic palette** (neon/psychedelic taste) — not defined yet; the
  formula default seeds it.
- **Savable presets**: the user can create, name, save, and switch between
  palette presets dedicated to the mood system.
- v1 storage: client-side (localStorage) alongside settings; can move to a
  server-side per-user store later.
- This editor + the basic mapping are the seed for the future full **mood
  visualizer**.

### Design implications to keep in mind from day one
- Build the UI with **theming/tokens** (colors, blur, opacity) so the look can
  shift heavily without rewrites.
- Treat track **mood** as derivable data so the visualizer can plug in later.
- Keep components flexible enough to host an animated/visual layer later.

---

## 9. Pages & User Workflows

### 9.1 Home (paste & process)
- Minimal, focused layout built around a **central "pill"** containing the URL
  input.
- **Glassmorphism** styling with **decorative patterns/motifs** in the
  background.
- **Adaptive background** with **three selectable modes** (default = first):
  1. **Aggregated library mood** (default): background reflects the average mood
     of favorites/recent tracks (colors derived from their BPM/keys).
  2. **Time of day**: shifts with day/night for a calmer/more intense ambience.
  3. **Random/subtle on load**: subtle neon pattern/color variations each visit,
     not data-driven.
  Mode is chosen in Settings; ties into the mood system (see §8).
- On paste/submit: a **stylish animation** plays during processing (up to ~2 min)
  if the user stays on the page.
- When analysis finishes, a **smooth transition** carries the animation into the
  **Player page** (see §9.2) — this is the default, signature experience.
- Processing runs in the **background** via the queue — the user can navigate
  away (e.g. to the Library) and come back; jobs keep running.

### 9.2 Player (signature experience)
- After the processing animation, a **fluid transition** leads to the **Player**
  where the freshly analyzed track **starts playing**, with a **mood** derived
  from its **BPM + key** driving the visuals.
- Layout inspired by a "result card": shows the **YouTube thumbnail/cover**, and
  the **colors of the artwork + the mood** influence the background and
  transitions (cohesive card ↔ background color flow).
- Displays the full info: **BPM, key, confidence (badge + %), duration**, etc.
- Controls: **Play / Pause** and a **Download** button (format chosen at
  download time, WAV/MP3).
- **Configurable behavior** (default ON): the auto-transition + auto-play to the
  Player. When **disabled** in Settings, no transition/playback happens — only a
  **Download** button is shown and the user can move on (more productivity-
  focused).
- Note: the Player is also a natural home for the future **mood visualizer**
  (see §8).

### 9.3 Library
- **Multiple views.**
- **All tracks view**: every downloaded + analyzed track.
- **Left sidebar (collapsible)**: sections **All tracks**, **Favorites**, then the
  list of **playlists**. Collapses to an **icon rail** to save space. Selecting an
  entry shows its tracks in the main area.
- **View toggle**: **cards ↔ list**, default **cards**, preference remembered.
  - **Cards**: thumbnail, waveform, visual/mood-forward.
  - **List**: dense, sortable/filterable rows (title, BPM, key, duration…).
- **Track card content**: thumbnail, title, **BPM**, **key**, **confidence**,
  **duration**, **waveform** (desired if it's a good fit), **favorite** toggle,
  and a **button to open the original YouTube link**.
- **Tags**: not shown directly on the card; visible **on hover / in the detail
  view** to keep the card clean (tags still drive search/filter, see §3).
- Plus the library functions from §3: search, sort/filter, integrated
  player + waveform, re-analyze/correct, tags & favorites.
- **Download** (with BPM/key in the name) is available **from each library card**
  and **from the Player** — format (WAV/MP3) chosen at download time.

### 9.4 Settings
- App preferences, including:
  - **Theme**: dark (default) / light.
  - **Language**: FR / EN.
  - **Auto-transition + auto-play to Player** (default ON; off = download-only).
  - **Player mood source**: circle-of-fifths→HSL (default) or thumbnail-derived
    palette + adjustment.
  - **Mood palette editor + presets** (create/save/switch palettes, see §8).
  - **Home background mode**: aggregated library mood (default) / time of day /
    random.
  - **Library default view**: cards (default) / list.
  - **Default export format** (WAV/MP3) and **filename pattern**.
  - **Duration limit** (default 20 min) and **queue concurrency** (default 2).
  - **Linked YouTube playlists** for Discovery (add/remove playlist links).
  - Note: the **YouTube Data API key** is a **backend secret (env var)**, not a
    UI/localStorage setting; Discovery calls are **proxied through the backend**
    so the key is never exposed to the client.

### 9.5 Discovery (simple in v1, smart engine later)
Goal: **discover instrumentals inside the app**, wrapped in the app's **mood**
aesthetic. The tab is **present from v1** in a simpler form so the structure
exists early; the smart recommendation engine comes later.

**v1 (simple, shipped)**
- **Linked YouTube playlists**: the user registers one or more YouTube playlist
  links in **Settings**. Workflow: while browsing YouTube during the day, the
  user saves liked tracks into their playlist; later, in the Discovery tab, those
  tracks appear and can be **played and imported** into the library.
- **Simple YouTube search** by keyword/tag, accessible from the Discovery tab.
- Feasibility: both rely on the **YouTube Data API** (`playlistItems.list`,
  `search.list`) — straightforward. Public playlist links work with an API key;
  private playlists / account sign-in (OAuth) can come later.
- **Security**: the API key lives as a **backend env var**; the frontend calls a
  backend endpoint that proxies YouTube requests (key never sent to the client).

**Later (smart engine)**
- A **home-grown recommendation engine** fed by the user's **linked playlists +
  library** (favorites, tags, dominant BPM/keys) to surface relevant tracks —
  **unique to the app, independent of YouTube's hidden algorithm**.
- Rationale recap: a personalized "your YouTube algorithm" feed is **not exposed**
  by the public API, so curation (user playlists) + our own ranking is the path.
- The recommendation logic is **deferred**; v1 lays the groundwork.

---

## 10. Tech Stack Summary

| Layer            | Choice                                                       |
|------------------|--------------------------------------------------------------|
| Frontend         | Next.js (App Router) + TypeScript                            |
| UI               | Tailwind CSS + shadcn/ui + Lucide icons                      |
| Waveform/player  | **wavesurfer.js**                                            |
| Animations       | **Framer Motion** (Home → Player transition, mood visuals)   |
| Client state     | **Zustand** (lightweight)                                    |
| Server state     | **TanStack Query** (fetching/caching, polling fallback)      |
| i18n             | **next-intl** (FR/EN, language switcher)                     |
| Discovery        | **YouTube Data API** (`playlistItems.list`, `search.list`)   |
| Visual style     | **Glassmorphism**, dark + light, neon/psychedelic accents     |
| Backend          | **Python + FastAPI**                                         |
| Download         | yt-dlp                                                       |
| Conversion       | ffmpeg                                                       |
| Analysis         | Essentia + librosa (ensemble) + confidence scoring          |
| Database         | PostgreSQL                                                   |
| Audio storage    | Named Docker volume                                          |
| Job queue        | **Postgres-backed (v1)**, abstraction to swap to Redis later  |
| Containerization | **Docker + Docker Compose (dedicated container per service)**|
| Hosting          | Container host, **likely Railway** (TBD); portable          |

---

## 11. Open Questions / To Decide Later

- Final deployment host (Railway vs Render vs Fly.io vs VPS).
- Auth provider when multi-user is added (email/password vs Google, etc.).
- Legal/ToS considerations around downloading YouTube content (for awareness).
- Discovery smart-engine design (ranking signals, when to build).

---

## 12. Decisions Log

| # | Decision                                                      |
|---|---------------------------------------------------------------|
| 1 | Users: **personal use first, multi-user later** (design for it)|
| 2 | Hosting: **deploy whole containerized stack to a container host, likely Railway** (TBD); not Vercel |
| 3 | Analysis: **open-source + custom ensemble + confidence + manual override** |
| 4 | Export: **WAV default, MP3 320 kbps optional**                 |
| 5 | Key notation: **standard musical notation** (e.g. `F# Minor`)  |
| 6 | Storage: **local files + PostgreSQL**                          |
| 7 | Filename: **`[BPM][Key] Title`**                               |
| 8 | Backend: **Python + FastAPI**                                  |
| 9 | Library features: **search/sort/filter, player+waveform, re-analyze & correct, tags & favorites** |
| 10| UI language: **bilingual FR/EN**                               |
| 11| Processing UX: **queue + per-track progress**                  |
| 12| **YouTube playlist import**: single videos in v1, playlist import later (distinct from user-created playlists, see #22) |
| 13| Infrastructure: **fully Dockerized from day one** (dedicated container per service, Docker Compose for local dev) |
| 14| Job queue: **Postgres-backed in v1**, behind an abstraction to migrate to Redis + RQ/arq later |
| 15| Design: **glassmorphism**, dark + light themes, neon/psychedelic accents; polished in v1, expected to evolve a lot |
| 16| Future signature feature: **mood visualizer** driven by extracted BPM + key |
| 17| Error handling: **clear per-track error + retry**, plus a **configurable duration limit** (default 20 min, see #37) |
| 18| Pages: **Home** (glass 'pill' URL input + animation), **Player** (signature), **Library** (all tracks + user playlists), **Settings**, **Discovery** (simple in v1) |
| 19| Background processing: **jobs continue while the user browses other pages** |
| 20| Track card: thumbnail, title, BPM, key, confidence, duration, waveform, favorite, **open-original-link** button |
| 21| Discovery: **simple version in v1** (linked YouTube playlists + keyword search via YouTube Data API); **smart recommendation engine deferred** (fed later by linked playlists + library affinity) |
| 22| User-created playlists: **included in v1** (`playlists` + `playlist_tracks` tables, sidebar) |
| 23| Confidence shown as a **colored badge (High/Med/Low) + exact % on hover/detail**; low confidence flagged |
| 24| Detection shows **best value + alternatives** (half/double-time, relative key); user can correct, **saved value persists** |
| 25| **BPM stored & displayed as decimal** (e.g. `140.0`) for precision |
| 26| **Player page** is the signature experience: fluid transition from Home, auto-play, **mood (BPM+key) drives visuals**, thumbnail-based colors, play/pause + download |
| 27| Player auto-transition + auto-play is **toggleable in Settings** (default ON; off = download-only flow) |
| 28| Theme **dark by default**, light available |
| 29| Download available **from library cards and the Player**; format (WAV/MP3) chosen at download time |
| 30| v1 needs a **basic mood→visual mapping** for the Player; full **mood visualizer** stays post-v1 |
| 31| Mood mapping has two sources (Settings): **circle-of-fifths→HSL (default)** and **thumbnail-derived palette + adjustment** (details in #39) |
| 32| Key filename abbreviation: minor=**`m`**, major=**`maj`**, accidentals `#`/`b` (e.g. `F#m`, `Cmaj`, `Ebmaj`) |
| 33| Real-time progress via **SSE** (`/api/jobs/stream`), polling fallback; WebSocket later if needed |
| 34| Frontend libs: **wavesurfer.js**, **Framer Motion**, **Zustand**, **TanStack Query**, **next-intl** |
| 35| v1 settings stored **client-side (localStorage)**; server-side per-user later |
| 36| **API and worker are separate containers from v1** (heavy analysis never blocks the API) |
| 37| Duration limit **default 20 min** (configurable); longer videos rejected pre-download |
| 38| Queue concurrency **configurable, default 2**; safe claiming via `FOR UPDATE SKIP LOCKED` |
| 39| Mood mapping default: **circle-of-fifths → HSL wheel** (major bright/saturated, minor dark/desaturated, BPM=energy) |
| 40| **In-app mood palette editor with savable presets** (fine-tune key→color over time); localStorage in v1 |
| 41| Library: **cards ↔ list toggle** (default cards, remembered); **tags on hover/detail only** |
| 42| Adaptive Home background: **3 modes** — aggregated library mood (default), time of day, random |
| 43| Mood hue anchor default: **C = red (0°), clockwise** along the circle of fifths; editable |
| 44| BPM energy curve default: **smoothstep over 60–180 BPM** (clamped), tunable via editor |
| 45| Library left sidebar: **collapsible** (All tracks / Favorites / playlists), collapses to icon rail |
| 46| Discovery v1 relies on **YouTube Data API**; key is a **backend env secret**, calls **proxied via backend** (never exposed to client); OAuth/private playlists later |
