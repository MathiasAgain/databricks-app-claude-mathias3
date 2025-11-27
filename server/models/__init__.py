"""
Data models for the Nielsen Sales Analytics Assistant.

This package contains Pydantic models for API requests, responses,
and internal data structures.
"""

from server.models.genie_models import (
    AskQuestionRequest,
    AskQuestionResponse,
    QueryResults,
    GenieResponse,
    SuggestedQuestion,
    VisualizationSpec,
)

from server.models.claude_models import (
    ConversationContext,
    ChatRequest,
    ChatResponse,
    AnalyzeRequest,
    AnalysisResponse,
    ErrorRequest,
    ErrorExplanation,
)

__all__ = [
    # Genie models
    "AskQuestionRequest",
    "AskQuestionResponse",
    "QueryResults",
    "GenieResponse",
    "SuggestedQuestion",
    "VisualizationSpec",
    # Claude models
    "ConversationContext",
    "ChatRequest",
    "ChatResponse",
    "AnalyzeRequest",
    "AnalysisResponse",
    "ErrorRequest",
    "ErrorExplanation",
]
