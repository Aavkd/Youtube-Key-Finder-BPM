"""Export filename construction (SPEC §7, D32).

Filename pattern: ``[BPM][Key] Title`` — e.g. ``[140][F#m] Dark Type Beat.wav``.

Key abbreviation scheme (filenames only; on-screen uses full notation):
- **Minor** keys: tonic + ``m`` → ``F#m``, ``Am``, ``Bbm``.
- **Major** keys: tonic + ``maj`` → ``Cmaj``, ``F#maj``, ``Bbmaj``.
- Accidentals keep the analysis spelling: ``#`` for sharps, ``b`` for flats.
"""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Optional

# Characters disallowed in filenames across Windows/macOS/Linux.
_INVALID_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def format_bpm(bpm: Optional[Decimal | float]) -> str:
    """Render BPM for a filename, dropping a trailing ``.0`` (SPEC §7).

    Examples: ``140.00`` → ``140``; ``140.50`` → ``140.5``.
    """
    if bpm is None:
        return "NA"
    value = Decimal(str(bpm)).normalize()
    # ``normalize`` can yield exponent notation (e.g. ``1.4E+2``); expand it.
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def abbreviate_key(key: Optional[str]) -> str:
    """Convert a full key (e.g. ``F# Minor``) to its compact form (``F#m``).

    Falls back to ``NA`` when the key is missing and returns a sanitized
    tonic-only string for unrecognized modes.
    """
    if not key:
        return "NA"
    parts = key.strip().split()
    tonic = parts[0] if parts else ""
    mode = parts[1].lower() if len(parts) > 1 else ""
    if mode.startswith("min"):
        return f"{tonic}m"
    if mode.startswith("maj"):
        return f"{tonic}maj"
    # Unknown / modal: keep the tonic, strip spaces.
    return tonic or "NA"


def sanitize_title(title: Optional[str]) -> str:
    """Strip characters unsafe for filenames; collapse whitespace."""
    text = (title or "Untitled").strip()
    text = _INVALID_FILENAME_CHARS.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or "Untitled"


def build_filename(
    *,
    bpm: Optional[Decimal | float],
    key: Optional[str],
    title: Optional[str],
    ext: str,
) -> str:
    """Build the full export filename ``[BPM][Key] Title.ext``."""
    ext = ext.lstrip(".").lower()
    return (
        f"[{format_bpm(bpm)}]"
        f"[{abbreviate_key(key)}] "
        f"{sanitize_title(title)}.{ext}"
    )
