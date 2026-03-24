from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Flota API"
    APP_ENV: str = "dev"
    DEBUG: bool = True

    DB_HOST: str = "localhost"
    DB_PORT: int = 5433
    DB_NAME: str = "cars_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "12345"

    ADMIN_PASSWORD: str = "admin123"
    ADMIN_TOKEN_SECRET: str = "super-secret-admin-token-key"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()