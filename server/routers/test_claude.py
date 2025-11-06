"""Test Claude endpoint - minimal version"""
import logging
from fastapi import APIRouter, Depends
from databricks.sdk import WorkspaceClient
from server.services import ClaudeService
from server.services.user_service import get_workspace_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/test", tags=["test"])


@router.get("/claude")
async def test_claude(
    workspace_client: WorkspaceClient = Depends(get_workspace_client)
):
    """Minimal test of Claude integration"""
    try:
        logger.info("Testing Claude service...")

        claude_service = ClaudeService(workspace_client)

        result = await claude_service.analyze_query_results(
            question="Test question",
            sql="SELECT * FROM test",
            results={
                "columns": ["col1", "col2"],
                "rows": [[1, 2], [3, 4]],
                "rowCount": 2
            }
        )

        return {
            "success": True,
            "result": result
        }

    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        logger.exception("Full error:")
        return {
            "success": False,
            "error": str(e)
        }
