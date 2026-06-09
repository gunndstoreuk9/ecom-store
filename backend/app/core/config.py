from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = Field(default="development", alias="APP_ENV")
    api_base_url: str = Field(default="http://localhost:8000", alias="API_BASE_URL")
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    database_url: str = Field(
        default="postgresql+psycopg://tawazonhealth:tawazonhealth@localhost:5432/tawazonhealth",
        alias="DATABASE_URL",
    )
    sheets_webhook_url: str = Field(default="", alias="SHEETS_WEBHOOK_URL")
    admin_api_key: str = Field(default="", alias="ADMIN_API_KEY")
    meta_pixel_id: str = Field(default="", alias="META_PIXEL_ID")
    meta_capi_access_token: str = Field(default="", alias="META_CAPI_ACCESS_TOKEN")
    meta_test_event_code: str = Field(default="", alias="META_TEST_EVENT_CODE")
    tiktok_pixel_id: str = Field(default="", alias="TIKTOK_PIXEL_ID")
    tiktok_access_token: str = Field(default="", alias="TIKTOK_ACCESS_TOKEN")
    google_ads_conversion_id: str = Field(default="", alias="GOOGLE_ADS_CONVERSION_ID")
    google_ads_conversion_label: str = Field(default="", alias="GOOGLE_ADS_CONVERSION_LABEL")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    @property
    def normalized_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://") :]
        if "sslmode=disable" in url:
            url = url.replace("?sslmode=disable", "").replace("&sslmode=disable", "")
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        return url

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
