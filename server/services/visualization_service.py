"""
Visualization Service - Dedicated agent for chart configuration.

This service uses the Databricks Claude endpoint to generate optimal visualization
specifications based on query results and user intent. Uses the same endpoint as
the main Claude service for consistency in Databricks deployments.
"""

import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from databricks.sdk import WorkspaceClient
from server.config import settings
from server.models.genie_models import QueryResults, VisualizationSpec

logger = logging.getLogger(__name__)

# Timeout for visualization generation
VIZ_GENERATION_TIMEOUT = 15  # seconds


class VisualizationService:
    """
    Service for generating and modifying visualization specifications.
    Uses the Databricks Claude endpoint for consistent deployment.
    """

    def __init__(self):
        """Initialize the visualization service with Databricks workspace client."""
        self.client = WorkspaceClient()
        self.endpoint_name = "databricks-claude-sonnet-4-5"

    async def generate_visualization(
        self,
        results: QueryResults,
        user_question: str,
        analysis_context: Optional[str] = None
    ) -> Optional[VisualizationSpec]:
        """
        Generate an optimal visualization specification for query results.

        Args:
            results: Query results with data and metadata
            user_question: Original user question for context
            analysis_context: Optional insights from Claude analytics

        Returns:
            VisualizationSpec or None if visualization not appropriate
        """
        try:
            logger.info(f"Generating visualization for {results.rowCount} rows, {len(results.columns)} columns")

            # Build the prompt for chart generation
            prompt = self._build_generation_prompt(results, user_question, analysis_context)

            # Call Databricks Claude endpoint with timeout
            response = await asyncio.wait_for(
                self._call_claude(prompt),
                timeout=VIZ_GENERATION_TIMEOUT
            )

            # Parse the response
            if response:
                viz_spec = self._parse_visualization_spec(response)

                if viz_spec:
                    logger.info(f"Generated {viz_spec.get('chartType', 'unknown')} visualization")
                    return VisualizationSpec(**viz_spec)

            return None

        except asyncio.TimeoutError:
            logger.error("Visualization generation timed out")
            return None
        except Exception as e:
            logger.error(f"Error generating visualization: {str(e)}")
            return None

    async def modify_visualization(
        self,
        current_spec: VisualizationSpec,
        results: QueryResults,
        modification_request: str
    ) -> Optional[VisualizationSpec]:
        """
        Modify an existing visualization based on user request.

        Args:
            current_spec: Current visualization specification
            results: Query results (for context)
            modification_request: User's modification request

        Returns:
            Modified VisualizationSpec or None if modification fails
        """
        try:
            logger.info(f"Modifying visualization: {modification_request}")

            # Build the prompt for modification
            prompt = self._build_modification_prompt(current_spec, results, modification_request)

            # Call Databricks Claude endpoint with timeout
            response = await asyncio.wait_for(
                self._call_claude(prompt),
                timeout=VIZ_GENERATION_TIMEOUT
            )

            # Parse the response
            if response:
                viz_spec = self._parse_visualization_spec(response)

                if viz_spec:
                    logger.info(f"Modified to {viz_spec.get('chartType', 'unknown')} visualization")
                    return VisualizationSpec(**viz_spec)

            return None

        except asyncio.TimeoutError:
            logger.error("Visualization modification timed out")
            return None
        except Exception as e:
            logger.error(f"Error modifying visualization: {str(e)}")
            return None

    async def _call_claude(self, prompt: str) -> Optional[str]:
        """
        Call the Databricks Claude endpoint.

        Args:
            prompt: The prompt to send to Claude

        Returns:
            Claude's response text or None on error
        """
        try:
            from databricks.sdk.service.serving import ChatMessage, ChatMessageRole

            messages = [
                ChatMessage(
                    role=ChatMessageRole.USER,
                    content=prompt
                )
            ]

            response = await asyncio.to_thread(
                self.client.serving_endpoints.query,
                name=self.endpoint_name,
                messages=messages,
                max_tokens=2000,
                temperature=0.3  # Lower temperature for consistent viz specs
            )

            if response.choices and len(response.choices) > 0:
                return response.choices[0].message.content

            return None

        except Exception as e:
            logger.error(f"Failed to call Claude endpoint: {str(e)}")
            return None

    def _build_generation_prompt(
        self,
        results: QueryResults,
        user_question: str,
        analysis_context: Optional[str]
    ) -> str:
        """Build prompt for initial visualization generation."""

        # Analyze data structure
        column_info = []
        for col in results.columns:
            # columns is List[str], so col is already a string
            col_info = f"- {col}"
            column_info.append(col_info)

        columns_desc = "\n".join(column_info)

        # Sample data for context (first few rows)
        sample_data = []
        for i, row in enumerate(results.rows[:3]):  # First 3 rows (use .rows not .data)
            sample_data.append(f"Row {i+1}: {json.dumps(row)}")

        sample_desc = "\n".join(sample_data) if sample_data else "No data available"

        prompt = f"""You are a data visualization expert. Generate an optimal visualization specification for the following query results.

**User Question:** "{user_question}"

**Data Structure:**
- Total rows: {results.rowCount}
- Columns ({len(results.columns)}):
{columns_desc}

**Sample Data:**
{sample_desc}

{f'**Analytics Context:** {analysis_context}' if analysis_context else ''}

**Your Task:**
Generate a JSON visualization specification that best represents this data. Consider:
1. Data types (numeric, categorical, temporal)
2. Number of rows and columns
3. User's analytical intent
4. Best practices for data visualization

**Guidelines:**
- **Bar charts**: Good for comparing categories (< 10 categories)
- **Line charts**: Good for trends over time or continuous data
- **Pie charts**: Good for part-to-whole (< 7 segments)
- **Scatter plots**: Good for correlation between two numeric variables
- **Tables**: Good for detailed data or many columns

Return ONLY a JSON object with this structure:
{{
  "chartType": "bar|line|scatter|pie|table|heatmap|histogram|box|3d-scatter|area|bubble",
  "title": "Descriptive chart title",
  "xAxis": {{
    "column": "column_name",
    "label": "X Label",
    "type": "category|linear|time|log",
    "range": [min, max],  // Optional: fix axis range
    "tickFormat": ".2f",  // Optional: d3-format string like ".2f", "$,.0f"
    "showGrid": true,     // Optional: show grid lines
    "font": {{            // Optional: axis label styling
      "size": 12,
      "family": "Arial",
      "color": "#333",
      "weight": "normal|bold"
    }}
  }},
  "yAxis": {{
    "column": "column_name",
    "label": "Y Label",
    "type": "linear|log",
    "range": [min, max],
    "tickFormat": "$,.0f",
    "showGrid": true,
    "font": {{"size": 12, "color": "#333"}}
  }},
  "zAxis": {{"column": "column_name", "label": "Z Label"}},  // For 3D charts only
  "groupBy": "optional column for grouping/series",
  "aggregation": "sum|avg|count|min|max if needed",
  "colors": ["#3b82f6", "#10b981"],  // Optional: color palette
  "annotations": [  // Optional: add labels, markers, arrows
    {{
      "text": "Peak sales",
      "x": "2024-01",
      "y": 1000,
      "xref": "x",      // "x" for data coords, "paper" for relative (0-1)
      "yref": "y",
      "font": {{"size": 14, "color": "#ef4444", "weight": "bold"}},
      "showarrow": true,
      "arrowhead": 2,   // Arrow style 0-8
      "ax": 0,          // Arrow x offset
      "ay": -40,        // Arrow y offset
      "bgcolor": "rgba(255,255,255,0.8)",
      "bordercolor": "#ef4444"
    }}
  ],
  "layout": {{  // Optional: chart layout customization
    "width": 800,
    "height": 600,
    "showlegend": true,
    "legendPosition": "top-right|bottom|left",
    "margin": {{"l": 60, "r": 40, "t": 60, "b": 60}},
    "titleFont": {{"size": 18, "family": "Arial", "color": "#111", "weight": "bold"}}
  }},
  "reasoning": "Brief explanation of why this chart type"
}}

Return ONLY the JSON, no other text."""

        return prompt

    def _build_modification_prompt(
        self,
        current_spec: VisualizationSpec,
        results: QueryResults,
        modification_request: str
    ) -> str:
        """Build prompt for visualization modification."""

        current_spec_json = current_spec.model_dump(by_alias=True)

        prompt = f"""You are a data visualization expert. Modify the current visualization based on the user's request.

**Current Visualization:**
```json
{json.dumps(current_spec_json, indent=2)}
```

**Data Available:**
- Columns: {', '.join(results.columns)}
- Row count: {results.rowCount}

**User Modification Request:** "{modification_request}"

**Your Task:**
Modify the visualization specification according to the user's request. Common modifications:

**Color Changes:**
- "make it blue" → Update colors: ["#3b82f6"]
- "make the bars yellow" → Update colors: ["#eab308"]
- "red and green bars" → Update colors: ["#ef4444", "#10b981"]
- "traffic light colors" → Update colors: ["#ef4444", "#f59e0b", "#10b981"]

**Color Palette:**
- blue: #3b82f6, red: #ef4444, green: #10b981, yellow: #eab308
- orange: #f97316, purple: #a855f7, pink: #ec4899, cyan: #06b6d4

**Chart Type Changes:**
- "show as pie chart" → Change chartType to "pie"
- "convert to line chart" → Change chartType to "line"
- "make it a bar chart" → Change chartType to "bar"

**Font Customization:**
- "make the title bigger" → Update layout.titleFont.size (e.g., 24)
- "bold axis labels" → Update xAxis.font.weight to "bold"
- "increase font size" → Update relevant font.size values
- "change to Arial" → Update font.family to "Arial"

**Annotation Changes:**
- "add label at peak" → Add to annotations array with text, x, y coordinates
- "label the highest bar" → Add annotation with showarrow: true, pointing to max value
- "add annotation with bigger font" → Include font: {{"size": 16, "weight": "bold"}}
- "highlight this point" → Add annotation with bgcolor and bordercolor

**Layout Changes:**
- "make it wider" → Update layout.width (e.g., 1000)
- "increase chart height" → Update layout.height (e.g., 500)
- "hide the legend" → Set layout.showlegend to false
- "move legend to bottom" → Set layout.legendPosition to "bottom"

**Axis Customization:**
- "set Y-axis range to 0-100" → Update yAxis.range: [0, 100]
- "format as currency" → Update tickFormat: "$,.0f"
- "hide grid lines" → Set showGrid to false
- "log scale on Y" → Set yAxis.type to "log"

Return ONLY a JSON object with the complete modified specification (same structure as current). No other text."""

        return prompt

    def _parse_visualization_spec(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Parse visualization spec from Claude's response.

        Args:
            response: Raw response text

        Returns:
            Parsed visualization spec dict or None
        """
        try:
            # Try to extract JSON from response
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()
            elif "```" in response:
                json_start = response.find("```") + 3
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()

            viz_spec = json.loads(response)

            # Validate required fields
            if "chartType" not in viz_spec:
                logger.warning("Visualization spec missing chartType")
                return None

            return viz_spec

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse visualization spec: {str(e)}")
            logger.debug(f"Response was: {response}")
            return None

    @staticmethod
    def is_visualization_request(message: str) -> bool:
        """
        Determine if a message is requesting visualization changes.

        Args:
            message: User's message

        Returns:
            True if message is about visualization
        """
        viz_keywords = [
            # Chart types
            "chart", "graph", "plot", "visualize", "visualization",
            "pie", "bar", "line", "scatter", "heatmap", "histogram", "bubble",

            # Colors
            "color", "colour", "blue", "red", "green", "yellow", "orange", "purple",
            "black", "white", "pink", "cyan", "magenta", "gray", "grey", "brown",

            # Actions
            "make it", "show as", "change to", "convert", "modify", "update",

            # Font customization
            "font", "size", "bigger", "smaller", "bold", "arial", "courier",
            "increase", "decrease", "larger", "family",

            # Annotations
            "annotation", "label", "marker", "arrow", "highlight", "point to",

            # Layout
            "width", "height", "wider", "taller", "legend", "margin",

            # Axis
            "axis", "range", "scale", "grid", "tick", "format"
        ]

        message_lower = message.lower()
        return any(keyword in message_lower for keyword in viz_keywords)


# Global instance
_visualization_service: Optional[VisualizationService] = None


def get_visualization_service() -> VisualizationService:
    """Get or create the global visualization service instance."""
    global _visualization_service
    if _visualization_service is None:
        _visualization_service = VisualizationService()
    return _visualization_service
