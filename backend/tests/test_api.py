"""Phase 4 acceptance: integration tests for the REST API + SSE.

Run against the FastAPI app over a shared in-memory SQLite DB (see the
`client` fixture in `conftest.py`).
"""

import asyncio
import shutil
import uuid
import wave
from decimal import Decimal
from pathlib import Path
from urllib.parse import unquote

import pytest

from app.models import Track, TrackStatus


async def _seed_track(client, *, audio: Path | None = None, **overrides) -> str:
    """Insert a track directly via the test session factory; return its id."""
    defaults = dict(
        source_url="https://youtu.be/abc123",
        youtube_id="abc123",
        title="Dark Type Beat",
        duration_sec=185,
        bpm=Decimal("140.00"),
        key="F# Minor",
        status=TrackStatus.ready,
    )
    defaults.update(overrides)
    if audio is not None:
        defaults["audio_path_wav"] = str(audio)
    async with client.factory() as s:
        track = Track(**defaults)
        s.add(track)
        await s.commit()
        return str(track.id)


def _write_wav(path: Path) -> Path:
    """Write a tiny valid silent WAV for streaming/export tests."""
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(44100)
        w.writeframes(b"\x00\x00" * 4410)  # 0.1s of silence
    return path


# --------------------------------------------------------------------------- #
# Jobs
# --------------------------------------------------------------------------- #


