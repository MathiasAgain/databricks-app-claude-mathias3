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


class FontConfig(BaseModel):
    """Font configuration for chart elements."""

    size: Optional[int] = Field(None, description="Font size in pixels")
    family: Optional[str] = Field(None, description="Font family (e.g., 'Arial', 'Courier')")
    color: Optional[str] = Field(None, description="Font color (hex or named)")
    weight: Optional[str] = Field(None, description="Font weight (normal, bold)")


class AxisConfig(BaseModel):
    """Configuration for a chart axis."""

    column: str = Field(..., description="Column name for this axis")
    label: Optional[str] = Field(None, description="Display label for axis")
    type: Optional[str] = Field(
        None,
        description="Axis type: category, linear, time, or log"
    )
    range: Optional[List[float]] = Field(None, description="Axis range [min, max]")
    tickFormat: Optional[str] = Field(None, description="Tick format string (e.g., '.2f', '$,.0f')")
    showGrid: Optional[bool] = Field(None, description="Show grid lines")
    font: Optional[FontConfig] = Field(None, description="Axis label font configuration")


class AnnotationConfig(BaseModel):
    """Configuration for chart annotations."""

    text: str = Field(..., description="Annotation text")
    x: Optional[Any] = Field(None, description="X position (can be value or 'paper')")
    y: Optional[Any] = Field(None, description="Y position (can be value or 'paper')")
    xref: Optional[str] = Field(None, description="X reference: 'x' or 'paper'")
    yref: Optional[str] = Field(None, description="Y reference: 'y' or 'paper'")
    font: Optional[FontConfig] = Field(None, description="Annotation font configuration")
    showarrow: Optional[bool] = Field(None, description="Show arrow pointing to annotation")
    arrowhead: Optional[int] = Field(None, description="Arrow style (0-8)")
    ax: Optional[int] = Field(None, description="Arrow X offset")
    ay: Optional[int] = Field(None, description="Arrow Y offset")
    bgcolor: Optional[str] = Field(None, description="Background color")
    bordercolor: Optional[str] = Field(None, description="Border color")


class LayoutConfig(BaseModel):
    """Configuration for chart layout."""

    width: Optional[int] = Field(None, description="Chart width in pixels")
    height: Optional[int] = Field(None, description="Chart height in pixels")
    showlegend: Optional[bool] = Field(None, description="Show legend")
    legendPosition: Optional[str] = Field(None, description="Legend position: 'top-right', 'bottom', etc.")
    margin: Optional[Dict[str, int]] = Field(None, description="Margins {l, r, t, b}")
    titleFont: Optional[FontConfig] = Field(None, description="Title font configuration")


class VisualizationSpec(BaseModel):
    """AI-generated visualization specification with advanced customization."""

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
        description="Chart annotations with advanced styling"
    )
    layout: Optional[LayoutConfig] = Field(
        None,
        description="Chart layout configuration (size, margins, legend)"
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
