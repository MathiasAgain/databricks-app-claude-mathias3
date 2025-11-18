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


class AxisConfig(BaseModel):
    """Configuration for a chart axis."""

    column: str = Field(..., description="Column name for this axis")
    label: Optional[str] = Field(None, description="Display label for axis")
    type: Optional[str] = Field(
        None,
        description="Axis type: category, linear, time, or log"
    )


class AnnotationConfig(BaseModel):
    """Configuration for chart annotations."""

    text: str = Field(..., description="Annotation text")
    x: Optional[float] = Field(None, description="X position")
    y: Optional[float] = Field(None, description="Y position")


class VisualizationSpec(BaseModel):
    """AI-generated visualization specification."""

    chartType: str = Field(
        ...,
        description="Chart type: bar, line, scatter, pie, heatmap, histogram, box, 3d-scatter, area, bubble"
    )
    title: Optional[str] = Field(None, description="Chart title")
    xAxis: Optional[AxisConfig] = Field(None, description="X-axis configuration")
    yAxis: Optional[AxisConfig] = Field(None, description="Y-axis configuration")
    zAxis: Optional[AxisConfig] = Field(None, description="Z-axis configuration for 3D charts")
    groupBy: Optional[str] = Field(None, description="Column to group data by")
    aggregation: Optional[str] = Field(
        None,
        description="Aggregation function: sum, avg, count, min, max"
    )
    colors: Optional[List[str]] = Field(None, description="Custom color palette")
    annotations: Optional[List[AnnotationConfig]] = Field(
        None,
        description="Chart annotations"
    )
    reasoning: Optional[str] = Field(
        None,
        description="AI's explanation for why this chart type was chosen"
    )


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
    visualizationSpec: Optional[VisualizationSpec] = Field(
        None,
        description="AI-recommended visualization specification"
    )


class SuggestedQuestion(BaseModel):
    """A predefined suggested question."""

    question: str = Field(..., description="The question text")
    category: Optional[str] = Field(None, description="Question category")
    description: Optional[str] = Field(None, description="Description of what the question does")
