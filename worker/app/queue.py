"""Job queue abstraction (D14).

A thin interface (`JobQueue`) over the processing queue so a Redis/RQ backend
can replace the Postgres-backed implementation later without touching the
pipeline. `PostgresJobQueue` *is* the `jobs` table: it claims work with
`SELECT ... FOR UPDATE SKIP LOCKED` so concurrent workers never double-claim a
job (D38).
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from app.models import Job, JobStatus, Track, TrackStatus


@dataclass(frozen=True)
class ClaimedJob:
    """A snapshot of a claimed job, detached from any session."""

    id: uuid.UUID
    source_url: str
    track_id: Optional[uuid.UUID]


class JobQueue(ABC):
    """Interface for the processing queue (enqueue/claim/progress/complete/fail)."""

    @abstractmethod
    async def enqueue(self, source_url: str) -> uuid.UUID:
        """Add a URL to the queue; return the new job id."""

    @abstractmethod
    async def claim(self, limit: int) -> list[ClaimedJob]:
        """Atomically claim up to `limit` queued jobs, marking them in-progress."""

    @abstractmethod
    async def progress(
        self, job_id: uuid.UUID, progress: int, status: Optional[JobStatus] = None
    ) -> None:
        """Update a job's progress (0–100) and optionally its status."""

    @abstractmethod
    async def complete(self, job_id: uuid.UUID, track_id: uuid.UUID) -> None:
        """Mark a job `done`, linking the produced track."""

    @abstractmethod
    async def fail(self, job_id: uuid.UUID, error_msg: str) -> None:
        """Mark a job `error` with a human-readable message."""

    @abstractmethod
    async def retry(self, job_id: uuid.UUID) -> bool:
        """Reset a failed job to `queued`; return False if it does not exist."""


class PostgresJobQueue(JobQueue):
    """Postgres-backed queue: the `jobs` table polled by the worker."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self._session_factory = session_factory

    async def enqueue(self, source_url: str) -> uuid.UUID:
        async with self._session_factory() as session:
            job = Job(source_url=source_url, status=JobStatus.queued, progress=0)
            session.add(job)
            await session.commit()
            return job.id

    async def claim(self, limit: int) -> list[ClaimedJob]:
        if limit <= 0:
            return []
        async with self._session_factory() as session:
            # FOR UPDATE SKIP LOCKED on PostgreSQL: rows locked by a concurrent
            # worker are skipped, so two workers never pick the same job. On
            # SQLite (tests) the clause is a no-op but writes are serialized,
            # so the claim is still race-free there.
            stmt = (
                select(Job)
                .where(Job.status == JobStatus.queued)
                .order_by(Job.created_at)
                .limit(limit)
                .with_for_update(skip_locked=True)
            )
            jobs = list((await session.execute(stmt)).scalars().all())
            claimed = [
                ClaimedJob(id=j.id, source_url=j.source_url, track_id=j.track_id)
                for j in jobs
            ]
            for job in jobs:
                job.status = JobStatus.downloading
                job.progress = 0
                job.error_msg = None
            await session.commit()
            return claimed

    async def progress(
        self, job_id: uuid.UUID, progress: int, status: Optional[JobStatus] = None
    ) -> None:
        async with self._session_factory() as session:
            job = await session.get(Job, job_id)
            if job is None:
                return
            job.progress = max(0, min(100, progress))
            if status is not None:
                job.status = status
            await session.commit()

    async def complete(self, job_id: uuid.UUID, track_id: uuid.UUID) -> None:
        async with self._session_factory() as session:
            job = await session.get(Job, job_id)
            if job is None:
                return
            job.status = JobStatus.done
            job.progress = 100
            job.error_msg = None
            job.track_id = track_id
            await session.commit()

    async def fail(self, job_id: uuid.UUID, error_msg: str) -> None:
        async with self._session_factory() as session:
            job = await session.get(Job, job_id)
            if job is None:
                return
            job.status = JobStatus.error
            job.error_msg = error_msg
            await session.commit()

    async def retry(self, job_id: uuid.UUID) -> bool:
        async with self._session_factory() as session:
            job = await session.get(Job, job_id)
            if job is None:
                return False
            job.status = JobStatus.queued
            job.progress = 0
            job.error_msg = None
            # Reset any partially-produced track so the retry re-runs cleanly.
            if job.track_id is not None:
                track = await session.get(Track, job.track_id)
                if track is not None:
                    track.status = TrackStatus.queued
            await session.commit()
            return True
