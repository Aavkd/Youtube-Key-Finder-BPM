"""Tracks API — browse, correct, re-analyze, stream, and export the library.

Endpoints (prefix ``/api``):
- ``GET /tracks`` — list with search/sort/filter.
- ``GET /tracks/{id}`` — single track + metadata + alternatives.
- ``PATCH /tracks/{id}`` — manual correction + favorite toggle (D24).
- ``POST /tracks/{id}/reanalyze`` — enqueue a re-analysis job.
- ``DELETE /tracks/{id}`` — remove from the library.
- ``GET /tracks/{id}/audio`` — stream the WAV master (Range-aware).
- ``GET /tracks/{id}/download?format=wav|mp3`` — export with ``[BPM][Key] Title``.
"""

from __future__ import annotations

import tempfile
import uuid
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from starlette.background import BackgroundTask

from app.db import get_session
from app.models import Job, JobStatus, Tag, Track, TrackStatus, TrackTag
from app.schemas import TrackRead, TrackUpdate
from app.services.audio import AudioExportError, convert_to_mp3
from app.services.filename import build_filename

router = APIRouter(prefix="/tracks", tags=["tracks"])

_SORTABLE = {
    "created_at": Track.created_at,
    "updated_at": Track.updated_at,
    "bpm": Track.bpm,
    "key": Track.key,
    "title": Track.title,
    "duration_sec": Track.duration_sec,
}


async def _get_track_with_tags(session, track_id: uuid.UUID) -> Optional[Track]:
    result = await session.execute(
        select(Track)
        .options(selectinload(Track.tags))
        .where(Track.id == track_id)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=list[TrackRead])
async def list_tracks(
    session=Depends(get_session),
    search: Optional[str] = None,
    favorite: Optional[bool] = None,
    key: Optional[str] = None,
    tag: Optional[str] = None,
    status_filter: Optional[TrackStatus] = Query(default=None, alias="status"),
    bpm_min: Optional[float] = Query(default=None, ge=0),
    bpm_max: Optional[float] = Query(default=None, ge=0),
    sort: str = Query(default="created_at"),
    order: Literal["asc", "desc"] = "desc",
) -> list[Track]:
    """List tracks with search/sort/filter (SPEC §3, §5)."""
    stmt = select(Track).options(selectinload(Track.tags))

    if search:
        stmt = stmt.where(Track.title.ilike(f"%{search}%"))
    if favorite is not None:
        stmt = stmt.where(Track.is_favorite.is_(favorite))
    if key:
        stmt = stmt.where(Track.key == key)
    if status_filter is not None:
        stmt = stmt.where(Track.status == status_filter)
    if bpm_min is not None:
        stmt = stmt.where(Track.bpm >= bpm_min)
    if bpm_max is not None:
        stmt = stmt.where(Track.bpm <= bpm_max)
    if tag:
        stmt = (
            stmt.join(TrackTag, TrackTag.track_id == Track.id)
            .join(Tag, Tag.id == TrackTag.tag_id)
            .where(Tag.name == tag)
        )

    column = _SORTABLE.get(sort, Track.created_at)
    stmt = stmt.order_by(column.asc() if order == "asc" else column.desc())

    result = await session.execute(stmt)
    return list(result.scalars().unique().all())


@router.get("/{track_id}", response_model=TrackRead)
async def get_track(track_id: uuid.UUID, session=Depends(get_session)) -> Track:
    track = await _get_track_with_tags(session, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    return track


@router.patch("/{track_id}", response_model=TrackRead)
async def update_track(
    track_id: uuid.UUID,
    payload: TrackUpdate,
    session=Depends(get_session),
) -> Track:
    """Manual correction + favorite toggle.

    Setting ``bpm``/``key`` flips the matching ``*_manual`` flag so the saved
    value persists and is used everywhere (D24), unless the caller overrides
    the flag explicitly.
    """
    track = await _get_track_with_tags(session, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")

    data = payload.model_dump(exclude_unset=True)

    if "bpm" in data and data["bpm"] is not None and "bpm_manual" not in data:
        track.bpm_manual = True
    if "key" in data and data["key"] is not None and "key_manual" not in data:
        track.key_manual = True

    for field, value in data.items():
        setattr(track, field, value)

    await session.commit()
    refreshed = await _get_track_with_tags(session, track_id)
    assert refreshed is not None
    return refreshed


@router.post(
    "/{track_id}/reanalyze",
    status_code=status.HTTP_202_ACCEPTED,
)
async def reanalyze_track(
    track_id: uuid.UUID, session=Depends(get_session)
) -> dict[str, str]:
    """Enqueue a fresh job that re-runs download + analysis for this track.

    The job is linked to the existing track, so the worker reuses its row
    (re-downloading and re-analyzing) rather than creating a duplicate.
    """
    track = await session.get(Track, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")

    job = Job(
        source_url=track.source_url,
        status=JobStatus.queued,
        progress=0,
        track_id=track.id,
    )
    track.status = TrackStatus.queued
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return {"job_id": str(job.id), "track_id": str(track_id)}


@router.delete("/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_track(track_id: uuid.UUID, session=Depends(get_session)):
    track = await session.get(Track, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    # Best-effort removal of the stored audio file.
    if track.audio_path_wav:
        try:
            Path(track.audio_path_wav).unlink(missing_ok=True)
        except OSError:
            pass
    await session.delete(track)
    await session.commit()


def _require_audio(track: Optional[Track]) -> Path:
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    if not track.audio_path_wav:
        raise HTTPException(status_code=409, detail="Track has no audio yet")
    path = Path(track.audio_path_wav)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio file is missing")
    return path


@router.get("/{track_id}/audio")
async def stream_audio(
    track_id: uuid.UUID, session=Depends(get_session)
) -> FileResponse:
    """Stream the WAV master for the in-app player (Range-aware)."""
    track = await session.get(Track, track_id)
    path = _require_audio(track)
    return FileResponse(path, media_type="audio/wav")


@router.get("/{track_id}/download")
async def download_track(
    track_id: uuid.UUID,
    session=Depends(get_session),
    format: Literal["wav", "mp3"] = "wav",
) -> FileResponse:
    """Export the track with the ``[BPM][Key] Title`` filename (SPEC §7)."""
    track = await _get_track_with_tags(session, track_id)
    src = _require_audio(track)
    assert track is not None

    filename = build_filename(
        bpm=track.bpm, key=track.key, title=track.title, ext=format
    )

    if format == "wav":
        return FileResponse(
            src, media_type="audio/wav", filename=filename
        )

    # MP3: transcode to a temp file at 320 kbps and clean up after sending.
    tmp = Path(tempfile.gettempdir()) / f"kf-export-{uuid.uuid4().hex}.mp3"
    try:
        await convert_to_mp3(src, tmp)
    except AudioExportError as exc:
        tmp.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return FileResponse(
        tmp,
        media_type="audio/mpeg",
        filename=filename,
        background=BackgroundTask(lambda: tmp.unlink(missing_ok=True)),
    )
