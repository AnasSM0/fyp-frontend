from functools import lru_cache
from typing import Annotated

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://xlr8hire:xlr8hire@localhost:5432/xlr8hire"
    jwt_secret_key: str = "change-this-local-demo-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    default_ai_provider: str = "nvidia"
    enable_ai_fallback: bool = True
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
    gemini_embedding_model: str = "text-embedding-004"
    stub_embedding_dimensions: int = 64
    enable_search_text_fallback: bool = True
    cors_origins: Annotated[str, Field(description="Comma-separated allowed origins")] = (
        "http://localhost:3000"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
