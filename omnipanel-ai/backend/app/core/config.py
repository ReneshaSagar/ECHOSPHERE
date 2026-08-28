from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    AGORA_APP_ID: str = ""
    AGORA_APP_CERTIFICATE: str = ""
    AGORA_CUSTOMER_ID: str = ""
    AGORA_CUSTOMER_SECRET: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE: str = "https://router.requesty.ai/v1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    PUBLIC_BACKEND_URL: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
