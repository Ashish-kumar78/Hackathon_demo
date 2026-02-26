"""
core/config.py - Environment Variables & API Keys
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "MindVest"
    DEBUG: bool = False
    SECRET_KEY: str = "your-super-secret-key-change-in-production"

    # Database (Supabase)
    DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # JWT
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Web3
    WEB3_PROVIDER_URL: str = ""
    WALLET_PRIVATE_KEY: str = ""

    # APIs
    NEWS_API_KEY: str = ""
    OPENAI_API_KEY: str = ""  # Or Gemini / Groq key
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
