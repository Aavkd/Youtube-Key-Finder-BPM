"""Pydantic schemas for tags."""

import uuid
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class TagBase(BaseModel):
    name: str = Field(min_length=1)
    user_id: Optional[uuid.UUID] = None


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)


class TagRead(ORMModel, TagBase):
    id: uuid.UUID
