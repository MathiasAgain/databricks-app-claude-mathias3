"""
Application configuration management.

Loads settings from environment variables and provides
type-safe access to configuration values.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Databricks Configuration
    databricks_host: str
    databricks_warehouse_id: str
    genie_space_id: str
    claude_endpoint: str
    dashboard_id: str

    # Query Settings
    query_cache_ttl: int = 300  # 5 minutes
    query_timeout: int = 30  # 30 seconds
    max_query_results: int = 1000  # Maximum rows to return

    # Feature Flags
    enable_proactive_insights: bool = True
    enable_query_caching: bool = True

    # Optional Settings
    log_level: str = "INFO"

    class Config:
        env_file = ".env.local"
        case_sensitive = False
        extra = "allow"  # Allow extra fields from .env.local


# Global settings instance
settings = Settings()
