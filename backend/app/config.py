"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend settings. Values come from the container environment."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://keyfinder:keyfinder@db:5432/keyfinder"
    audio_storage_path: str = "/data/audio"
    max_duration_seconds: int = 1200
    queue_concurrency: int = 2
    youtube_api_key: str = ""


settings = Settings()
