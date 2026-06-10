"""Discovery API — proxies YouTube Data API so the key never reaches the client (D46).

Endpoints (prefix ``/api``):
- ``GET /discovery/search?q=`` — keyword search via YouTube ``search.list``.
- ``GET /discovery/playlist?url=|id=`` — playlist items via YouTube ``playlistItems.list``.
"""

from __future__ import annotations

from typing import Optional
from urllib.parse import parse_qs, urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/discovery", tags=["discovery"])

_YT_BASE = "https://www.googleapis.com/youtube/v3"


class DiscoveryItem(BaseModel):
    youtube_id: str
    title: str
    channel: str
    thumbnail_url: Optional[str] = None


def _require_api_key() -> str:
    """Raise 503 if YOUTUBE_API_KEY is not configured."""
    if not settings.youtube_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "YOUTUBE_API_KEY is not configured. "
                "Set it as a backend environment variable to enable Discovery."
            ),
        )
    return settings.youtube_api_key


def _extract_playlist_id(value: str) -> str:
    """Return the playlist ID from a YouTube URL, or pass the value through unchanged."""
    try:
        qs = parse_qs(urlparse(value).query)
        if "list" in qs:
            return qs["list"][0]
    except Exception:
        pass
    return value


@router.get("/search", response_model=list[DiscoveryItem])
async def search_videos(
    q: str = Query(..., min_length=1, description="Keyword / tag search query"),
    max_results: int = Query(20, ge=1, le=50, description="Number of results (max 50)"),
) -> list[DiscoveryItem]:
    """Keyword search via YouTube Data API search.list (key stays on the server, D46)."""
    key = _require_api_key()

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{_YT_BASE}/search",
            params={
                "key": key,
                "q": q,
                "part": "snippet",
                "type": "video",
                "maxResults": max_results,
            },
        )

    if r.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"YouTube API error {r.status_code}: {r.text[:300]}",
        )

    items: list[DiscoveryItem] = []
    for item in r.json().get("items", []):
        vid_id = item.get("id", {}).get("videoId")
        if not vid_id:
            continue
        sn = item.get("snippet", {})
        thumbs = sn.get("thumbnails", {})
        thumb = thumbs.get("medium", {}).get("url") or thumbs.get("default", {}).get("url")
        items.append(
            DiscoveryItem(
                youtube_id=vid_id,
                title=sn.get("title", ""),
                channel=sn.get("channelTitle", ""),
                thumbnail_url=thumb,
            )
        )
    return items


@router.get("/playlist", response_model=list[DiscoveryItem])
async def get_playlist_items(
    url: Optional[str] = Query(None, description="YouTube playlist URL"),
    id: Optional[str] = Query(None, description="YouTube playlist ID"),
    max_results: int = Query(50, ge=1, le=50),
) -> list[DiscoveryItem]:
    """Playlist items via YouTube Data API playlistItems.list (key stays on the server, D46)."""
    key = _require_api_key()

    raw = url or id
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide either 'url' or 'id' query parameter.",
        )

    playlist_id = _extract_playlist_id(raw)

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{_YT_BASE}/playlistItems",
            params={
                "key": key,
                "playlistId": playlist_id,
                "part": "snippet,contentDetails",
                "maxResults": max_results,
            },
        )

    if r.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found or is private.",
        )
    if r.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"YouTube API error {r.status_code}: {r.text[:300]}",
        )

    items: list[DiscoveryItem] = []
    for item in r.json().get("items", []):
        sn = item.get("snippet", {})
        vid_id = (
            sn.get("resourceId", {}).get("videoId")
            or item.get("contentDetails", {}).get("videoId")
        )
        if not vid_id:
            continue
        thumbs = sn.get("thumbnails", {})
        thumb = thumbs.get("medium", {}).get("url") or thumbs.get("default", {}).get("url")
        channel = sn.get("videoOwnerChannelTitle") or sn.get("channelTitle", "")
        items.append(
            DiscoveryItem(
                youtube_id=vid_id,
                title=sn.get("title", ""),
                channel=channel,
                thumbnail_url=thumb,
            )
        )
    return items
