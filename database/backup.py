"""Database backup helpers used by operations scripts."""

from __future__ import annotations

import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.engine import make_url


def _to_pg_dump_url(database_url: str) -> str:
    """Convert an async SQLAlchemy URL into a libpq-compatible PostgreSQL URL."""

    parsed = make_url(database_url)
    if not parsed.drivername.startswith("postgresql"):
        raise RuntimeError("Automatic backups currently support PostgreSQL targets only.")
    return parsed.set(drivername="postgresql").render_as_string(hide_password=False)


def create_database_backup(
    *,
    database_url: str,
    output_dir: str | Path,
    environment: str,
    pg_dump_path: str = "pg_dump",
    keep: int = 14,
    label: str = "backup",
) -> Path:
    """Create a timestamped PostgreSQL backup and prune old backups."""

    dump_binary = shutil.which(pg_dump_path) or shutil.which(f"{pg_dump_path}.exe")
    if not dump_binary:
        raise RuntimeError(
            f"'{pg_dump_path}' was not found in PATH. Install PostgreSQL client tools before running backups."
        )

    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    parsed = make_url(database_url)
    database_name = parsed.database or "database"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    safe_label = label.replace(" ", "_").replace("/", "_")
    backup_path = output_root / f"{environment}_{database_name}_{safe_label}_{timestamp}.dump"

    command = [
        dump_binary,
        "--format=custom",
        f"--file={backup_path}",
        f"--dbname={_to_pg_dump_url(database_url)}",
    ]
    subprocess.run(
        command,
        check=True,
        env=os.environ.copy(),
    )

    backup_files = sorted(
        output_root.glob(f"{environment}_{database_name}_*.dump"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for stale_backup in backup_files[keep:]:
        stale_backup.unlink(missing_ok=True)

    return backup_path
