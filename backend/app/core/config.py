from functools import lru_cache
from typing import Annotated

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_sqlalchemy_database_url(database_url: str) -> str:
    """Normalize common Postgres URLs to the installed SQLAlchemy psycopg driver."""
    normalized = database_url.strip()
    if normalized.startswith("postgres://"):
        return f"postgresql+psycopg://{normalized[len('postgres://'):]}"
    if normalized.startswith("postgresql://"):
        return f"postgresql+psycopg://{normalized[len('postgresql://'):]}"
    return normalized


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://xlr8hire:xlr8hire@localhost:5432/xlr8hire"
    jwt_secret_key: str = "change-this-local-demo-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    default_ai_provider: str = "deepseek"
    enable_ai_fallback: bool = True
    ai_onboarding_provider_timeout_ms: int = 1200
    ai_evaluation_provider_timeout_ms: int = 15000
    ai_provider_failure_cooldown_seconds: int = 300
    ai_fast_onboarding_mode: bool = True
    ai_onboarding_skip_unhealthy_providers: bool = True
    ai_onboarding_max_real_provider_attempts: int = 1
    ai_free_tier_mode: bool = True
    batch_evaluation_enabled: bool = True
    evaluation_max_ai_calls_per_report: int = 1
    evaluation_disable_provider_fallback: bool = True
    openrouter_single_model_mode: bool = True
    ai_required_for_evaluation: bool = True
    allow_stub_evaluation: bool = False
    enable_nvidia_fallback: bool = False
    enable_gemini_fallback: bool = False
    report_generation_lock_enabled: bool = True
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    deepseek_reasoner_model: str = "deepseek-reasoner"
    deepseek_timeout_ms: int = 15000
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "qwen/qwen3-next-80b-a3b-instruct:free"
    openrouter_coder_model: str = "qwen/qwen3-coder-480b-a35b-instruct:free"
    openrouter_fallback_model: str = "openai/gpt-oss-120b:free"
    openrouter_app_name: str = "XLR8Hire"
    openrouter_site_url: str = "http://localhost:3000"
    openrouter_provider_timeout_ms: int = 15000
    openrouter_evaluation_timeout_ms: int = 20000
    openrouter_onboarding_timeout_ms: int = 1500
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash-lite"
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
    embedding_provider: str = "stub"
    enable_live_embedding_calls: bool = False
    gemini_embedding_model: str = "text-embedding-004"
    ai_evaluation_large_payload_warning_chars: int = 20000
    stub_embedding_dimensions: int = 64
    enable_search_text_fallback: bool = True
    rag_dataset_path: str = "backend/data/rag"
    rag_embedding_provider: str = "stub"
    rag_embedding_model: str = "deterministic-stub"
    enable_rag_embedding_fallback: bool = True
    enable_rag_assessment: bool = True
    enable_rag_curated_fallback: bool = True
    rag_top_k: int = 8
    rag_min_similarity: float = 0.55
    rag_default_difficulty: str = "intermediate"
    enable_rag_evaluation: bool = True
    enable_rag_evaluation_fallback: bool = True
    rag_evaluation_embedding_mode: str = "local"
    rag_rubric_top_k: int = 5
    code_runner_enabled: bool = True
    code_runner_timeout_seconds: int = 3
    code_runner_max_code_chars: int = 12000
    redis_url: str = ""
    redis_enabled: bool = False
    redis_report_lock_ttl_seconds: int = 300
    redis_provider_cooldown_default_seconds: int = 300
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

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_sqlalchemy_database_url(self.database_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()
