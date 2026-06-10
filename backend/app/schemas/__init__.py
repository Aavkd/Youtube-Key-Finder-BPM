"""Pydantic schemas for API serialization/validation (SPEC §6)."""

from app.schemas.job import JobCreate, JobRead, JobUpdate
from app.schemas.playlist import (
    PlaylistCreate,
    PlaylistRead,
    PlaylistReorder,
    PlaylistTrackAdd,
    PlaylistTrackRead,
    PlaylistUpdate,
)
from app.schemas.tag import TagCreate, TagRead, TagUpdate
from app.schemas.track import TrackCreate, TrackRead, TrackUpdate

__all__ = [
    "JobCreate",
    "JobRead",
    "JobUpdate",
    "PlaylistCreate",
    "PlaylistRead",
    "PlaylistReorder",
    "PlaylistTrackAdd",
    "PlaylistTrackRead",
    "PlaylistUpdate",
    "TagCreate",
    "TagRead",
    "TagUpdate",
    "TrackCreate",
    "TrackRead",
    "TrackUpdate",
]
