import os
from dotenv import load_dotenv

# Force .env file to override any cached OS environment variables
load_dotenv(dotenv_path=".env", override=True)

from pydantic_settings import BaseSettings, SettingsConfigDict
from openai import AsyncOpenAI

class Settings(BaseSettings):
    AGORA_APP_ID: str
    AGORA_APP_CERTIFICATE: str
    AGORA_CUSTOMER_ID: str
    AGORA_CUSTOMER_SECRET: str
    OPENAI_API_KEY: str
    GEMINI_API_KEY: str = ""
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    PUBLIC_BACKEND_URL: str = ""
    OPENAI_BASE_URL: str = "https://router.requesty.ai/v1"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Centralized Requesty-compatible OpenAI Client
openai_client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_BASE_URL if settings.OPENAI_BASE_URL else None
)

# Unified Requesty Model names
MODEL_LARGE = "openai/gpt-4o"
MODEL_SMALL = "openai/gpt-4o-mini"
