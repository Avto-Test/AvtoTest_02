"""Database environment safety helpers."""

from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy.engine import make_url

TEST_ENVIRONMENTS = {"test", "testing", "pytest", "ci"}
PRODUCTION_ENVIRONMENTS = {"prod", "production"}
DEVELOPMENT_ENVIRONMENTS = {"dev", "development", "local"}
SAFE_TEST_DB_MARKERS = ("test", "pytest", "ci")


@dataclass(frozen=True)
class DatabaseIdentity:
    """A sanitized representation of a configured database target."""

    drivername: str
    username: str | None
    host: str | None
    port: int | None
    database: str | None


def normalize_environment_name(environment: str | None) -> str:
    """Return the canonical environment name used by the safety system."""

    normalized = (environment or "development").strip().lower()
    if normalized in TEST_ENVIRONMENTS:
        return "testing"
    if normalized in PRODUCTION_ENVIRONMENTS:
        return "production"
    if normalized in DEVELOPMENT_ENVIRONMENTS:
        return "development"
    return normalized or "development"


def is_test_environment(environment: str | None) -> bool:
    """Return True when the provided environment is a test environment."""

    return normalize_environment_name(environment) == "testing"


def is_production_environment(environment: str | None) -> bool:
    """Return True when the provided environment is production."""

    return normalize_environment_name(environment) == "production"


def is_safe_test_database_name(database_name: str | None) -> bool:
    """Return True when the database name clearly targets a disposable test database."""

    if not database_name:
        return False
    normalized = database_name.strip().lower()
    return bool(re.search(r"(^|[_-])(test|pytest|ci)($|[_-])", normalized))


def parse_database_identity(database_url: str) -> DatabaseIdentity:
    """Parse a SQLAlchemy database URL into a small identity object."""

    parsed = make_url(database_url)
    return DatabaseIdentity(
        drivername=parsed.drivername,
        username=parsed.username,
        host=parsed.host,
        port=parsed.port,
        database=parsed.database,
    )


def render_database_target(database_url: str) -> str:
    """Return a log-safe database target label."""

    identity = parse_database_identity(database_url)
    database_name = identity.database or "<unknown-db>"
    if identity.drivername.startswith("sqlite"):
        return f"{identity.drivername}:{database_name}"
    host = identity.host or "localhost"
    return f"{host}/{database_name}"


def derive_test_database_url(database_url: str) -> str:
    """Return a safe test database URL derived from an existing database URL."""

    parsed = make_url(database_url)
    if parsed.drivername.startswith("sqlite"):
        return parsed.render_as_string(hide_password=False)

    database_name = parsed.database or "autotest"
    safe_database_name = (
        database_name
        if is_safe_test_database_name(database_name)
        else f"{database_name}_test"
    )
    return parsed.set(database=safe_database_name).render_as_string(hide_password=False)


def validate_database_target(
    database_url: str,
    environment: str | None,
    expected_database_name: str | None = None,
) -> DatabaseIdentity:
    """Fail fast when an environment points at the wrong database."""

    identity = parse_database_identity(database_url)
    database_name = (identity.database or "").strip()
    normalized_environment = normalize_environment_name(environment)
    expected_name = (expected_database_name or "").strip()

    if not identity.drivername.startswith("sqlite") and not database_name:
        raise RuntimeError("DATABASE_URL must include an explicit database name.")

    if expected_name and database_name != expected_name:
        raise RuntimeError(
            f"Configured database '{database_name}' does not match EXPECTED_DATABASE_NAME '{expected_name}'."
        )

    if normalized_environment == "testing" and not is_safe_test_database_name(database_name):
        raise RuntimeError(
            "Testing environment must point to a dedicated test database. "
            "Use a database name containing 'test', 'pytest', or 'ci'."
        )

    if normalized_environment == "production" and is_safe_test_database_name(database_name):
        raise RuntimeError(
            "Production environment cannot point to a test database."
        )

    return identity
