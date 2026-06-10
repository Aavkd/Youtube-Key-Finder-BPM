"""Worker test fixtures.

Tests run against a shared in-memory SQLite database (via `aiosqlite` +
`StaticPool`) so the multiple short-lived sessions opened by the queue all see
the same data, with no external services. The portable column types keep the
same models working here and on Postgres.
"""

from collections.abc import AsyncGenerator

import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.db import Base
import app.models  # noqa: F401  (register tables on Base.metadata)
from app.queue import PostgresJobQueue


@pytest_asyncio.fixture
async def session_factory() -> AsyncGenerator[async_sessionmaker[AsyncSession], None]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        future=True,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )
    yield factory

    await engine.dispose()


@pytest_asyncio.fixture
async def queue(session_factory) -> PostgresJobQueue:
    return PostgresJobQueue(session_factory)
