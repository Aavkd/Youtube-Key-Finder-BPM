"""Shared schema base."""

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Base for schemas that read directly from ORM instances."""

    model_config = ConfigDict(from_attributes=True)
