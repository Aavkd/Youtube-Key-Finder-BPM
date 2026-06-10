"""Async database engine, session factory, and declarative Base for the worker.

The worker is a **separate container** from the backend (D36) with its own
Docker build context, so it carries a self-contained data layer. It talks to
the *same* PostgreSQL database the backend migrates (via Alembic); the ORM
models here (`app.models`) mirror that schema so the worker can claim jobs and
write tracks. Tests may point `DATABASE_URL` at SQLite (`aiosqlite`).
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

    Created on first use so importing the models (e.g. for tests) does not
    require the production DB driver to be present.
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
    """Yield a session from the factory."""
    async with get_session_factory()() as session:
        yield session
