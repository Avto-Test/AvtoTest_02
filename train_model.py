from __future__ import annotations

import asyncio

from database.session import async_session_maker
from services.ml_data.training_pipeline import run_manual_training_placeholder


async def main() -> None:
    async with async_session_maker() as db:
        result = await run_manual_training_placeholder(db)

    logger.info("Manual training placeholder complete")
    logger.info(f"  status: {result.status}")
    logger.info(f"  message: {result.message}")
    logger.info(f"  artifact_path: {result.artifact_path}")
    logger.info(f"  dataset_rows: {result.dataset_rows}")
    logger.info(f"  usable_rows: {result.usable_rows}")
    logger.info(f"  train_rows: {result.train_rows}")
    logger.info(f"  test_rows: {result.test_rows}")


if __name__ == "__main__":
    asyncio.run(main())
