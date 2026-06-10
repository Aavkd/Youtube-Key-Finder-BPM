"""Enumerations used by the data model (SPEC §6).

Status lifecycles differ between a job and its resulting track:
- a **job** ends in `done` (or `error`);
- a **track** ends in `ready` (or `error`).
"""

import enum


class TrackStatus(str, enum.Enum):
    """Lifecycle of a track row."""

    queued = "queued"
    downloading = "downloading"
    analyzing = "analyzing"
    ready = "ready"
    error = "error"


class JobStatus(str, enum.Enum):
    """Lifecycle of a processing-queue job row."""

    queued = "queued"
    downloading = "downloading"
    analyzing = "analyzing"
    done = "done"
    error = "error"
