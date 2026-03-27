"""Unit tests for database environment safety guards."""

import pytest

from database.safety import (
    derive_test_database_url,
    is_safe_test_database_name,
    normalize_environment_name,
    validate_database_target,
)


def test_environment_names_are_normalized() -> None:
    assert normalize_environment_name("prod") == "production"
    assert normalize_environment_name("test") == "testing"
    assert normalize_environment_name("development") == "development"


def test_autotest_name_is_not_mistaken_for_test_database() -> None:
    assert is_safe_test_database_name("autotest") is False
    assert is_safe_test_database_name("autotest_test") is True


def test_testing_environment_rejects_non_test_database() -> None:
    with pytest.raises(RuntimeError, match="dedicated test database"):
        validate_database_target(
            "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest_dev",
            "testing",
        )


def test_testing_environment_accepts_test_database() -> None:
    identity = validate_database_target(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest_test",
        "testing",
        "autotest_test",
    )
    assert identity.database == "autotest_test"


def test_production_environment_rejects_test_database() -> None:
    with pytest.raises(RuntimeError, match="cannot point to a test database"):
        validate_database_target(
            "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest_test",
            "production",
            "autotest_test",
        )


def test_expected_database_name_must_match() -> None:
    with pytest.raises(RuntimeError, match="EXPECTED_DATABASE_NAME"):
        validate_database_target(
            "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest_dev",
            "development",
            "autotest_prod",
        )


def test_derive_test_database_url_appends_test_suffix() -> None:
    derived = derive_test_database_url(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest_dev"
    )
    assert derived.endswith("/autotest_dev_test")
