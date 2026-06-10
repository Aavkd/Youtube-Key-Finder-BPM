"""Jobs API — submit URLs, inspect the queue, retry, and stream progress.

Endpoints (prefix ``/api``):
- ``POST /jobs`` — submit a YouTube URL; creates a queued job.
- ``GET /jobs`` — list the queue (newest first).
- ``GET /jobs/{id}`` — single job status.
- ``POST /jobs/{id}/retry`` — re-queue a failed job (D17).
- ``GET /jobs/stream`` — Server-Sent Events progress channel (D33).
"""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db import get_session, get_session_factory
from app.models import Job, JobStatus, Track, TrackStatus
from app.schemas import JobCreate, JobRead

router = APIRouter(prefix="/jobs", tags=["jobs"])

# How often the SSE stream polls the queue for changes.
_SSE_POLL_SECONDS = 1.0


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate, session: AsyncSession = Depends(get_session)
) -> Job:
    """Submit a URL to the processing queue (worker picks it up, D14)."""
    job = Job(source_url=payload.source_url, status=JobStatus.queued, progress=0)
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return job


@router.get("", response_model=list[JobRead])
async def list_jobs(session: AsyncSession = Depends(get_session)) -> list[Job]:
    """List all jobs, newest first (polling fallback for SSE, D33)."""
    result = await session.execute(select(Job).order_by(Job.created_at.desc()))
    return list(result.scalars().all())


@router.get("/stream")
async def stream_jobs(
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> StreamingResponse:
    """Server-Sent Events stream of job status/progress/errors (D33).

    Emits an initial snapshot immediately, then pushes a fresh snapshot
    whenever any job's ``status``/``progress``/``error_msg`` changes.
    """

    async def event_generator() -> AsyncGenerator[bytes, None]:
        last_signature: str | None = None
        while True:
            async with factory() as session:
                result = await session.execute(
                    select(Job).order_by(Job.created_at.desc())
                )
                jobs = [
                    JobRead.model_validate(j).model_dump(mode="json")
                    for j in result.scalars().all()
                ]
            signature = json.dumps(jobs, sort_keys=True)
            if signature != last_signature:
                last_signature = signature
                payload = json.dumps(jobs)
                yield f"event: jobs\ndata: {payload}\n\n".encode()
            else:
                # Heartbeat comment keeps proxies/clients from timing out.
                yield b": keep-alive\n\n"
            await asyncio.sleep(_SSE_POLL_SECONDS)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{job_id}", response_model=JobRead)
async def get_job(
    job_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> Job:
    job = await session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_job(
    job_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> Response:
    """Delete a failed job and its orphaned track (if not ready)."""
    job = await session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.error:
        raise HTTPException(
            status_code=409, detail="Only failed jobs can be deleted"
        )
    if job.track_id is not None:
        track = await session.get(Track, job.track_id)
        if track is not None and track.status != TrackStatus.ready:
            await session.delete(track)
    await session.delete(job)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{job_id}/retry", response_model=JobRead)
async def retry_job(
    job_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> Job:
    """Reset a failed job to ``queued`` so the worker re-runs it (D17)."""
    job = await session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.error:
        raise HTTPException(
            status_code=409, detail="Only failed jobs can be retried"
        )
    job.status = JobStatus.queued
    job.progress = 0
    job.error_msg = None
    # Reset any partially-produced track so the retry re-runs cleanly.
    if job.track_id is not None:
        track = await session.get(Track, job.track_id)
        if track is not None:
            track.status = TrackStatus.queued
    await session.commit()
    await session.refresh(job)
    return job
