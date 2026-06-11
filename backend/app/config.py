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

    # Shared secret protecting the entire API. Empty = auth disabled (local dev).
    # In production: a strong random value (>= 32 bytes).
    app_auth_token: str = ""

    # CORS allowed origins, comma-separated. Use "*" for dev.
    cors_allow_origins: str = "*"
    # Optional regex for preview deploy URLs (e.g. "https://.*\\.vercel\\.app").
    cors_allow_origin_regex: str = ""


settings = Settings()
