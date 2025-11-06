"""
Dashboard API Router - Dashboard configuration and embedding.

Provides REST API endpoints for:
- Getting dashboard embed configuration
- Refreshing dashboard tokens
"""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from databricks.sdk import WorkspaceClient
from server.config import settings
from server.services.user_service import get_workspace_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class DashboardConfig(BaseModel):
    """Dashboard configuration for embedding."""

    dashboardUrl: str
    dashboardId: str
    embedToken: str | None = None
    expiresAt: datetime | None = None


class TokenResponse(BaseModel):
    """Token refresh response."""

    token: str
    expiresAt: datetime


@router.get("/config", response_model=DashboardConfig)
async def get_dashboard_config(
    workspace_client: WorkspaceClient = Depends(get_workspace_client)
):
    """
    Get dashboard configuration for embedding.

    Returns the dashboard URL and optional embed token
    for secure iframe embedding.

    Returns:
        DashboardConfig with URL and token information

    Raises:
        HTTPException: If configuration retrieval fails
    """
    try:
        dashboard_id = settings.dashboard_id
        databricks_host = settings.databricks_host

        # Construct dashboard URL
        # Format: https://<host>/dashboardsv3/<id>/published?o=<org_id>
        # Extract org ID from host if needed
        org_id = databricks_host.split("adb-")[1].split(".")[0] if "adb-" in databricks_host else ""

        dashboard_url = (
            f"{databricks_host}/dashboardsv3/{dashboard_id}/published"
            f"?o={org_id}" if org_id else ""
        )

        logger.info(f"Dashboard URL: {dashboard_url}")

        # For Phase 1, we'll return the dashboard URL without token
        # Phase 2 can implement token-based embedding if needed
        config = DashboardConfig(
            dashboardUrl=dashboard_url,
            dashboardId=dashboard_id,
            embedToken=None,  # Will be implemented if needed
            expiresAt=None
        )

        return config

    except Exception as e:
        logger.error(f"Failed to get dashboard config: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get dashboard config: {str(e)}"
        )


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_dashboard_token(
    workspace_client: WorkspaceClient = Depends(get_workspace_client)
):
    """
    Refresh dashboard embed token.

    Generates a new token for dashboard embedding with
    extended expiration time.

    Returns:
        TokenResponse with new token and expiration

    Raises:
        HTTPException: If token refresh fails
    """
    try:
        # For Phase 1, this is a placeholder
        # Token generation will be implemented if needed for secure embedding

        logger.info("Token refresh requested")

        # Return placeholder response
        expires_at = datetime.now() + timedelta(minutes=30)

        return TokenResponse(
            token="placeholder_token",
            expiresAt=expires_at
        )

    except Exception as e:
        logger.error(f"Failed to refresh token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh token: {str(e)}"
        )
