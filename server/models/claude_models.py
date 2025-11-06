"""
Data models for Claude AI assistant integration.

Defines request/response models for chat, analysis, and error explanation.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from server.models.genie_models import QueryResults


class ConversationContext(BaseModel):
    """Context for Claude conversation."""

    model_config = ConfigDict(populate_by_name=True)

    conversation_history: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Previous messages in the conversation",
        alias="conversationHistory"
    )
    current_query_results: Optional[QueryResults] = Field(
        None,
        description="Current query results being discussed",
        alias="currentQueryResults"
    )
    dashboard_state: Optional[Dict[str, Any]] = Field(
        None,
        description="Current dashboard state and filters",
        alias="dashboardState"
    )


class ChatRequest(BaseModel):
    """Request to chat with Claude."""

    message: str = Field(..., description="User's message")
    context: ConversationContext = Field(
        default_factory=ConversationContext,
        description="Conversation context"
    )


class ChatResponse(BaseModel):
    """Response from Claude chat."""

    model_config = ConfigDict(populate_by_name=True, by_alias=True)

    message: str = Field(..., description="Claude's response message")
    suggested_followups: List[str] = Field(
        default_factory=list,
        description="Suggested follow-up questions or actions",
        alias="suggestedFollowups"
    )
    confidence: float = Field(
        default=1.0,
        description="Confidence score for the response (0-1)"
    )


class AnalyzeRequest(BaseModel):
    """Request to analyze query results."""

    query_results: QueryResults = Field(..., description="Query results to analyze")
    query_sql: str = Field(..., description="The SQL query that generated these results")


class AnalysisResponse(BaseModel):
    """Response from query result analysis."""

    insights: List[str] = Field(
        default_factory=list,
        description="Key insights discovered in the data"
    )
    anomalies: List[str] = Field(
        default_factory=list,
        description="Anomalies or unusual patterns detected"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Recommended actions or next steps"
    )


class ErrorRequest(BaseModel):
    """Request to explain an error."""

    error: str = Field(..., description="The error message to explain")
    original_question: str = Field(..., description="The original user question that caused the error")


class ErrorExplanation(BaseModel):
    """Business-friendly error explanation."""

    explanation: str = Field(..., description="Human-friendly explanation of the error")
    suggested_rephrasings: List[str] = Field(
        default_factory=list,
        description="Suggested ways to rephrase the question"
    )
    help_text: Optional[str] = Field(
        None,
        description="Additional help text or tips"
    )
