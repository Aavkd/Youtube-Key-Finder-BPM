"""Seed / smoke script.

Inserts one example track, tag, playlist, and job, links them, then reads
them back — a quick end-to-end check that the schema + models work against
the configured database.

Run inside the backend container (after `alembic upgrade head`):

    python -m app.scripts.seed
"""

import asyncio
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db import get_session_factory
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


async def seed() -> None:
    async_session_factory = get_session_factory()
    async with async_session_factory() as session:
        track = Track(
            source_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtube_id="dQw4w9WgXcQ",
            title="Example Type Beat",
            duration_sec=185,
            thumbnail_url="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            bpm=Decimal("140.00"),
            bpm_alternatives=[70.0, 280.0],
            bpm_confidence=Decimal("0.910"),
            key="F# Minor",
            key_alternatives=["A Major"],
            key_confidence=Decimal("0.840"),
            mood_palette={"primary": "#7c3aed", "energy": 0.66},
            status=TrackStatus.ready,
        )
        tag = Tag(name="dark")
        playlist = Playlist(name="Favorites")
        job = Job(
            source_url=track.source_url,
            status=JobStatus.done,
            progress=100,
        )

        session.add_all([track, tag, playlist, job])
        await session.flush()

        session.add(TrackTag(track_id=track.id, tag_id=tag.id))
        session.add(
            PlaylistTrack(playlist_id=playlist.id, track_id=track.id, position=0)
        )
        job.track_id = track.id

        await session.commit()
        track_id = track.id

    # Read back with relationships eagerly loaded.
    async with async_session_factory() as session:
        result = await session.execute(
            select(Track)
            .options(
                selectinload(Track.tags),
                selectinload(Track.playlist_associations),
            )
            .where(Track.id == track_id)
        )
        loaded = result.scalar_one()
        print(
            f"Seeded track {loaded.id}: '{loaded.title}' "
            f"{loaded.bpm} BPM / {loaded.key} "
            f"| tags={[t.name for t in loaded.tags]} "
            f"| status={loaded.status.value}"
        )


if __name__ == "__main__":
    asyncio.run(seed())
