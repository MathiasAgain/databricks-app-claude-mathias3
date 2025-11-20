"""
Genie API Router - Natural language query endpoints.

Provides REST API endpoints for:
- Asking natural language questions
- Getting suggested questions
- Canceling running queries
- Chatting with AI agents (analytics and visualization)
"""

import asyncio
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
from server.services.visualization_service import get_visualization_service
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
    3. Uses Claude Sonnet to analyze results and generate insights (parallel)
    4. Uses Claude Haiku to generate optimal visualization (parallel)
    5. Returns results with AI summary, chart, and context-aware follow-ups

    Args:
        request: Question request with optional context

    Returns:
        AskQuestionResponse with SQL, results, AI insights, and visualization

    Raises:
        HTTPException: If query generation or execution fails
    """
    try:
        logger.info(f"Received question: {request.question}")

        # Step 1: Use Genie service to generate and execute query
        genie_response = await genie_service.ask_question(request.question)

        # Step 2: Call both AI agents in parallel for faster response
        logger.info("Calling Claude (analytics) and Visualization agent in parallel...")

        # Prepare results for agents
        results_dict = {
            "columns": genie_response.results.columns,
            "rows": genie_response.results.rows,
            "rowCount": genie_response.results.rowCount
        }

        # Create parallel tasks
        analysis_task = claude_service.analyze_query_results(
            question=request.question,
            sql=genie_response.sql,
            results=results_dict
        )

        viz_task = get_visualization_service().generate_visualization(
            results=genie_response.results,
            user_question=request.question,
            analysis_context=None  # Could pass Claude's summary here in sequential mode
        )

        # Execute both tasks in parallel
        analysis, visualization_spec = await asyncio.gather(
            analysis_task,
            viz_task,
            return_exceptions=True  # Don't fail if one agent fails
        )

        # Handle potential errors from parallel execution
        if isinstance(analysis, Exception):
            logger.error(f"Claude analysis failed: {str(analysis)}")
            analysis = {
                "summary": "Analysis unavailable due to an error.",
                "followup_questions": []
            }

        if isinstance(visualization_spec, Exception):
            logger.error(f"Visualization generation failed: {str(visualization_spec)}")
            visualization_spec = None

        # Build response with AI-generated insights and visualization
        response = AskQuestionResponse(
            question=request.question,
            sql=genie_response.sql,
            genieAnswer=genie_response.genieAnswer,
            results=genie_response.results,
            aiSummary=analysis["summary"],
            suggestedFollowups=analysis["followup_questions"],
            executionTimeMs=genie_response.executionTimeMs,
            queryId=genie_response.queryId,
            visualizationSpec=visualization_spec
        )

        logger.info(
            f"Question answered with AI analysis and visualization: "
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
    Have a multi-turn conversation with AI agents about query results.

    This endpoint uses Claude's intelligent tool calling to route requests:
    - Claude Sonnet analyzes the user's message and decides whether to:
      1. Provide analytical insights (default)
      2. Call the modify_visualization tool for chart changes
    - No keyword matching needed - Claude understands context and intent

    Args:
        request: Chat request with message and conversation context

    Returns:
        ChatResponse with AI message, optional visualization spec, and follow-ups

    Raises:
        HTTPException: If chat fails
    """
    try:
        logger.info(f"Chat request: {request.message}")

        # Extract query results and visualization spec from context
        query_results = None
        current_viz_spec = None
        if request.context.current_query_results:
            query_results = {
                "columns": request.context.current_query_results.columns,
                "rows": request.context.current_query_results.rows,
                "rowCount": request.context.current_query_results.rowCount
            }
            # Extract current visualization spec if present
            current_viz_spec = getattr(
                request.context.current_query_results,
                "visualizationSpec",
                None
            )

        # Call Claude with tool calling support - it will decide routing intelligently
        logger.info(f"Calling Claude Sonnet with tool calling {'enabled' if current_viz_spec else 'disabled'}")

        response = await claude_service.chat_with_context(
            message=request.message,
            conversation_history=request.context.conversation_history,
            query_results=query_results,
            current_viz_spec=current_viz_spec  # Enables modify_visualization tool
        )

        # FALLBACK: If tool calling isn't supported by Databricks endpoint,
        # detect visualization requests using keywords and call viz service directly
        updated_viz_spec = response.get("visualization_spec")

        if not updated_viz_spec and current_viz_spec and query_results:
            # Check if this is a visualization modification request using keyword detection
            from server.services.visualization_service import VisualizationService
            from server.models import QueryResults, VisualizationSpec

            if VisualizationService.is_visualization_request(request.message):
                logger.info("Detected visualization request (fallback mode) - calling viz service directly")

                # Convert dict to QueryResults object
                results_obj = QueryResults(
                    columns=query_results["columns"],
                    rows=query_results["rows"],
                    rowCount=query_results["rowCount"]
                )

                # Call visualization service directly
                viz_service = get_visualization_service()
                updated_viz_spec = await viz_service.modify_visualization(
                    current_spec=VisualizationSpec(**current_viz_spec.model_dump() if hasattr(current_viz_spec, 'model_dump') else current_viz_spec),
                    results=results_obj,
                    modification_request=request.message
                )

                if updated_viz_spec:
                    logger.info(f"Fallback viz modification successful: {updated_viz_spec.chartType}")
                    # Convert to dict for response
                    updated_viz_spec = updated_viz_spec.model_dump(by_alias=True)
                else:
                    logger.warning("Fallback viz modification failed")

        # Build response - visualization_spec will be present if Claude called the tool OR fallback succeeded
        chat_response = ChatResponse(
            message=response["message"],
            suggested_followups=response.get("suggested_followups", []),
            confidence=1.0,
            visualizationSpec=updated_viz_spec  # Updated viz from tool call or fallback
        )

        if updated_viz_spec:
            logger.info("Returning updated visualization (tool call or fallback)")
        else:
            logger.info("Claude provided analytical response only")

        return chat_response

    except Exception as e:
        logger.error(f"Failed to process chat request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}"
        )
