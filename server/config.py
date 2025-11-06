"""
Application configuration management.

Loads settings from environment variables and provides
type-safe access to configuration values.
"""

import sys
import logging
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings
from typing import Optional

logger = logging.getLogger(__name__)


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

    @field_validator("databricks_host")
    @classmethod
    def validate_databricks_host(cls, v: str) -> str:
        """Validate Databricks host is a valid URL."""
        if not v or not v.strip():
            raise ValueError(
                "DATABRICKS_HOST must be set. "
                "Example: https://your-workspace.cloud.databricks.com"
            )
        v = v.strip()
        if not v.startswith("https://"):
            raise ValueError(
                f"DATABRICKS_HOST must start with https:// but got: {v}"
            )
        return v

    @field_validator("databricks_warehouse_id", "genie_space_id", "dashboard_id")
    @classmethod
    def validate_required_ids(cls, v: str, info) -> str:
        """Validate required ID fields are not empty."""
        if not v or not v.strip():
            field_name = info.field_name.upper()
            raise ValueError(
                f"{field_name} must be set. "
                f"Check your .env.local file or environment variables."
            )
        return v.strip()

    @field_validator("claude_endpoint")
    @classmethod
    def validate_claude_endpoint(cls, v: str) -> str:
        """Validate Claude endpoint is not empty."""
        if not v or not v.strip():
            raise ValueError(
                "CLAUDE_ENDPOINT must be set. "
                "Example: databricks-claude-sonnet-4-5"
            )
        return v.strip()

    @field_validator("query_cache_ttl", "query_timeout", "max_query_results")
    @classmethod
    def validate_positive_integers(cls, v: int, info) -> int:
        """Validate numeric settings are positive."""
        if v <= 0:
            field_name = info.field_name.upper()
            raise ValueError(f"{field_name} must be positive, got: {v}")
        return v

    @model_validator(mode="after")
    def validate_settings(self):
        """Final validation after all fields are set."""
        # Log configuration (without sensitive data)
        logger.info("Configuration loaded successfully:")
        logger.info(f"  Databricks Host: {self.databricks_host}")
        logger.info(f"  Warehouse ID: {self.databricks_warehouse_id}")
        logger.info(f"  Genie Space ID: {self.genie_space_id}")
        logger.info(f"  Claude Endpoint: {self.claude_endpoint}")
        logger.info(f"  Dashboard ID: {self.dashboard_id}")
        logger.info(f"  Query Cache: {self.enable_query_caching} (TTL: {self.query_cache_ttl}s)")
        logger.info(f"  Max Results: {self.max_query_results} rows")
        return self


def load_settings() -> Settings:
    """
    Load and validate settings with comprehensive error handling.

    Returns:
        Settings: Validated settings instance

    Raises:
        SystemExit: If configuration is invalid
    """
    try:
        return Settings()
    except Exception as e:
        logger.error("=" * 60)
        logger.error("CONFIGURATION ERROR")
        logger.error("=" * 60)
        logger.error(f"{str(e)}")
        logger.error("")
        logger.error("Please check your .env.local file and ensure all required")
        logger.error("environment variables are set correctly.")
        logger.error("")
        logger.error("Required variables:")
        logger.error("  - DATABRICKS_HOST")
        logger.error("  - DATABRICKS_WAREHOUSE_ID")
        logger.error("  - GENIE_SPACE_ID")
        logger.error("  - CLAUDE_ENDPOINT")
        logger.error("  - DASHBOARD_ID")
        logger.error("=" * 60)
        sys.exit(1)


# Global settings instance with validation
settings = load_settings()
