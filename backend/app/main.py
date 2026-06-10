"""Key Finder backend (FastAPI).

Phase 4: full REST API surface (jobs, tracks, playlists, tags) plus an SSE
progress channel, alongside the Phase 0 health endpoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import discovery, health, jobs, playlists, tags, tracks

app = FastAPI(
    title="Key Finder API",
    version="0.1.0",
    description="Import, analyze (BPM + key), and manage instrumentals.",
)

# CORS: the frontend (browser) calls this API directly via
# NEXT_PUBLIC_API_BASE_URL. Open in dev; tighten before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(tracks.router, prefix="/api")
app.include_router(playlists.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(discovery.router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "key-finder-backend", "docs": "/docs"}
