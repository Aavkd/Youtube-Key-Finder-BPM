"""Manual enqueue helper (until the backend's `POST /api/jobs` lands in Phase 4).

Adds a YouTube URL to the Postgres-backed queue so the running worker picks it
up. Run inside the worker container (DB must be migrated by the backend first):

    python -m app.scripts.enqueue "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
"""

import asyncio
import sys

from app.db import get_session_factory
from app.queue import PostgresJobQueue


async def _main(url: str) -> None:
    queue = PostgresJobQueue(get_session_factory())
    job_id = await queue.enqueue(url)
    print(f"Enqueued job {job_id} for {url}")


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: python -m app.scripts.enqueue <youtube-url>", file=sys.stderr)
        raise SystemExit(2)
    asyncio.run(_main(sys.argv[1]))


if __name__ == "__main__":
    main()
