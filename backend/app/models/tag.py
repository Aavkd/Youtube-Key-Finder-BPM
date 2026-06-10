"""`tags` + `track_tags` tables (SPEC §6)."""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.track import Track


class Tag(UUIDPrimaryKeyMixin, Base):
    """A custom, user-defined label attached to tracks."""

    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)

    tracks: Mapped[list["Track"]] = relationship(
        secondary="track_tags", back_populates="tags"
    )


class TrackTag(Base):
    """Association row linking a track and a tag (many-to-many)."""

    __tablename__ = "track_tags"

    track_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )
