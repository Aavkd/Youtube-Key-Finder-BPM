"""Async database engine, session factory, and the declarative Base.

Phase 1: SQLAlchemy (async) foundation. The engine talks to PostgreSQL in
production (via `asyncpg`); tests may point `DATABASE_URL` at SQLite
(`aiosqlite`). Column types are chosen to stay portable across both
(see `app.models.types`).
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return the lazily-created async engine.

    Created on first use so importing the models (for tests or Alembic
    autogeneration) does not require the production DB driver to be present.
    """
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url, echo=False, future=True
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the lazily-created async session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a request-scoped async session."""
    async with get_session_factory()() as session:
        yield session
