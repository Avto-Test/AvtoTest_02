# AUTOTEST Restore Drill

This document describes the safe restore-drill flow for AUTOTEST.

## Goal

Validate that a PostgreSQL backup can be restored into a disposable database
named `autotest_restorecheck` and that the restored schema contains the core
application tables.

## Safety warnings

- Never restore into the live application database.
- The disposable restore database for this drill must be `autotest_restorecheck`.
- Run the drill against a disposable source database or a vetted non-production
  snapshot when possible.
- Keep PostgreSQL client tools (`pg_dump`, `pg_restore`, `createdb`, `dropdb`)
  installed on the machine that runs the drill.

## Backup command

```powershell
.\.venv\Scripts\python.exe scripts\db_backup.py `
  --database-url "postgresql+asyncpg://postgres:***@localhost:5432/autotest_restoresource" `
  --output-dir backups `
  --label restorecheck
```

## Restore command

```powershell
.\.venv\Scripts\python.exe scripts\run_restore_drill.py `
  --source-database-url "postgresql+asyncpg://postgres:***@localhost:5432/autotest_restoresource"
```

## Verification steps

1. Create a backup dump with `db_backup.py`.
2. Drop and recreate the disposable database `autotest_restorecheck`.
3. Restore the dump into `autotest_restorecheck`.
4. Run `verify_restore.py` against the restored database.
5. Confirm that the verification output reports:
   - `restore_verification=ok`
   - `alembic_version` exists
   - `users` exists
   - `tests` exists
   - `questions` exists
   - other required core tables are present

## Direct verification command

```powershell
.\.venv\Scripts\python.exe scripts\verify_restore.py `
  --database-url "postgresql+asyncpg://postgres:***@localhost:5432/autotest_restorecheck"
```
