"""Worker configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://keyfinder:keyfinder@db:5432/keyfinder"
    audio_storage_path: str = "/data/audio"
    max_duration_seconds: int = 1200
    queue_concurrency: int = 2

    # Seconds between queue polls in the Phase 0 placeholder loop.
    poll_interval_seconds: int = 5


settings = Settings()
