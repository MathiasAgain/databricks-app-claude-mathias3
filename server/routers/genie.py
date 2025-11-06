"""
Genie API Router - Natural language query endpoints.

Provides REST API endpoints for:
- Asking natural language questions
- Getting suggested questions
- Canceling running queries
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from databricks.sdk import WorkspaceClient
from server.models import (
    AskQuestionRequest,
    AskQuestionResponse,
    SuggestedQuestion,
    ChatRequest,
    ChatResponse
)
from server.services import GenieService, ClaudeService
from server.services.user_service import get_workspace_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/genie", tags=["genie"])


def get_genie_service(
    workspace_client: WorkspaceClient = Depends(get_workspace_client)
) -> GenieService:
    """Dependency injection for Genie service."""
    return GenieService(workspace_client)


def get_claude_service(
    workspace_client: WorkspaceClient = Depends(get_workspace_client)
) -> ClaudeService:
    """Dependency injection for Claude AI service."""
    return ClaudeService(workspace_client)


@router.post("/ask", response_model=AskQuestionResponse)
async def ask_question(
    request: AskQuestionRequest,
    genie_service: GenieService = Depends(get_genie_service),
    claude_service: ClaudeService = Depends(get_claude_service)
):
    """
    Ask a natural language question and get SQL + results with AI analysis.

    This endpoint:
    1. Generates SQL from the natural language question using Genie
    2. Executes the SQL on the data warehouse
    3. Uses Claude AI to analyze results and generate insights
    4. Returns results with AI summary and context-aware follow-ups

    Args:
        request: Question request with optional context

    Returns:
        AskQuestionResponse with SQL, results, and AI insights

    Raises:
        HTTPException: If query generation or execution fails
    """
    try:
        logger.info(f"Received question: {request.question}")

        # Use Genie service to generate and execute query
        genie_response = await genie_service.ask_question(request.question)

        # Use Claude AI to analyze the results
        logger.info("Analyzing results with Claude AI...")
        analysis = await claude_service.analyze_query_results(
            question=request.question,
            sql=genie_response.sql,
            results={
                "columns": genie_response.results.columns,
                "rows": genie_response.results.rows,
                "rowCount": genie_response.results.rowCount
            }
        )

        # Build response with AI-generated insights
        response = AskQuestionResponse(
            question=request.question,
            sql=genie_response.sql,
            genieAnswer=genie_response.genieAnswer,
            results=genie_response.results,
            aiSummary=analysis["summary"],
            suggestedFollowups=analysis["followup_questions"],
            executionTimeMs=genie_response.executionTimeMs,
            queryId=genie_response.queryId
        )

        logger.info(
            f"Question answered with AI analysis: "
            f"{response.results.rowCount} rows in {response.executionTimeMs}ms"
        )

        return response

    except Exception as e:
        logger.error(f"Failed to answer question: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to answer question: {str(e)}"
        )


@router.get("/suggestions", response_model=list[SuggestedQuestion])
async def get_suggested_questions(
    genie_service: GenieService = Depends(get_genie_service)
):
    """
    Get predefined suggested questions.

    Returns:
        List of suggested questions with categories

    Raises:
        HTTPException: If fetching suggestions fails
    """
    try:
        questions = genie_service.get_suggested_questions()

        # Convert to SuggestedQuestion objects
        suggestions = [
            SuggestedQuestion(
                question=q,
                category="Sales Analytics",
                description=None
            )
            for q in questions
        ]

        logger.info(f"Returned {len(suggestions)} suggested questions")
        return suggestions

    except Exception as e:
        logger.error(f"Failed to get suggested questions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get suggested questions: {str(e)}"
        )


@router.post("/cancel/{query_id}")
async def cancel_query(
    query_id: str,
    genie_service: GenieService = Depends(get_genie_service)
):
    """
    Cancel a running query.

    Args:
        query_id: Query ID to cancel

    Returns:
        Success message

    Raises:
        HTTPException: If cancellation fails
    """
    try:
        # Query cancellation will be implemented in warehouse service
        # For now, return success
        logger.info(f"Query cancellation requested: {query_id}")

        return {
            "success": True,
            "message": f"Query {query_id} cancellation requested",
            "query_id": query_id
        }

    except Exception as e:
        logger.error(f"Failed to cancel query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel query: {str(e)}"
        )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_claude(
    request: ChatRequest,
    claude_service: ClaudeService = Depends(get_claude_service)
):
    """
    Have a multi-turn conversation with Claude about query results.

    This endpoint enables conversational follow-ups where users can ask
    Claude questions about the current query results in context.

    Args:
        request: Chat request with message and conversation context

    Returns:
        ChatResponse with Claude's message and suggested follow-ups

    Raises:
        HTTPException: If chat fails
    """
    try:
        logger.info(f"Chat request: {request.message}")

        # Extract query results from context if available
        query_results = None
        if request.context.current_query_results:
            query_results = {
                "columns": request.context.current_query_results.columns,
                "rows": request.context.current_query_results.rows,
                "rowCount": request.context.current_query_results.rowCount
            }

        # Call Claude chat method
        response = await claude_service.chat_with_context(
            message=request.message,
            conversation_history=request.context.conversation_history,
            query_results=query_results
        )

        # Build response
        chat_response = ChatResponse(
            message=response["message"],
            suggested_followups=response.get("suggested_followups", []),
            confidence=1.0
        )

        logger.info("Chat response sent successfully")
        return chat_response

    except Exception as e:
        logger.error(f"Failed to process chat request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}"
        )
