"""Media acquisition: fetch metadata, download audio, convert to WAV.

`MediaFetcher` is an abstraction so the pipeline can be unit-tested with a fake
implementation (no network/binaries). `YtDlpFetcher` is the production
implementation; `yt_dlp` is imported lazily so importing this module does not
require the package (tests use the fake).

`convert_to_wav` shells out to `ffmpeg` (installed in the worker image).

Failures are normalized into `MediaError` with a clear, user-facing message
(age-restricted, region-blocked, unavailable, …) suitable for `jobs.error_msg`.
"""

from __future__ import annotations

import logging
import re
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger("worker.media")


class MediaError(Exception):
    """A user-facing media-processing failure (stored in `jobs.error_msg`)."""


@dataclass(frozen=True)
class MediaMetadata:
    """Metadata extracted before downloading."""

    youtube_id: Optional[str]
    title: Optional[str]
    duration_sec: Optional[int]
    thumbnail_url: Optional[str]


class MediaFetcher(ABC):
    """Fetches metadata and downloads source audio for a URL."""

    @abstractmethod
    def fetch_metadata(self, url: str) -> MediaMetadata:
        """Extract metadata without downloading the media."""

    @abstractmethod
    def download_audio(self, url: str, dest_dir: Path) -> Path:
        """Download the best audio stream into `dest_dir`; return the file path."""


def _classify_ytdlp_error(message: str) -> str:
    """Map a raw yt-dlp error to a concise, user-facing message."""
    lowered = message.lower()
    if "age" in lowered and "restrict" in lowered:
        return "This video is age-restricted and cannot be downloaded."
    if "private" in lowered:
        return "This video is private and cannot be accessed."
    if "not available in your country" in lowered or "geo" in lowered or "region" in lowered:
        return "This video is region-blocked and unavailable here."
    if "removed" in lowered or "no longer available" in lowered or "unavailable" in lowered:
        return "This video is unavailable or has been removed."
    if "copyright" in lowered:
        return "This video is unavailable due to a copyright claim."
    if "sign in" in lowered or "login" in lowered:
        return "This video requires sign-in and cannot be downloaded."
    # Fall back to a trimmed version of the raw message.
    cleaned = re.sub(r"\s+", " ", message).strip()
    return f"Download failed: {cleaned[:300]}"


class YtDlpFetcher(MediaFetcher):
    """Production fetcher backed by yt-dlp."""

    def fetch_metadata(self, url: str) -> MediaMetadata:
        from yt_dlp import YoutubeDL
        from yt_dlp.utils import DownloadError, ExtractorError

        opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "skip_download": True,
        }
        try:
            with YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except (DownloadError, ExtractorError) as exc:  # pragma: no cover - network
            raise MediaError(_classify_ytdlp_error(str(exc))) from exc

        if info is None:  # pragma: no cover - defensive
            raise MediaError("Could not read video metadata.")

        duration = info.get("duration")
        return MediaMetadata(
            youtube_id=info.get("id"),
            title=info.get("title"),
            duration_sec=int(duration) if duration is not None else None,
            thumbnail_url=info.get("thumbnail"),
        )

    def download_audio(self, url: str, dest_dir: Path) -> Path:
        from yt_dlp import YoutubeDL
        from yt_dlp.utils import DownloadError, ExtractorError

        dest_dir.mkdir(parents=True, exist_ok=True)
        outtmpl = str(dest_dir / "%(id)s.%(ext)s")
        opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            # No format constraint: let yt-dlp pick whatever is available.
            # Since the file is always converted to WAV by ffmpeg (-vn strips
            # any video track), it doesn't matter whether we get audio-only or
            # a merged video+audio stream. This avoids "Requested format is not
            # available" on videos that only serve merged formats.
            "outtmpl": outtmpl,
        }
        try:
            with YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
                downloaded = Path(ydl.prepare_filename(info))
        except (DownloadError, ExtractorError) as exc:  # pragma: no cover - network
            raise MediaError(_classify_ytdlp_error(str(exc))) from exc

        if not downloaded.exists():
            # yt-dlp occasionally rewrites the extension; fall back to id.*
            candidates = list(dest_dir.glob(f"{info.get('id', '*')}.*"))
            if not candidates:
                raise MediaError("Audio download produced no file.")
            downloaded = candidates[0]
        return downloaded


def convert_to_wav(src: Path, dest: Path) -> Path:
    """Convert `src` audio to a WAV file at `dest` using ffmpeg."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(src),
        "-vn",  # drop any video/cover stream
        "-acodec",
        "pcm_s16le",
        "-ar",
        "44100",
        str(dest),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        stderr = (proc.stderr or "").strip()
        logger.error("ffmpeg failed (%s): %s", proc.returncode, stderr[-500:])
        raise MediaError("Audio conversion to WAV failed.")
    if not dest.exists():
        raise MediaError("Audio conversion produced no output file.")
    return dest
