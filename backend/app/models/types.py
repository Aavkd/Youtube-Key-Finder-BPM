"""Portable column types.

These keep the models usable on both PostgreSQL (production) and SQLite
(tests) without changing the model definitions:

- `JSONB` on Postgres, generic `JSON` elsewhere.
- Native `uuid` on Postgres, `CHAR(36)` elsewhere (SQLAlchemy's generic
  `Uuid` handles this when `native_uuid` is left at its default).
"""

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# JSONB on PostgreSQL, falling back to generic JSON (e.g. SQLite) elsewhere.
JSONType = JSON().with_variant(JSONB(), "postgresql")
