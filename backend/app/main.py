"""Key Finder backend (FastAPI).

Phase 4: full REST API surface (jobs, tracks, playlists, tags) plus an SSE
progress channel, alongside the Phase 0 health endpoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import TokenAuthMiddleware
from app.config import settings
from app.routers import discovery, health, jobs, playlists, tags, tracks

app = FastAPI(
    title="Key Finder API",
    version="0.1.0",
    description="Import, analyze (BPM + key), and manage instrumentals.",
)

# Middleware order: added first → runs last (after CORS), added last → runs first.
# 1) Auth — added first so it executes after CORS handles preflight.
app.add_middleware(TokenAuthMiddleware)

# 2) CORS — added last so it executes first (handles OPTIONS preflight before auth).
_origins = [o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins != ["*"] else ["*"],
    allow_origin_regex=settings.cors_allow_origin_regex or None,
    allow_credentials=False,  # token in header/query, no cookies
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
