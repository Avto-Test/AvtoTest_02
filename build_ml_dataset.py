from __future__ import annotations

import asyncio

from database.session import async_session_maker
from services.ml_data.dataset_builder import build_ml_dataset, export_ml_dataset_csv


async def main() -> None:
    async with async_session_maker() as db:
        summary = await build_ml_dataset(db)
        await db.commit()
        output_path, _ = await export_ml_dataset_csv(db)

    logger.info("ML dataset build complete")
    logger.info(f"  built_rows: {summary.built_rows}")
    logger.info(f"  usable_rows: {summary.usable_rows}")
    logger.info(f"  unusable_rows: {summary.unusable_rows}")
    logger.info(f"  skipped_no_snapshot: {summary.skipped_no_snapshot}")
    logger.info(f"  total_exam_results: {summary.total_exam_results}")
    logger.info(f"  csv_export: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
