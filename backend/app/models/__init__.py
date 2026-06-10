"""SQLAlchemy ORM models (SPEC §6).

Importing this package registers every model on `Base.metadata`, which
Alembic autogeneration and `create_all` rely on.
"""

from app.models.enums import JobStatus, TrackStatus
from app.models.job import Job
from app.models.playlist import Playlist, PlaylistTrack
from app.models.tag import Tag, TrackTag
from app.models.track import Track

__all__ = [
    "Job",
    "JobStatus",
    "Playlist",
    "PlaylistTrack",
    "Tag",
    "Track",
    "TrackStatus",
    "TrackTag",
]
