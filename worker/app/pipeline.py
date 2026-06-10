"""Worker pipeline: validate → download → convert → analyze → store; track the job.

Implements the Phase 3 flow (SPEC §2/§5):
  1. Fetch metadata (yt-dlp) and validate the URL.
  2. Reject videos longer than `MAX_DURATION_SECONDS` (D37).
  3. Download best audio (yt-dlp).
  4. Convert to WAV (ffmpeg) into the shared audio volume.
  5. Analyze BPM + key (Essentia + librosa ensemble).
  6. Drive `jobs.status`/`progress` (queued → downloading → analyzing → done).
  7. Create/update the `tracks` row; on success it becomes `ready`.
"""

from __future__ import annotations

import asyncio
import logging
import tempfile
import uuid
from pathlib import Path
from typing import Callable, Optional

from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from app.analysis import AnalysisResult
from app.analysis import analyze as _default_analyze
from app.media import MediaError, MediaFetcher, MediaMetadata, convert_to_wav
from app.models import Job, JobStatus, Track, TrackStatus
from app.queue import ClaimedJob, JobQueue

logger = logging.getLogger("worker.pipeline")

# Progress checkpoints (0–100) reported to the queue / SSE stream.
_PROGRESS_METADATA = 10
_PROGRESS_DOWNLOADED = 60
_PROGRESS_CONVERTED = 80


class Pipeline:
    """Processes a single claimed job end-to-end."""

    def __init__(
        self,
        *,
        queue: JobQueue,
        session_factory: async_sessionmaker[AsyncSession],
        fetcher: MediaFetcher,
        audio_dir: Path,
        max_duration_seconds: int,
        converter: Callable[[Path, Path], Path] = convert_to_wav,
        analyzer: Callable[[Path], AnalysisResult] = _default_analyze,
    ) -> None:
        self._queue = queue
        self._session_factory = session_factory
        self._fetcher = fetcher
        self._audio_dir = Path(audio_dir)
        self._max_duration_seconds = max_duration_seconds
        self._converter = converter
        self._analyzer = analyzer

    async def process(self, job: ClaimedJob) -> None:
        """Run the full pipeline for `job`, updating job + track state."""
        track_id: Optional[uuid.UUID] = job.track_id
        try:
            # 1. Metadata + URL validation.
            metadata = await asyncio.to_thread(
                self._fetcher.fetch_metadata, job.source_url
            )

            # 2. Duration limit (D37) — reject before downloading.
            if (
                metadata.duration_sec is not None
                and metadata.duration_sec > self._max_duration_seconds
            ):
                raise MediaError(
                    f"Video is too long: {metadata.duration_sec}s exceeds the "
                    f"{self._max_duration_seconds}s limit."
                )

            # Create/refresh the track row (status: downloading).
            track_id = await self._upsert_track(job, metadata, track_id)
            await self._queue.progress(
                job.id, _PROGRESS_METADATA, JobStatus.downloading
            )

            with tempfile.TemporaryDirectory(prefix="kf-dl-") as tmp:
                # 3. Download best audio.
                source_file = await asyncio.to_thread(
                    self._fetcher.download_audio, job.source_url, Path(tmp)
                )
                await self._queue.progress(
                    job.id, _PROGRESS_DOWNLOADED, JobStatus.downloading
                )

                # 4. Convert to WAV into the shared audio volume.
                dest = self._audio_dir / f"{track_id}.wav"
                await asyncio.to_thread(self._converter, source_file, dest)

            await self._set_track(
                track_id, status=TrackStatus.analyzing, audio_path_wav=str(dest)
            )
            await self._queue.progress(
                job.id, _PROGRESS_CONVERTED, JobStatus.analyzing
            )

            # 5. BPM + key analysis (Phase 3 — Essentia + librosa ensemble).
            result: AnalysisResult = await asyncio.to_thread(self._analyzer, dest)

            # 6. Success: persist analysis, mark track ready, job done.
            await self._set_track(
                track_id, status=TrackStatus.ready, analysis=result
            )
            await self._queue.complete(job.id, track_id)
            logger.info("Job %s done → track %s ready", job.id, track_id)

        except MediaError as exc:
            await self._handle_failure(job.id, track_id, str(exc))
        except Exception:  # noqa: BLE001 — last-resort guard around a job
            logger.exception("Unexpected error processing job %s", job.id)
            await self._handle_failure(
                job.id, track_id, "Unexpected error while processing the video."
            )

    async def _handle_failure(
        self, job_id: uuid.UUID, track_id: Optional[uuid.UUID], message: str
    ) -> None:
        if track_id is not None:
            await self._set_track(track_id, status=TrackStatus.error)
        await self._queue.fail(job_id, message)
        logger.warning("Job %s failed: %s", job_id, message)

    async def _upsert_track(
        self,
        job: ClaimedJob,
        metadata: MediaMetadata,
        existing_track_id: Optional[uuid.UUID],
    ) -> uuid.UUID:
        """Create a track (or refresh an existing one on retry); link the job."""
        async with self._session_factory() as session:
            track: Optional[Track] = None
            if existing_track_id is not None:
                track = await session.get(Track, existing_track_id)

            if track is None:
                track = Track(source_url=job.source_url)
                session.add(track)

            track.youtube_id = metadata.youtube_id
            track.title = metadata.title
            track.duration_sec = metadata.duration_sec
            track.thumbnail_url = metadata.thumbnail_url
            track.status = TrackStatus.downloading

            await session.flush()
            track_id = track.id

            # Link the track to its job.
            db_job = await session.get(Job, job.id)
            if db_job is not None:
                db_job.track_id = track_id

            await session.commit()
            return track_id

    async def _set_track(
        self,
        track_id: uuid.UUID,
        *,
        status: Optional[TrackStatus] = None,
        audio_path_wav: Optional[str] = None,
        analysis: Optional[AnalysisResult] = None,
    ) -> None:
        async with self._session_factory() as session:
            track = await session.get(Track, track_id)
            if track is None:
                return
            if status is not None:
                track.status = status
            if audio_path_wav is not None:
                track.audio_path_wav = audio_path_wav
            if analysis is not None:
                track.bpm = analysis.bpm
                track.bpm_alternatives = analysis.bpm_alternatives
                track.bpm_confidence = analysis.bpm_confidence
                track.key = analysis.key
                track.key_alternatives = analysis.key_alternatives
                track.key_confidence = analysis.key_confidence
            await session.commit()
