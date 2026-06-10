"""Audio export helpers (SPEC §7, D4).

The library stores WAV masters; MP3 exports are produced on demand at
**320 kbps** via ffmpeg. Conversion writes to a caller-managed temp path so the
endpoint can stream it and clean up afterwards.
"""

from __future__ import annotations

import asyncio
import shutil
from pathlib import Path


class AudioExportError(RuntimeError):
    """Raised when an export/transcode step fails."""


def _ffmpeg_bin() -> str:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise AudioExportError("ffmpeg is not available on this system.")
    return ffmpeg


async def convert_to_mp3(src: Path, dest: Path) -> Path:
    """Transcode ``src`` (WAV) to ``dest`` as MP3 320 kbps (D4)."""
    src = Path(src)
    dest = Path(dest)
    if not src.exists():
        raise AudioExportError(f"Source audio not found: {src}")

    proc = await asyncio.create_subprocess_exec(
        _ffmpeg_bin(),
        "-y",
        "-i",
        str(src),
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "320k",
        str(dest),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        detail = stderr.decode(errors="replace").strip().splitlines()
        msg = detail[-1] if detail else "unknown ffmpeg error"
        raise AudioExportError(f"MP3 conversion failed: {msg}")
    return dest
