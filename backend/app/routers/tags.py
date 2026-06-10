"""Tags API — list/create tags and attach/detach them to tracks (SPEC §5).

Endpoints (prefix ``/api``):
- ``GET /tags`` / ``POST /tags``
- ``POST /tags/{tag_id}/tracks/{track_id}`` — attach.
- ``DELETE /tags/{tag_id}/tracks/{track_id}`` — detach.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.db import get_session
from app.models import Tag, Track, TrackTag
from app.schemas import TagCreate, TagRead

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagRead])
async def list_tags(session=Depends(get_session)) -> list[Tag]:
    result = await session.execute(select(Tag).order_by(Tag.name))
    return list(result.scalars().all())


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
async def create_tag(payload: TagCreate, session=Depends(get_session)) -> Tag:
    existing = await session.scalar(
        select(Tag).where(Tag.name == payload.name)
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Tag already exists")
    tag = Tag(name=payload.name, user_id=payload.user_id)
    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return tag


@router.post(
    "/{tag_id}/tracks/{track_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def attach_tag(
    tag_id: uuid.UUID,
    track_id: uuid.UUID,
    session=Depends(get_session),
):
    if await session.get(Tag, tag_id) is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    if await session.get(Track, track_id) is None:
        raise HTTPException(status_code=404, detail="Track not found")

    existing = await session.get(
        TrackTag, {"track_id": track_id, "tag_id": tag_id}
    )
    if existing is None:
        session.add(TrackTag(track_id=track_id, tag_id=tag_id))
        await session.commit()


@router.delete(
    "/{tag_id}/tracks/{track_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def detach_tag(
    tag_id: uuid.UUID,
    track_id: uuid.UUID,
    session=Depends(get_session),
):
    assoc = await session.get(
        TrackTag, {"track_id": track_id, "tag_id": tag_id}
    )
    if assoc is None:
        raise HTTPException(status_code=404, detail="Tag not attached to track")
    await session.delete(assoc)
    await session.commit()
