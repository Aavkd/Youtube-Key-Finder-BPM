"""Pydantic schemas for tracks."""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.enums import TrackStatus
from app.schemas.common import ORMModel
from app.schemas.tag import TagRead


class TrackBase(BaseModel):
    source_url: str
    youtube_id: Optional[str] = None
    title: Optional[str] = None
    duration_sec: Optional[int] = Field(default=None, ge=0)
    thumbnail_url: Optional[str] = None


class TrackCreate(TrackBase):
    """Payload to create a track (typically by the worker pipeline)."""

    user_id: Optional[uuid.UUID] = None
    status: TrackStatus = TrackStatus.queued


class TrackUpdate(BaseModel):
    """Manual correction + favorite toggle (D24).

    Setting `bpm`/`key` is expected to also flip the matching `*_manual`
    flag in the service layer (Phase 4).
    """

    bpm: Optional[float] = Field(default=None, ge=0)
    bpm_alternatives: Optional[Any] = None
    bpm_confidence: Optional[float] = Field(default=None, ge=0, le=1)
    key: Optional[str] = None
    key_alternatives: Optional[Any] = None
    key_confidence: Optional[float] = Field(default=None, ge=0, le=1)
    bpm_manual: Optional[bool] = None
    key_manual: Optional[bool] = None
    is_favorite: Optional[bool] = None
    mood_palette: Optional[Any] = None
    status: Optional[TrackStatus] = None


class TrackRead(ORMModel, TrackBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    bpm: Optional[float] = None
    bpm_alternatives: Optional[Any] = None
    bpm_confidence: Optional[float] = None
    key: Optional[str] = None
    key_alternatives: Optional[Any] = None
    key_confidence: Optional[float] = None
    bpm_manual: bool
    key_manual: bool
    is_favorite: bool
    mood_palette: Optional[Any] = None
    audio_path_wav: Optional[str] = None
    status: TrackStatus
    created_at: datetime
    updated_at: datetime
    tags: list[TagRead] = []