async def test_create_and_list_jobs(client):
    resp = await client.post(
        "/api/jobs", json={"source_url": "https://youtu.be/xyz"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "queued"
    assert body["progress"] == 0

    listing = await client.get("/api/jobs")
    assert listing.status_code == 200
    assert len(listing.json()) == 1


async def test_get_job_404(client):
    resp = await client.get(f"/api/jobs/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_retry_rejects_non_failed_job(client):
    created = (
        await client.post("/api/jobs", json={"source_url": "https://youtu.be/x"})
    ).json()
    resp = await client.post(f"/api/jobs/{created['id']}/retry")
    assert resp.status_code == 409


async def test_retry_failed_job(client):
    created = (
        await client.post("/api/jobs", json={"source_url": "https://youtu.be/x"})
    ).json()
    # Mark the job failed directly.
    from app.models import Job, JobStatus

    async with client.factory() as s:
        job = await s.get(Job, uuid.UUID(created["id"]))
        job.status = JobStatus.error
        job.error_msg = "boom"
        await s.commit()

    resp = await client.post(f"/api/jobs/{created['id']}/retry")
    assert resp.status_code == 200
    assert resp.json()["status"] == "queued"
    assert resp.json()["error_msg"] is None


# --------------------------------------------------------------------------- #
# Tracks
# --------------------------------------------------------------------------- #


async def test_list_tracks_filters(client):
    await _seed_track(client, title="Dark Beat", key="F# Minor", is_favorite=True)
    await _seed_track(
        client, title="Happy Loop", key="C Major", bpm=Decimal("90.00")
    )

    # Search by title.
    resp = await client.get("/api/tracks", params={"search": "Dark"})
    assert [t["title"] for t in resp.json()] == ["Dark Beat"]

    # Favorite filter.
    resp = await client.get("/api/tracks", params={"favorite": True})
    assert [t["title"] for t in resp.json()] == ["Dark Beat"]

    # Key filter.
    resp = await client.get("/api/tracks", params={"key": "C Major"})
    assert [t["title"] for t in resp.json()] == ["Happy Loop"]

    # Sort by bpm ascending.
    resp = await client.get("/api/tracks", params={"sort": "bpm", "order": "asc"})
    bpms = [t["bpm"] for t in resp.json()]
    assert bpms == sorted(bpms)


async def test_get_track_404(client):
    resp = await client.get(f"/api/tracks/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_patch_track_sets_manual_flags(client):
    track_id = await _seed_track(client)
    resp = await client.patch(
        f"/api/tracks/{track_id}", json={"bpm": 150, "key": "A Minor"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["bpm"] == 150
    assert body["key"] == "A Minor"
    assert body["bpm_manual"] is True
    assert body["key_manual"] is True


async def test_patch_favorite_only(client):
    track_id = await _seed_track(client)
    resp = await client.patch(
        f"/api/tracks/{track_id}", json={"is_favorite": True}
    )
    assert resp.json()["is_favorite"] is True
    assert resp.json()["bpm_manual"] is False


async def test_reanalyze_creates_linked_job(client):
    track_id = await _seed_track(client)
    resp = await client.post(f"/api/tracks/{track_id}/reanalyze")
    assert resp.status_code == 202
    assert resp.json()["track_id"] == track_id

    jobs = (await client.get("/api/jobs")).json()
    assert any(j["track_id"] == track_id for j in jobs)


async def test_delete_track(client, tmp_path):
    audio = _write_wav(tmp_path / "a.wav")
    track_id = await _seed_track(client, audio=audio)
    resp = await client.delete(f"/api/tracks/{track_id}")
    assert resp.status_code == 204
    assert not audio.exists()
    assert (await client.get(f"/api/tracks/{track_id}")).status_code == 404


async def test_audio_stream(client, tmp_path):
    audio = _write_wav(tmp_path / "a.wav")
    track_id = await _seed_track(client, audio=audio)
    resp = await client.get(f"/api/tracks/{track_id}/audio")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/wav"


async def test_audio_missing_returns_409(client):
    track_id = await _seed_track(client)  # no audio_path_wav
    resp = await client.get(f"/api/tracks/{track_id}/audio")
    assert resp.status_code == 409


async def test_download_wav_filename(client, tmp_path):
    audio = _write_wav(tmp_path / "a.wav")
    track_id = await _seed_track(
        client, audio=audio, bpm=Decimal("140.00"), key="F# Minor",
        title="Dark Type Beat",
    )
    resp = await client.get(f"/api/tracks/{track_id}/download")
    assert resp.status_code == 200
    disp = unquote(resp.headers["content-disposition"])
    assert "[140][F#m] Dark Type Beat.wav" in disp


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
async def test_download_mp3(client, tmp_path):
    audio = _write_wav(tmp_path / "a.wav")
    track_id = await _seed_track(
        client, audio=audio, bpm=Decimal("90.00"), key="C Major",
        title="Smooth Soul Loop",
    )
    resp = await client.get(
        f"/api/tracks/{track_id}/download", params={"format": "mp3"}
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/mpeg"
    assert "[90][Cmaj] Smooth Soul Loop.mp3" in unquote(
        resp.headers["content-disposition"]
    )


# --------------------------------------------------------------------------- #
# Playlists
# --------------------------------------------------------------------------- #


async def test_playlist_crud_add_reorder_remove(client):
    t1 = await _seed_track(client, title="One")
    t2 = await _seed_track(client, title="Two")

    pl = (await client.post("/api/playlists", json={"name": "Set"})).json()
    pid = pl["id"]

    await client.post(f"/api/playlists/{pid}/tracks", json={"track_id": t1})
    resp = await client.post(
        f"/api/playlists/{pid}/tracks", json={"track_id": t2}
    )
    assoc = resp.json()["track_associations"]
    assert [a["position"] for a in assoc] == [0, 1]

    # Duplicate add rejected.
    dup = await client.post(
        f"/api/playlists/{pid}/tracks", json={"track_id": t1}
    )
    assert dup.status_code == 409

    # Reorder.
    resp = await client.put(
        f"/api/playlists/{pid}/tracks/order", json={"track_ids": [t2, t1]}
    )
    order = {a["track_id"]: a["position"] for a in resp.json()["track_associations"]}
    assert order[t2] == 0 and order[t1] == 1

    # Remove.
    rm = await client.delete(f"/api/playlists/{pid}/tracks/{t1}")
    assert rm.status_code == 204

    got = (await client.get(f"/api/playlists/{pid}")).json()
    assert [a["track_id"] for a in got["track_associations"]] == [t2]

    # Delete playlist.
    assert (await client.delete(f"/api/playlists/{pid}")).status_code == 204


async def test_playlist_rename(client):
    pl = (await client.post("/api/playlists", json={"name": "Old"})).json()
    resp = await client.patch(
        f"/api/playlists/{pl['id']}", json={"name": "New"}
    )
    assert resp.json()["name"] == "New"


# --------------------------------------------------------------------------- #
# Tags
# --------------------------------------------------------------------------- #


async def test_tag_create_attach_detach(client):
    track_id = await _seed_track(client)
    tag = (await client.post("/api/tags", json={"name": "dark"})).json()

    # Duplicate name rejected.
    dup = await client.post("/api/tags", json={"name": "dark"})
    assert dup.status_code == 409

    attach = await client.post(f"/api/tags/{tag['id']}/tracks/{track_id}")
    assert attach.status_code == 204

    # Tag now appears on the track + is filterable.
    track = (await client.get(f"/api/tracks/{track_id}")).json()
    assert [t["name"] for t in track["tags"]] == ["dark"]
    filtered = (await client.get("/api/tracks", params={"tag": "dark"})).json()
    assert [t["id"] for t in filtered] == [track_id]

    detach = await client.delete(f"/api/tags/{tag['id']}/tracks/{track_id}")
    assert detach.status_code == 204
    track = (await client.get(f"/api/tracks/{track_id}")).json()
    assert track["tags"] == []


# --------------------------------------------------------------------------- #
# SSE
# --------------------------------------------------------------------------- #


async def test_sse_stream_emits_jobs(client):
    """Drive the SSE generator directly for a deterministic, hang-free read."""
    await client.post("/api/jobs", json={"source_url": "https://youtu.be/x"})

    from app.routers.jobs import stream_jobs

    response = await stream_jobs(factory=client.factory)
    assert response.media_type == "text/event-stream"

    body_iter = response.body_iterator
    try:
        chunk = await asyncio.wait_for(body_iter.__anext__(), timeout=5)
    finally:
        await body_iter.aclose()

    text = chunk.decode() if isinstance(chunk, (bytes, bytearray)) else chunk
    assert "event: jobs" in text
    assert '"status": "queued"' in text
