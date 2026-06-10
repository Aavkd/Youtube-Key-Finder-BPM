"""Pipeline tests: success path, duration limit, errors, and retry.

A fake `MediaFetcher` and a fake converter keep these tests offline (no
network, no ffmpeg).
"""

from decimal import Decimal
from pathlib import Path

from app.analysis import AnalysisResult
from app.media import MediaError, MediaFetcher, MediaMetadata
from app.models import Job, JobStatus, Track, TrackStatus
from app.pipeline import Pipeline


_FAKE_ANALYSIS = AnalysisResult(
    bpm=Decimal("140.0"),
    bpm_alternatives=[{"bpm": 70.0, "reason": "half_time"}],
    bpm_confidence=Decimal("0.9"),
    key="F# Minor",
    key_alternatives=[{"key": "A Major", "reason": "relative"}],
    key_confidence=Decimal("0.85"),
)


def fake_analyze(wav_path: Path) -> AnalysisResult:  # noqa: ARG001
    return _FAKE_ANALYSIS


class FakeFetcher(MediaFetcher):
    def __init__(
        self,
        *,
        duration_sec: int = 185,
        download_error: str | None = None,
        metadata_error: str | None = None,
    ) -> None:
        self.duration_sec = duration_sec
        self.download_error = download_error
        self.metadata_error = metadata_error

    def fetch_metadata(self, url: str) -> MediaMetadata:
        if self.metadata_error:
            raise MediaError(self.metadata_error)
        return MediaMetadata(
            youtube_id="abc123",
            title="Dark Type Beat",
            duration_sec=self.duration_sec,
            thumbnail_url="https://i.ytimg.com/vi/abc123/hqdefault.jpg",
        )

    def download_audio(self, url: str, dest_dir: Path) -> Path:
        if self.download_error:
            raise MediaError(self.download_error)
        dest_dir.mkdir(parents=True, exist_ok=True)
        src = dest_dir / "abc123.webm"
        src.write_bytes(b"fake-audio")
        return src


def fake_convert(src: Path, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(b"RIFF....WAVEfake")
    return dest


def _make_pipeline(queue, session_factory, tmp_path, fetcher, *, max_duration=1200):
    return Pipeline(
        queue=queue,
        session_factory=session_factory,
        fetcher=fetcher,
        audio_dir=tmp_path / "audio",
        max_duration_seconds=max_duration,
        converter=fake_convert,
        analyzer=fake_analyze,
    )


async def _claim_one(queue):
    claimed = await queue.claim(limit=1)
    assert len(claimed) == 1
    return claimed[0]


async def test_success_produces_ready_track_and_wav(
    queue, session_factory, tmp_path
):
    await queue.enqueue("https://youtu.be/abc123")
    pipeline = _make_pipeline(queue, session_factory, tmp_path, FakeFetcher())

    job = await _claim_one(queue)
    await pipeline.process(job)

    async with session_factory() as session:
        db_job = await session.get(Job, job.id)
        assert db_job.status is JobStatus.done
        assert db_job.progress == 100
        assert db_job.track_id is not None

        track = await session.get(Track, db_job.track_id)
        assert track.status is TrackStatus.ready
        assert track.title == "Dark Type Beat"
        assert track.duration_sec == 185
        assert track.youtube_id == "abc123"

        wav_path = Path(track.audio_path_wav)
        assert wav_path.exists()
        assert wav_path.name == f"{track.id}.wav"

        assert track.bpm == Decimal("140.0")
        assert track.bpm_confidence == Decimal("0.9")
        assert track.key == "F# Minor"
        assert track.key_confidence == Decimal("0.85")
        assert track.bpm_alternatives == [{"bpm": 70.0, "reason": "half_time"}]
        assert track.key_alternatives == [{"key": "A Major", "reason": "relative"}]


async def test_duration_limit_rejects_before_download(
    queue, session_factory, tmp_path
):
    await queue.enqueue("https://youtu.be/toolong")
    fetcher = FakeFetcher(duration_sec=3600)  # 1h > 20min default
    pipeline = _make_pipeline(
        queue, session_factory, tmp_path, fetcher, max_duration=1200
    )

    job = await _claim_one(queue)
    await pipeline.process(job)

    async with session_factory() as session:
        db_job = await session.get(Job, job.id)
        assert db_job.status is JobStatus.error
        assert "too long" in db_job.error_msg
        # No track created for a pre-download rejection.
        assert db_job.track_id is None

    # Nothing was written to the audio dir.
    audio_dir = tmp_path / "audio"
    assert not audio_dir.exists() or not any(audio_dir.iterdir())


async def test_download_failure_marks_error(queue, session_factory, tmp_path):
    await queue.enqueue("https://youtu.be/badurl")
    fetcher = FakeFetcher(
        download_error="This video is unavailable or has been removed."
    )
    pipeline = _make_pipeline(queue, session_factory, tmp_path, fetcher)

    job = await _claim_one(queue)
    await pipeline.process(job)

    async with session_factory() as session:
        db_job = await session.get(Job, job.id)
        assert db_job.status is JobStatus.error
        assert "unavailable" in db_job.error_msg
        # A track row was created during download, then flagged error.
        assert db_job.track_id is not None
        track = await session.get(Track, db_job.track_id)
        assert track.status is TrackStatus.error


async def test_retry_after_failure_reruns_successfully(
    queue, session_factory, tmp_path
):
    await queue.enqueue("https://youtu.be/flaky")

    # First attempt fails during download.
    failing = _make_pipeline(
        queue,
        session_factory,
        tmp_path,
        FakeFetcher(download_error="This video is region-blocked and unavailable here."),
    )
    job = await _claim_one(queue)
    await failing.process(job)

    async with session_factory() as session:
        db_job = await session.get(Job, job.id)
        assert db_job.status is JobStatus.error

    # Retry requeues the job; second attempt succeeds.
    assert await queue.retry(job.id) is True
    succeeding = _make_pipeline(queue, session_factory, tmp_path, FakeFetcher())
    reclaimed = await _claim_one(queue)
    assert reclaimed.id == job.id
    assert reclaimed.track_id is not None  # reuses the existing track
    await succeeding.process(reclaimed)

    async with session_factory() as session:
        db_job = await session.get(Job, job.id)
        assert db_job.status is JobStatus.done
        track = await session.get(Track, db_job.track_id)
        assert track.status is TrackStatus.ready
        assert Path(track.audio_path_wav).exists()
