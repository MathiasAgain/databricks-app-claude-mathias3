"""
Data models for Genie API integration.

Defines request/response models for natural language query generation
and execution.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any


class AskQuestionRequest(BaseModel):
    """Request to ask a natural language question."""

    question: str = Field(..., description="Natural language question to ask")
    context: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional context including conversation ID and previous queries"
    )


class QueryResults(BaseModel):
    """Query execution results."""

    columns: List[str] = Field(..., description="Column names")
    rows: List[List[Any]] = Field(..., description="Query result rows")
    rowCount: int = Field(..., description="Number of rows returned")
    truncated: bool = Field(
        default=False,
        description="True if results were truncated due to max_query_results limit"
    )


class GenieResponse(BaseModel):
    """Internal response from Genie service."""

    question: str = Field(..., description="Original question asked by user")
    sql: str = Field(..., description="Generated SQL query")
    genieAnswer: str = Field(..., description="Genie's natural language answer")
    results: QueryResults = Field(..., description="Query execution results")
    aiSummary: str = Field(..., description="AI-generated summary of results")
    executionTimeMs: int = Field(..., description="Query execution time in milliseconds")
    queryId: str = Field(..., description="Unique query identifier")
    cached: bool = Field(default=False, description="True if results were from cache")


class AskQuestionResponse(BaseModel):
    """Response to ask question endpoint."""

    question: str = Field(..., description="Original question asked by user")
    sql: str = Field(..., description="Generated SQL query")
    genieAnswer: str = Field(..., description="Genie's natural language answer")
    results: QueryResults = Field(..., description="Query execution results")
    aiSummary: str = Field(..., description="AI-generated summary of results")
    suggestedFollowups: List[str] = Field(
        ...,
        description="Suggested follow-up questions"
    )
    executionTimeMs: int = Field(..., description="Query execution time in milliseconds")
    queryId: str = Field(..., description="Unique query identifier")


class SuggestedQuestion(BaseModel):
    """A predefined suggested question."""

    question: str = Field(..., description="The question text")
    category: Optional[str] = Field(None, description="Question category")
    description: Optional[str] = Field(None, description="Description of what the question does")
