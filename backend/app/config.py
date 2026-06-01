from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load .env from backend/ regardless of process cwd
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Only load backend/.env when present (local dev). Railway uses service env vars.
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    USE_LOCAL_DB: bool = False
    GOOGLE_API_KEY: str = ""
    # Gemini 1.5 models are retired on the current API; use 2.x (override in .env if needed)
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_PRO_MODEL: str = "gemini-2.5-pro"
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    SECRET_KEY: str = "change-me-in-production"

    @field_validator(
        "GOOGLE_API_KEY",
        "SUPABASE_SERVICE_KEY",
        "SUPABASE_URL",
        mode="before",
    )
    @classmethod
    def strip_env_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().strip('"').strip("'")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reload_settings() -> Settings:
    """Clear cached settings after .env changes (dev restarts)."""
    get_settings.cache_clear()
    return get_settings()


settings = get_settings()
