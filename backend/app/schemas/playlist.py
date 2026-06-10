"""Pydantic schemas for playlists."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class PlaylistBase(BaseModel):
    name: str = Field(min_length=1)
    user_id: Optional[uuid.UUID] = None


class PlaylistCreate(PlaylistBase):
    pass


class PlaylistUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)


class PlaylistTrackRead(ORMModel):
    track_id: uuid.UUID
    position: int


class PlaylistTrackAdd(BaseModel):
    track_id: uuid.UUID
    position: Optional[int] = Field(default=None, ge=0)


class PlaylistReorder(BaseModel):
    """Full ordering of a playlist's tracks (positions assigned by index)."""

    track_ids: list[uuid.UUID] = Field(min_length=1)


class PlaylistRead(ORMModel, PlaylistBase):
    id: uuid.UUID
    created_at: datetime
    track_associations: list[PlaylistTrackRead] = []
