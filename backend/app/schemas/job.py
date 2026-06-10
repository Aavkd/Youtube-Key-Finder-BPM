"""Pydantic schemas for processing-queue jobs."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import JobStatus
from app.schemas.common import ORMModel


class JobCreate(BaseModel):
    """Submit a YouTube URL to the queue."""

    source_url: str = Field(min_length=1)


class JobUpdate(BaseModel):
    """Progress/status mutations performed by the worker."""

    status: Optional[JobStatus] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    error_msg: Optional[str] = None
    track_id: Optional[uuid.UUID] = None


class JobRead(ORMModel):
    id: uuid.UUID
    source_url: str
    status: JobStatus
    progress: int
    error_msg: Optional[str] = None
    track_id: Optional[uuid.UUID] = None
    created_at: datetime
