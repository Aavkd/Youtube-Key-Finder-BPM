"""`jobs` table — the Postgres-backed processing queue (SPEC §6)."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import JobStatus
from app.models.mixins import UUIDPrimaryKeyMixin, _utcnow


class Job(UUIDPrimaryKeyMixin, Base):
    """A unit of work: download → convert → analyze a submitted URL."""

    __tablename__ = "jobs"

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
