"""Unit tests for export filename construction (SPEC §7, D32)."""

from decimal import Decimal

import pytest

from app.services.filename import (
    abbreviate_key,
    build_filename,
    format_bpm,
    sanitize_title,
)


@pytest.mark.parametrize(
    "value,expected",
    [
        (Decimal("140.00"), "140"),
        (Decimal("140.50"), "140.5"),
        (90, "90"),
        (128.0, "128"),
        (None, "NA"),
    ],
)
def test_format_bpm(value, expected):
    assert format_bpm(value) == expected


@pytest.mark.parametrize(
    "key,expected",
    [
        ("F# Minor", "F#m"),
        ("A Minor", "Am"),
        ("Bb Minor", "Bbm"),
        ("C Major", "Cmaj"),
        ("F# Major", "F#maj"),
        ("Eb Major", "Ebmaj"),
        (None, "NA"),
        ("", "NA"),
    ],
)
def test_abbreviate_key(key, expected):
    assert abbreviate_key(key) == expected


def test_sanitize_title_strips_invalid_chars():
    assert sanitize_title('Dark/Type: Beat?*') == "DarkType Beat"
    assert sanitize_title(None) == "Untitled"
    assert sanitize_title("   ") == "Untitled"


def test_build_filename_minor_major_flat():
    assert (
        build_filename(
            bpm=Decimal("140.00"), key="F# Minor", title="Dark Type Beat", ext="wav"
        )
        == "[140][F#m] Dark Type Beat.wav"
    )
    assert (
        build_filename(
            bpm=90, key="C Major", title="Smooth Soul Loop", ext="mp3"
        )
        == "[90][Cmaj] Smooth Soul Loop.mp3"
    )
    assert (
        build_filename(
            bpm=Decimal("128.50"), key="Bb Minor", title="Night", ext="WAV"
        )
        == "[128.5][Bbm] Night.wav"
    )
