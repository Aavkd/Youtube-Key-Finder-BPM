"""Playlists API — full CRUD plus add/remove/reorder of tracks (D22).

Endpoints (prefix ``/api``):
- ``GET /playlists`` / ``POST /playlists``
- ``GET /playlists/{id}`` / ``PATCH /playlists/{id}`` / ``DELETE /playlists/{id}``
- ``POST /playlists/{id}/tracks`` — add a track (optional ``position``).
- ``DELETE /playlists/{id}/tracks/{track_id}`` — remove a track.
- ``PUT /playlists/{id}/tracks/order`` — reorder via an ordered id list.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.models import Playlist, PlaylistTrack, Track
from app.schemas import (
    PlaylistCreate,
    PlaylistRead,
    PlaylistReorder,
    PlaylistTrackAdd,
    PlaylistUpdate,
)

router = APIRouter(prefix="/playlists", tags=["playlists"])


async def _get_playlist(session, playlist_id: uuid.UUID) -> Playlist | None:
    # `populate_existing` forces the eager load to refresh an already
    # identity-mapped playlist's collection (otherwise a stale, previously
    # loaded `track_associations` would be returned after an insert).
    result = await session.execute(
        select(Playlist)
        .options(selectinload(Playlist.track_associations))
        .where(Playlist.id == playlist_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def _require_playlist(session, playlist_id: uuid.UUID) -> Playlist:
    playlist = await _get_playlist(session, playlist_id)
    if playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist


@router.get("", response_model=list[PlaylistRead])
async def list_playlists(session=Depends(get_session)) -> list[Playlist]:
    result = await session.execute(
        select(Playlist)
        .options(selectinload(Playlist.track_associations))
        .order_by(Playlist.created_at.desc())
    )
    return list(result.scalars().unique().all())


@router.post("", response_model=PlaylistRead, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    payload: PlaylistCreate, session=Depends(get_session)
) -> Playlist:
    playlist = Playlist(name=payload.name, user_id=payload.user_id)
    session.add(playlist)
    await session.commit()
    created = await _get_playlist(session, playlist.id)
    assert created is not None
    return created


@router.get("/{playlist_id}", response_model=PlaylistRead)
async def get_playlist(
    playlist_id: uuid.UUID, session=Depends(get_session)
) -> Playlist:
    return await _require_playlist(session, playlist_id)


@router.patch("/{playlist_id}", response_model=PlaylistRead)
async def update_playlist(
    playlist_id: uuid.UUID,
    payload: PlaylistUpdate,
    session=Depends(get_session),
) -> Playlist:
    playlist = await _require_playlist(session, playlist_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(playlist, field, value)
    await session.commit()
    refreshed = await _get_playlist(session, playlist_id)
    assert refreshed is not None
    return refreshed


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(
    playlist_id: uuid.UUID, session=Depends(get_session)
):
    playlist = await session.get(Playlist, playlist_id)
    if playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    await session.delete(playlist)
    await session.commit()


@router.post(
    "/{playlist_id}/tracks",
    response_model=PlaylistRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_track(
    playlist_id: uuid.UUID,
    payload: PlaylistTrackAdd,
    session=Depends(get_session),
) -> Playlist:
    """Add a track to the playlist; appends to the end unless ``position`` given."""
    playlist = await _require_playlist(session, playlist_id)

    track = await session.get(Track, payload.track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")

    existing = await session.get(
        PlaylistTrack, {"playlist_id": playlist_id, "track_id": payload.track_id}
    )
    if existing is not None:
        raise HTTPException(
            status_code=409, detail="Track already in playlist"
        )

    if payload.position is None:
        max_pos = await session.scalar(
            select(func.max(PlaylistTrack.position)).where(
                PlaylistTrack.playlist_id == playlist_id
            )
        )
        position = 0 if max_pos is None else int(max_pos) + 1
    else:
        position = payload.position

    session.add(
        PlaylistTrack(
            playlist_id=playlist_id,
            track_id=payload.track_id,
            position=position,
        )
    )
    await session.commit()
    refreshed = await _get_playlist(session, playlist_id)
    assert refreshed is not None
    return refreshed


@router.delete(
    "/{playlist_id}/tracks/{track_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_track(
    playlist_id: uuid.UUID,
    track_id: uuid.UUID,
    session=Depends(get_session),
):
    assoc = await session.get(
        PlaylistTrack, {"playlist_id": playlist_id, "track_id": track_id}
    )
    if assoc is None:
        raise HTTPException(status_code=404, detail="Track not in playlist")
    await session.delete(assoc)
    await session.commit()


@router.put("/{playlist_id}/tracks/order", response_model=PlaylistRead)
async def reorder_tracks(
    playlist_id: uuid.UUID,
    payload: PlaylistReorder,
    session=Depends(get_session),
) -> Playlist:
    """Reassign positions from the given ordered list of track ids."""
    playlist = await _require_playlist(session, playlist_id)

    current = {a.track_id: a for a in playlist.track_associations}
    if set(payload.track_ids) != set(current.keys()):
        raise HTTPException(
            status_code=400,
            detail="track_ids must match exactly the playlist's tracks",
        )

    for index, track_id in enumerate(payload.track_ids):
        current[track_id].position = index
    await session.commit()
    refreshed = await _get_playlist(session, playlist_id)
    assert refreshed is not None
    return refreshed
