"""
Visualization Service - Dedicated agent for chart configuration.

This service uses Claude Haiku to generate optimal visualization specifications
based on query results and user intent. Separated from analytics for better
modularity and cost efficiency.
"""

import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from anthropic import Anthropic
from server.config import settings
from server.models.genie_models import QueryResults, VisualizationSpec

logger = logging.getLogger(__name__)

# Timeout for visualization generation (should be fast with Haiku)
VIZ_GENERATION_TIMEOUT = 10  # seconds


class VisualizationService:
    """
    Service for generating and modifying visualization specifications.
    Uses Claude Haiku for fast, cost-efficient chart configuration.
    """

    def __init__(self):
        """Initialize the visualization service with Claude Haiku."""
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-haiku-20241022"  # Fast and cheap for focused tasks

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

            # Call Claude Haiku with timeout
            async def call_claude():
                """Wrapper to make SDK call awaitable."""
                return self.client.messages.create(
                    model=self.model,
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )

            response = await asyncio.wait_for(
                asyncio.to_thread(call_claude),
                timeout=VIZ_GENERATION_TIMEOUT
            )

            # Extract text from response content
            if response.content and len(response.content) > 0:
                response_text = response.content[0].text
                viz_spec = self._parse_visualization_spec(response_text)

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

            # Call Claude Haiku with timeout
            async def call_claude():
                """Wrapper to make SDK call awaitable."""
                return self.client.messages.create(
                    model=self.model,
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )

            response = await asyncio.wait_for(
                asyncio.to_thread(call_claude),
                timeout=VIZ_GENERATION_TIMEOUT
            )

            # Extract text from response content
            if response.content and len(response.content) > 0:
                response_text = response.content[0].text
                viz_spec = self._parse_visualization_spec(response_text)

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
  "chartType": "bar|line|scatter|pie|table",
  "title": "Descriptive chart title",
  "xAxis": {{"column": "column_name", "label": "X Label", "type": "category|linear|time"}},
  "yAxis": {{"column": "column_name", "label": "Y Label", "type": "linear|log"}},
  "groupBy": "optional column for grouping/series",
  "aggregation": "sum|avg|count|min|max if needed",
  "colors": ["#3b82f6"] (optional, use brand colors),
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
- **Color changes**: "make it blue" → Update colors array
- **Chart type**: "show as pie chart" → Change chartType
- **Annotations**: "add label at peak" → Add annotations array
- **Title**: "change title to X" → Update title

**Color Guidelines:**
- "blue" → ["#3b82f6"]
- "red" → ["#ef4444"]
- "green" → ["#10b981"]
- "red and green" → ["#ef4444", "#10b981"]
- "traffic light" → ["#ef4444", "#f59e0b", "#10b981"]

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
            "chart", "graph", "plot", "visualize", "visualization",
            "color", "colour", "blue", "red", "green", "yellow", "orange", "purple",
            "black", "white", "pink", "cyan", "magenta", "gray", "grey", "brown",
            "pie", "bar", "line", "scatter", "make it", "show as", "change to", "convert",
            "annotation", "label", "title", "axis"
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
