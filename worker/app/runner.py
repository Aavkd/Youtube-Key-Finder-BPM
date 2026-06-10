"""Async queue runner: poll, claim, and process jobs with bounded concurrency.

Honors `QUEUE_CONCURRENCY` (D38) by never having more than N jobs in flight,
claiming only as many new jobs as there are free slots. Shuts down gracefully
on SIGTERM/SIGINT, letting in-flight jobs finish.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from app.config import settings
from app.media import YtDlpFetcher
from app.pipeline import Pipeline
from app.queue import PostgresJobQueue

logger = logging.getLogger("worker.runner")


class WorkerRunner:
    """Owns the queue, the pipeline, and the polling loop."""

    def __init__(self) -> None:
        from app.db import get_session_factory

        session_factory = get_session_factory()
        self._queue = PostgresJobQueue(session_factory)
        self._pipeline = Pipeline(
            queue=self._queue,
            session_factory=session_factory,
            fetcher=YtDlpFetcher(),
            audio_dir=Path(settings.audio_storage_path),
            max_duration_seconds=settings.max_duration_seconds,
        )
        self._concurrency = max(1, settings.queue_concurrency)
        self._poll_interval = settings.poll_interval_seconds
        self._in_flight: set[asyncio.Task[None]] = set()
        self._stop = asyncio.Event()

    def request_stop(self) -> None:
        self._stop.set()

    async def run(self) -> None:
        logger.info(
            "Worker loop started (concurrency=%s, audio_path=%s, poll=%ss)",
            self._concurrency,
            settings.audio_storage_path,
            self._poll_interval,
        )
        Path(settings.audio_storage_path).mkdir(parents=True, exist_ok=True)

        while not self._stop.is_set():
            free = self._concurrency - len(self._in_flight)
            if free > 0:
                try:
                    claimed = await self._queue.claim(free)
                except Exception:  # noqa: BLE001 — keep the loop alive on DB hiccups
                    logger.exception("Failed to claim jobs; retrying after poll")
                    claimed = []

                for job in claimed:
                    logger.info("Claimed job %s (%s)", job.id, job.source_url)
                    task = asyncio.create_task(self._pipeline.process(job))
                    self._in_flight.add(task)
                    task.add_done_callback(self._in_flight.discard)

            # Wait for either the poll interval or a stop request.
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self._poll_interval)
            except asyncio.TimeoutError:
                pass

        if self._in_flight:
            logger.info(
                "Shutting down: waiting for %s in-flight job(s)…",
                len(self._in_flight),
            )
            await asyncio.gather(*self._in_flight, return_exceptions=True)
        logger.info("Worker loop stopped.")
