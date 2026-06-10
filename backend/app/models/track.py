"""`tracks` table — the central library entity (SPEC §6)."""

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Boolean, Enum, Integer, Numeric, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import TrackStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.types import JSONType

if TYPE_CHECKING:
    from app.models.playlist import PlaylistTrack
    from app.models.tag import Tag


class Track(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An imported, analyzed instrumental and its metadata."""

    __tablename__ = "tracks"

    # Ownership (nullable in v1; required once multi-user lands — D1).
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)

    # Source.
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    youtube_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # BPM (stored as decimal for precision — D25).
    bpm: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    bpm_alternatives: Mapped[Optional[Any]] = mapped_column(JSONType, nullable=True)
    bpm_confidence: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 3), nullable=True
    )

    # Key (standard notation, e.g. "F# Minor" — D5).
    key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_alternatives: Mapped[Optional[Any]] = mapped_column(JSONType, nullable=True)
    key_confidence: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 3), nullable=True
    )

    # Manual-correction flags (D24).
    bpm_manual: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    key_manual: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    is_favorite: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Derived Player colors (from key/BPM/thumbnail).
    mood_palette: Mapped[Optional[Any]] = mapped_column(JSONType, nullable=True)

    audio_path_wav: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[TrackStatus] = mapped_column(
        Enum(TrackStatus, name="track_status"),
        default=TrackStatus.queued,
        nullable=False,
    )

    # Relationships.
    tags: Mapped[list["Tag"]] = relationship(
        secondary="track_tags", back_populates="tracks"
    )
    playlist_associations: Mapped[list["PlaylistTrack"]] = relationship(
        back_populates="track", cascade="all, delete-orphan"
    )
