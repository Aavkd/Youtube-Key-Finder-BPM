"""Key Finder worker process entrypoint.

Phase 2: runs the async queue loop — claims jobs from the Postgres-backed
queue (`FOR UPDATE SKIP LOCKED`), then downloads → converts → stores audio,
driving job/track state. Analysis (BPM + key) is added in Phase 3.
"""

import asyncio
import logging
import signal

from app.runner import WorkerRunner

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [worker] %(levelname)s %(message)s",
)
logger = logging.getLogger("worker")


async def _amain() -> None:
    runner = WorkerRunner()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, runner.request_stop)
        except NotImplementedError:
            # add_signal_handler is unavailable on Windows; fall back to signal.
            signal.signal(sig, lambda *_: runner.request_stop())

    await runner.run()


def main() -> None:
    try:
        asyncio.run(_amain())
    except KeyboardInterrupt:  # pragma: no cover
        logger.info("Interrupted; exiting.")


if __name__ == "__main__":
    main()
