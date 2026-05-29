from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    app_name: str = "AI PDF Service"
    app_version: str = "1.0.0"
    debug: bool = False

    host: str = "0.0.0.0"
    port: int = 8000

    cors_origins: str = "*"

    log_level: str = "INFO"

    llm_provider: str = "ollama"
    llm_model: str = "qwen2.5:0.5b"
    llm_temperature: float = 0.1
    llm_max_tokens: int = 2048
    llm_timeout: int = 300

    ollama_base_url: str = "http://localhost:11434"

    openai_api_key: Optional[str] = None
    openai_api_base: Optional[str] = None

    rate_limit_per_minute: int = 60

    mongodb_uri: Optional[str] = None

    redis_url: Optional[str] = None

    sentry_dsn: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
