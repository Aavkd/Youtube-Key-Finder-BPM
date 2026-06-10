"""Phase 1 acceptance: create + read each entity."""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import (
    Job,
    JobStatus,
    Playlist,
    PlaylistTrack,
    Tag,
    Track,
    TrackStatus,
    TrackTag,
)


async def _make_track(session, **overrides) -> Track:
    defaults = dict(
        source_url="https://youtu.be/abc123",
        youtube_id="abc123",
        title="Dark Type Beat",
        duration_sec=185,
        bpm=Decimal("140.00"),
        bpm_alternatives=[70.0, 280.0],
        bpm_confidence=Decimal("0.910"),
        key="F# Minor",
        key_alternatives=["A Major"],
        key_confidence=Decimal("0.840"),
        mood_palette={"primary": "#7c3aed"},
        status=TrackStatus.ready,
    )
    defaults.update(overrides)
    track = Track(**defaults)
    session.add(track)
    await session.flush()
    return track


async def test_create_and_read_track(session):
    track = await _make_track(session)
    await session.commit()

    fetched = (
        await session.execute(select(Track).where(Track.id == track.id))
    ).scalar_one()

    assert isinstance(fetched.id, uuid.UUID)
    assert fetched.title == "Dark Type Beat"
    assert fetched.bpm == Decimal("140.00")
    assert fetched.bpm_alternatives == [70.0, 280.0]
    assert fetched.key_alternatives == ["A Major"]
    assert fetched.mood_palette == {"primary": "#7c3aed"}
    assert fetched.status is TrackStatus.ready
    # Defaults.
    assert fetched.bpm_manual is False
    assert fetched.is_favorite is False
    assert fetched.created_at is not None
    assert fetched.user_id is None  # nullable in v1


async def test_tag_and_track_tag(session):
    track = await _make_track(session)
    tag = Tag(name="dark")
    session.add(tag)
    await session.flush()
    session.add(TrackTag(track_id=track.id, tag_id=tag.id))
    await session.commit()

    loaded = (
        await session.execute(
            select(Track)
            .options(selectinload(Track.tags))
            .where(Track.id == track.id)
        )
    ).scalar_one()
    assert [t.name for t in loaded.tags] == ["dark"]


async def test_playlist_with_ordered_tracks(session):
    t1 = await _make_track(session, title="One")
    t2 = await _make_track(session, title="Two")
    playlist = Playlist(name="Favorites")
    session.add(playlist)
    await session.flush()
    session.add_all(
        [
            PlaylistTrack(playlist_id=playlist.id, track_id=t2.id, position=1),
            PlaylistTrack(playlist_id=playlist.id, track_id=t1.id, position=0),
        ]
    )
    await session.commit()

    loaded = (
        await session.execute(
            select(Playlist)
            .options(selectinload(Playlist.track_associations))
            .where(Playlist.id == playlist.id)
        )
    ).scalar_one()
    positions = [a.position for a in loaded.track_associations]
    assert positions == [0, 1]  # ordered by position


async def test_job_lifecycle(session):
    job = Job(source_url="https://youtu.be/abc123")
    session.add(job)
    await session.commit()

    fetched = (
        await session.execute(select(Job).where(Job.id == job.id))
    ).scalar_one()
    assert fetched.status is JobStatus.queued
    assert fetched.progress == 0
    assert fetched.track_id is None

    # Transition through to done, linking a track.
    track = await _make_track(session)
    fetched.status = JobStatus.done
    fetched.progress = 100
    fetched.track_id = track.id
    await session.commit()

    refetched = (
        await session.execute(select(Job).where(Job.id == job.id))
    ).scalar_one()
    assert refetched.status is JobStatus.done
    assert refetched.progress == 100
    assert refetched.track_id == track.id
