"""ORM models for the worker (mirror of backend SPEC §6).

Only the entities the worker touches are mapped: `tracks` and `jobs`. These
mirror the columns the backend's Alembic migration creates so the worker can
insert/update rows against the shared PostgreSQL database. Relationships
(tags/playlists) are omitted — the worker never needs them.

Portable column choices keep the same models working on SQLite (tests) and
PostgreSQL (production): JSONB → generic JSON, native uuid → CHAR(36).
"""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

# JSONB on PostgreSQL, falling back to generic JSON (e.g. SQLite) elsewhere.
JSONType = JSON().with_variant(JSONB(), "postgresql")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TrackStatus(str, enum.Enum):
    """Lifecycle of a track row (ends in `ready` or `error`)."""

    queued = "queued"
    downloading = "downloading"
    analyzing = "analyzing"
    ready = "ready"
    error = "error"


class JobStatus(str, enum.Enum):
    """Lifecycle of a processing-queue job row (ends in `done` or `error`)."""

    queued = "queued"
    downloading = "downloading"
    analyzing = "analyzing"
    done = "done"
    error = "error"


class Track(Base):
    """An imported instrumental and its metadata (mirror of backend model)."""

    __tablename__ = "tracks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)

    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    youtube_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    bpm: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    bpm_alternatives: Mapped[Optional[Any]] = mapped_column(JSONType, nullable=True)
    bpm_confidence: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 3), nullable=True
    )

    key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_alternatives: Mapped[Optional[Any]] = mapped_column(JSONType, nullable=True)
    key_confidence: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 3), nullable=True
    )

    bpm_manual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    key_manual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    mood_palette: Mapped[Optional[Any]] = mapped_column(JSONType, nullable=True)
    audio_path_wav: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[TrackStatus] = mapped_column(
        Enum(TrackStatus, name="track_status"),
        default=TrackStatus.queued,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


class Job(Base):
    """A unit of work: download → convert → analyze a submitted URL."""

    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"),
        default=JobStatus.queued,
        nullable=False,
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    track_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
