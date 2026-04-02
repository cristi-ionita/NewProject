import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = os.getenv("APP_ENV_FILE", ".env")


class Settings(BaseSettings):
    APP_NAME: str = "Flota API"
    APP_ENV: str = "dev"
    DEBUG: bool = True

    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    ADMIN_PASSWORD: str
    ADMIN_TOKEN_SECRET: str

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()