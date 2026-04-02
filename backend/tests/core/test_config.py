import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_database_url_builds_correctly(monkeypatch):
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "test_db")
    monkeypatch.setenv("DB_USER", "user")
    monkeypatch.setenv("DB_PASSWORD", "pass")
    monkeypatch.setenv("ADMIN_PASSWORD", "admin")
    monkeypatch.setenv("ADMIN_TOKEN_SECRET", "secret")

    settings = Settings(_env_file=None)

    assert settings.database_url == ("postgresql+asyncpg://user:pass@localhost:5432/test_db")


def test_default_values(monkeypatch):
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "test_db")
    monkeypatch.setenv("DB_USER", "user")
    monkeypatch.setenv("DB_PASSWORD", "pass")
    monkeypatch.setenv("ADMIN_PASSWORD", "admin")
    monkeypatch.setenv("ADMIN_TOKEN_SECRET", "secret")

    settings = Settings(_env_file=None)

    assert settings.APP_NAME == "Flota API"
    assert settings.APP_ENV == "dev"
    assert settings.DEBUG is True


def test_missing_required_env_vars(monkeypatch):
    for key in [
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
        "ADMIN_PASSWORD",
        "ADMIN_TOKEN_SECRET",
    ]:
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_reads_from_env(monkeypatch):
    monkeypatch.setenv("DB_HOST", "127.0.0.1")
    monkeypatch.setenv("DB_PORT", "5433")
    monkeypatch.setenv("DB_NAME", "fleet_db")
    monkeypatch.setenv("DB_USER", "fleet_user")
    monkeypatch.setenv("DB_PASSWORD", "fleet_pass")
    monkeypatch.setenv("ADMIN_PASSWORD", "superadmin")
    monkeypatch.setenv("ADMIN_TOKEN_SECRET", "supersecret")

    settings = Settings(_env_file=None)

    assert settings.DB_HOST == "127.0.0.1"
    assert settings.DB_PORT == 5433
    assert settings.DB_NAME == "fleet_db"
    assert settings.DB_USER == "fleet_user"
    assert settings.DB_PASSWORD == "fleet_pass"
    assert settings.ADMIN_PASSWORD == "superadmin"
    assert settings.ADMIN_TOKEN_SECRET == "supersecret"
