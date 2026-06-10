"""Queue abstraction tests: enqueue, claim, progress, complete, fail, retry."""

import uuid

from sqlalchemy import select

from app.models import Job, JobStatus, Track, TrackStatus


async def _get_job(session_factory, job_id) -> Job:
    async with session_factory() as session:
        return (
            await session.execute(select(Job).where(Job.id == job_id))
        ).scalar_one()


async def test_enqueue_creates_queued_job(queue, session_factory):
    job_id = await queue.enqueue("https://youtu.be/abc123")
    job = await _get_job(session_factory, job_id)
    assert job.status is JobStatus.queued
    assert job.progress == 0


async def test_claim_marks_jobs_downloading(queue, session_factory):
    await queue.enqueue("https://youtu.be/a")
    await queue.enqueue("https://youtu.be/b")

    claimed = await queue.claim(limit=5)
    assert len(claimed) == 2
    for c in claimed:
        job = await _get_job(session_factory, c.id)
        assert job.status is JobStatus.downloading


async def test_claim_respects_limit_and_no_double_claim(queue, session_factory):
    ids = [await queue.enqueue(f"https://youtu.be/{i}") for i in range(3)]

    first = await queue.claim(limit=2)
    assert len(first) == 2  # honors the limit

    # A second claim only sees the remaining queued job — never re-claims.
    second = await queue.claim(limit=5)
    assert len(second) == 1

    claimed_ids = {c.id for c in first + second}
    assert claimed_ids == set(ids)  # each job claimed exactly once

    # A third claim finds nothing left queued.
    assert await queue.claim(limit=5) == []


async def test_claim_orders_by_created_at(queue):
    first_id = await queue.enqueue("https://youtu.be/first")
    second_id = await queue.enqueue("https://youtu.be/second")
    claimed = await queue.claim(limit=1)
    assert claimed[0].id == first_id  # oldest first
    remaining = await queue.claim(limit=1)
    assert remaining[0].id == second_id


async def test_progress_updates_status_and_clamps(queue, session_factory):
    job_id = await queue.enqueue("https://youtu.be/a")
    await queue.progress(job_id, 150, JobStatus.analyzing)  # clamps to 100
    job = await _get_job(session_factory, job_id)
    assert job.progress == 100
    assert job.status is JobStatus.analyzing


async def test_complete_links_track_and_sets_done(queue, session_factory):
    job_id = await queue.enqueue("https://youtu.be/a")
    track_id = uuid.uuid4()
    async with session_factory() as session:
        session.add(Track(id=track_id, source_url="https://youtu.be/a"))
        await session.commit()

    await queue.complete(job_id, track_id)
    job = await _get_job(session_factory, job_id)
    assert job.status is JobStatus.done
    assert job.progress == 100
    assert job.track_id == track_id


async def test_fail_records_error_message(queue, session_factory):
    job_id = await queue.enqueue("https://youtu.be/a")
    await queue.fail(job_id, "This video is unavailable or has been removed.")
    job = await _get_job(session_factory, job_id)
    assert job.status is JobStatus.error
    assert "unavailable" in job.error_msg


async def test_retry_requeues_failed_job_and_resets_track(queue, session_factory):
    job_id = await queue.enqueue("https://youtu.be/a")
    track_id = uuid.uuid4()
    async with session_factory() as session:
        session.add(
            Track(
                id=track_id,
                source_url="https://youtu.be/a",
                status=TrackStatus.error,
            )
        )
        job = (
            await session.execute(select(Job).where(Job.id == job_id))
        ).scalar_one()
        job.track_id = track_id
        job.status = JobStatus.error
        job.error_msg = "boom"
        await session.commit()

    assert await queue.retry(job_id) is True

    job = await _get_job(session_factory, job_id)
    assert job.status is JobStatus.queued
    assert job.progress == 0
    assert job.error_msg is None

    async with session_factory() as session:
        track = await session.get(Track, track_id)
        assert track.status is TrackStatus.queued

    # The requeued job is claimable again.
    claimed = await queue.claim(limit=5)
    assert {c.id for c in claimed} == {job_id}


async def test_retry_missing_job_returns_false(queue):
    assert await queue.retry(uuid.uuid4()) is False
