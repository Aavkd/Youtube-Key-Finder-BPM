"""Phase 3 analysis engine: BPM + key using Essentia + librosa ensemble.

Both ``essentia`` and ``librosa`` are **lazily imported** inside each helper so
the rest of the worker can import this module even when the analysis deps are
not installed (tests, lightweight deploys).

Algorithm summary
-----------------
BPM
  1. librosa ``beat_track`` for a first tempo estimate.
  2. Essentia ``RhythmExtractor2013 (multifeature)`` for a second estimate.
  3. Reconcile: if both estimates are within ±5 BPM, average them; if they are
     in a 2× octave relationship (half/double-time), prefer whichever falls in
     the 80–160 BPM sweet spot.
  4. Confidence is derived from the inter-estimator agreement.
  5. Alternatives always list the half-time and double-time counterparts (when
     in range 60–200 BPM).

Key
  1. Essentia ``KeyExtractor`` run with three profiles: Krumhansl, Temperley,
     and EDMA.
  2. Results are weighted by each profile's strength score and voted.
  3. The winning key is formatted as standard notation (e.g. ``F# Minor``).
  4. The relative key is always surfaced as the first alternative; the runner-up
     key (if different) is added as a second alternative.
  5. Confidence is derived from how many profiles agree and their average
     strength.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any

logger = logging.getLogger("worker.analysis")

_NOTE_NAMES: list[str] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
]
_ENHARMONIC: dict[str, str] = {
    "Db": "C#",
    "Eb": "D#",
    "Gb": "F#",
    "Ab": "G#",
    "Bb": "A#",
}
_KEY_PROFILES: tuple[str, ...] = ("krumhansl", "temperley", "edma")


@dataclass
class AnalysisResult:
    bpm: Decimal
    bpm_alternatives: list[dict[str, Any]]
    bpm_confidence: Decimal
    key: str
    key_alternatives: list[dict[str, Any]]
    key_confidence: Decimal


def analyze(wav_path: Path) -> AnalysisResult:
    """Run BPM + key analysis on *wav_path* (blocking; call via ``asyncio.to_thread``)."""
    bpm, bpm_alts, bpm_conf = _detect_bpm(wav_path)
    key, key_alts, key_conf = _detect_key(wav_path)
    return AnalysisResult(
        bpm=Decimal(str(round(bpm, 2))),
        bpm_alternatives=bpm_alts,
        bpm_confidence=Decimal(str(round(min(1.0, max(0.0, bpm_conf)), 3))),
        key=key,
        key_alternatives=key_alts,
        key_confidence=Decimal(str(round(min(1.0, max(0.0, key_conf)), 3))),
    )


# ---------------------------------------------------------------------------
# BPM detection
# ---------------------------------------------------------------------------

def _detect_bpm(wav_path: Path) -> tuple[float, list[dict], float]:
    estimates: list[tuple[str, float]] = []

    # --- librosa beat tracker ---
    try:
        import librosa  # type: ignore[import]
        import numpy as np  # type: ignore[import]

        y, sr = librosa.load(str(wav_path), mono=True, sr=22050)
        tempo = librosa.beat.beat_track(y=y, sr=sr)[0]
        estimates.append(("librosa", float(np.atleast_1d(tempo)[0])))
    except Exception:
        logger.exception("librosa BPM failed")

    # --- Essentia RhythmExtractor2013 ---
    try:
        import essentia.standard as es  # type: ignore[import]

        audio = es.MonoLoader(filename=str(wav_path), sampleRate=44100)()
        bpm_e, *_ = es.RhythmExtractor2013(method="multifeature")(audio)
        estimates.append(("essentia", float(bpm_e)))
    except Exception:
        logger.exception("Essentia BPM failed")

    if not estimates:
        return 120.0, [], 0.1

    raw_bpms = [v for _, v in estimates]
    chosen = _reconcile_bpm(raw_bpms)
    conf = _bpm_confidence(raw_bpms, chosen)
    alts = _bpm_alternatives(chosen)
    return chosen, alts, conf


def _reconcile_bpm(bpms: list[float]) -> float:
    if len(bpms) == 1:
        return round(bpms[0], 2)
    a, b = bpms[0], bpms[1]
    if abs(a - b) <= 5.0:
        return round((a + b) / 2, 2)
    if _is_halfdouble(a, b):
        for v in (a, b):
            if 80.0 <= v <= 160.0:
                return round(v, 2)
        return round(a, 2)
    return round((a + b) / 2, 2)


def _bpm_confidence(bpms: list[float], chosen: float) -> float:  # noqa: ARG001
    if len(bpms) == 1:
        return 0.60
    a, b = bpms[0], bpms[1]
    diff = abs(a - b)
    if diff <= 2.0:
        return 0.90
    if diff <= 5.0:
        return 0.75
    if _is_halfdouble(a, b):
        return 0.70
    return 0.50


def _bpm_alternatives(bpm: float) -> list[dict]:
    alts: list[dict] = []
    half = round(bpm / 2, 2)
    double = round(bpm * 2, 2)
    if 60.0 <= half <= 200.0 and half != bpm:
        alts.append({"bpm": half, "reason": "half_time"})
    if 60.0 <= double <= 200.0 and double != bpm:
        alts.append({"bpm": double, "reason": "double_time"})
    return alts


def _is_halfdouble(a: float, b: float) -> bool:
    if b == 0:
        return False
    ratio = a / b
    return abs(ratio - 2.0) < 0.15 or abs(ratio - 0.5) < 0.08


# ---------------------------------------------------------------------------
# Key detection
# ---------------------------------------------------------------------------

def _detect_key(wav_path: Path) -> tuple[str, list[dict], float]:
    profile_results: dict[str, tuple[str, float]] = {}

    for profile in _KEY_PROFILES:
        try:
            import essentia.standard as es  # type: ignore[import]

            audio = es.MonoLoader(filename=str(wav_path), sampleRate=44100)()
            key_raw, scale, strength = es.KeyExtractor(profileType=profile)(audio)
            key_norm = _ENHARMONIC.get(key_raw, key_raw)
            profile_results[profile] = (_fmt_key(key_norm, scale), float(strength))
        except Exception:
            logger.exception("KeyExtractor failed for profile %s", profile)

    if not profile_results:
        return "C Major", [], 0.1

    votes: dict[str, float] = {}
    for key_str, strength in profile_results.values():
        votes[key_str] = votes.get(key_str, 0.0) + strength

    chosen = max(votes, key=lambda k: votes[k])
    matching = [(k, s) for k, s in profile_results.values() if k == chosen]
    agreement = len(matching)
    avg_strength = sum(s for _, s in matching) / agreement

    if agreement == len(_KEY_PROFILES):
        conf = min(1.0, avg_strength + 0.10)
    elif agreement >= 2:
        conf = avg_strength
    else:
        conf = avg_strength * 0.70

    alts: list[dict] = []
    rel = _relative_key(chosen)
    if rel:
        alts.append({"key": rel, "reason": "relative"})
    for k in sorted(votes, key=lambda k: votes[k], reverse=True):
        if k != chosen and k != rel:
            alts.append({"key": k, "reason": "alternative"})
            break

    return chosen, alts, conf


def _fmt_key(key: str, scale: str) -> str:
    return f"{key} Minor" if scale == "minor" else f"{key} Major"


def _relative_key(key_str: str) -> str | None:
    parts = key_str.rsplit(" ", 1)
    if len(parts) != 2:
        return None
    tonic, mode = parts
    try:
        idx = _NOTE_NAMES.index(tonic)
    except ValueError:
        return None
    if mode == "Major":
        return f"{_NOTE_NAMES[(idx + 9) % 12]} Minor"
    return f"{_NOTE_NAMES[(idx + 3) % 12]} Major"
