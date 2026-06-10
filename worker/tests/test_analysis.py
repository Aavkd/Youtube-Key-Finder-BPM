"""Unit tests for the Phase 3 analysis engine.

All pure-logic helpers are tested without any I/O.
The integrated ``analyze()`` function is tested via ``unittest.mock.patch``
so neither Essentia nor librosa need to be installed in the test environment.
"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.analysis import (
    AnalysisResult,
    _bpm_alternatives,
    _bpm_confidence,
    _fmt_key,
    _is_halfdouble,
    _reconcile_bpm,
    _relative_key,
    analyze,
)


# ---------------------------------------------------------------------------
# BPM helpers — pure logic, no I/O
# ---------------------------------------------------------------------------

def test_reconcile_bpm_close_averages():
    assert _reconcile_bpm([140.0, 141.5]) == pytest.approx(140.75, abs=0.01)


def test_reconcile_bpm_single():
    assert _reconcile_bpm([128.0]) == 128.0


def test_reconcile_bpm_halfdouble_picks_sweet_spot():
    assert _reconcile_bpm([70.0, 140.0]) == 140.0
    assert _reconcile_bpm([140.0, 70.0]) == 140.0


def test_reconcile_bpm_both_outside_sweet_spot_returns_first():
    assert _reconcile_bpm([55.0, 110.0]) == 110.0


def test_is_halfdouble_detects_octave():
    assert _is_halfdouble(140.0, 70.0)
    assert _is_halfdouble(70.0, 140.0)


def test_is_halfdouble_rejects_unrelated():
    assert not _is_halfdouble(120.0, 90.0)
    assert not _is_halfdouble(100.0, 75.0)


def test_bpm_confidence_high_when_very_close():
    assert _bpm_confidence([140.0, 141.0], 140.5) == pytest.approx(0.90)


def test_bpm_confidence_medium_when_close():
    assert _bpm_confidence([140.0, 144.0], 142.0) == pytest.approx(0.75)


def test_bpm_confidence_halfdouble():
    assert _bpm_confidence([70.0, 140.0], 140.0) == pytest.approx(0.70)


def test_bpm_confidence_single_estimator():
    assert _bpm_confidence([128.0], 128.0) == pytest.approx(0.60)


def test_bpm_confidence_low_on_disagreement():
    assert _bpm_confidence([80.0, 130.0], 105.0) == pytest.approx(0.50)


def test_bpm_alternatives_includes_half():
    alts = _bpm_alternatives(140.0)
    reasons = {a["reason"] for a in alts}
    bpms = {a["bpm"] for a in alts}
    assert "half_time" in reasons
    assert 70.0 in bpms


def test_bpm_alternatives_includes_double():
    alts = _bpm_alternatives(80.0)
    reasons = {a["reason"] for a in alts}
    assert "double_time" in reasons


def test_bpm_alternatives_excludes_out_of_range():
    alts = _bpm_alternatives(185.0)
    reasons = {a["reason"] for a in alts}
    assert "double_time" not in reasons


# ---------------------------------------------------------------------------
# Key helpers — pure logic, no I/O
# ---------------------------------------------------------------------------

def test_fmt_key_minor():
    assert _fmt_key("F#", "minor") == "F# Minor"


def test_fmt_key_major():
    assert _fmt_key("C", "major") == "C Major"


def test_relative_key_c_major_to_a_minor():
    assert _relative_key("C Major") == "A Minor"


def test_relative_key_a_minor_to_c_major():
    assert _relative_key("A Minor") == "C Major"


def test_relative_key_fsharp_minor_to_a_major():
    assert _relative_key("F# Minor") == "A Major"


def test_relative_key_a_major_to_fsharp_minor():
    assert _relative_key("A Major") == "F# Minor"


def test_relative_key_unknown_tonic_returns_none():
    assert _relative_key("X Major") is None


# ---------------------------------------------------------------------------
# analyze() integration — patched so no Essentia/librosa needed
# ---------------------------------------------------------------------------

@pytest.fixture()
def wav_path(tmp_path: Path) -> Path:
    p = tmp_path / "test.wav"
    p.write_bytes(b"RIFF\x00\x00\x00\x00WAVEfmt ")
    return p


def test_analyze_returns_analysis_result(wav_path: Path):
    with (
        patch("app.analysis._detect_bpm", return_value=(140.0, [{"bpm": 70.0, "reason": "half_time"}], 0.90)),
        patch("app.analysis._detect_key", return_value=("F# Minor", [{"key": "A Major", "reason": "relative"}], 0.85)),
    ):
        result = analyze(wav_path)

    assert isinstance(result, AnalysisResult)
    assert result.bpm == Decimal("140.0")
    assert result.key == "F# Minor"
    assert float(result.bpm_confidence) == pytest.approx(0.90)
    assert float(result.key_confidence) == pytest.approx(0.85)
    assert result.bpm_alternatives == [{"bpm": 70.0, "reason": "half_time"}]
    assert result.key_alternatives == [{"key": "A Major", "reason": "relative"}]


def test_analyze_bpm_stored_as_decimal(wav_path: Path):
    with (
        patch("app.analysis._detect_bpm", return_value=(128.75, [], 0.6)),
        patch("app.analysis._detect_key", return_value=("C Major", [], 0.5)),
    ):
        result = analyze(wav_path)

    assert isinstance(result.bpm, Decimal)
    assert result.bpm == Decimal("128.75")


def test_analyze_confidence_clamped(wav_path: Path):
    with (
        patch("app.analysis._detect_bpm", return_value=(120.0, [], 1.5)),
        patch("app.analysis._detect_key", return_value=("G Major", [], -0.3)),
    ):
        result = analyze(wav_path)

    assert 0.0 <= float(result.bpm_confidence) <= 1.0
    assert 0.0 <= float(result.key_confidence) <= 1.0


def test_analyze_key_in_standard_notation(wav_path: Path):
    with (
        patch("app.analysis._detect_bpm", return_value=(95.0, [], 0.7)),
        patch("app.analysis._detect_key", return_value=("Bb Minor", [], 0.75)),
    ):
        result = analyze(wav_path)

    assert result.key.endswith("Minor") or result.key.endswith("Major")
