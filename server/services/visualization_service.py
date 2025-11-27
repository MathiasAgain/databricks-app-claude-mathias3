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
    Falls back to smart defaults if Claude is unavailable.
    """

    def __init__(self):
        """Initialize the visualization service with Databricks workspace client."""
        try:
            self.client = WorkspaceClient()
            logger.info("VisualizationService initialized with WorkspaceClient")
        except Exception as e:
            logger.error(f"Failed to initialize WorkspaceClient: {e}")
            self.client = None
        self.endpoint_name = "databricks-claude-sonnet-4-5"

    async def generate_visualization(
        self,
        results: QueryResults,
        user_question: str,
        analysis_context: Optional[str] = None
    ) -> Optional[VisualizationSpec]:
        """
        Generate an optimal visualization specification for query results.
        Falls back to smart defaults if Claude is unavailable.

        Args:
            results: Query results with data and metadata
            user_question: Original user question for context
            analysis_context: Optional insights from Claude analytics

        Returns:
            VisualizationSpec or None if visualization not appropriate
        """
        logger.info(f"Generating visualization for {results.rowCount} rows, {len(results.columns)} columns")

        # Try Claude first if client is available
        if self.client:
            try:
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
                        logger.info(f"Generated {viz_spec.get('chartType', 'unknown')} visualization via Claude")
                        return VisualizationSpec(**viz_spec)

            except asyncio.TimeoutError:
                logger.warning("Visualization generation timed out, using fallback")
            except Exception as e:
                logger.warning(f"Claude visualization failed: {str(e)}, using fallback")
        else:
            logger.warning("WorkspaceClient not available, using fallback chart generation")

        # Fallback: Generate a smart default visualization
        logger.info("Using fallback visualization generation")
        return self._generate_fallback_visualization(results, user_question)

    def _generate_fallback_visualization(
        self,
        results: QueryResults,
        user_question: str
    ) -> Optional[VisualizationSpec]:
        """
        Generate a fallback visualization based on data structure.
        Uses heuristics to pick the best chart type.
        """
        try:
            if not results.columns or not results.rows or results.rowCount == 0:
                logger.info("No data for visualization")
                return None

            columns = results.columns
            rows = results.rows

            # Analyze column types by sampling data
            numeric_cols = []
            categorical_cols = []
            date_cols = []

            for i, col in enumerate(columns):
                col_lower = col.lower()
                # Check for date-like columns
                if any(kw in col_lower for kw in ['date', 'time', 'year', 'month', 'week', 'day']):
                    date_cols.append(col)
                else:
                    # Sample values to determine type
                    sample_values = [row[i] for row in rows[:5] if len(row) > i and row[i] is not None]
                    if sample_values:
                        if all(isinstance(v, (int, float)) or (isinstance(v, str) and v.replace('.', '').replace('-', '').isdigit()) for v in sample_values):
                            numeric_cols.append(col)
                        else:
                            categorical_cols.append(col)

            logger.info(f"Column analysis: numeric={numeric_cols}, categorical={categorical_cols}, date={date_cols}")

            # Determine chart type based on data structure
            chart_type = "bar"  # Default
            x_column = None
            y_column = None
            title = "Data Visualization"

            # Choose best chart configuration
            if date_cols and numeric_cols:
                # Time series data -> line chart
                chart_type = "line"
                x_column = date_cols[0]
                y_column = numeric_cols[0]
                title = f"{y_column} over {x_column}"
            elif categorical_cols and numeric_cols:
                # Category + number -> bar chart
                chart_type = "bar"
                x_column = categorical_cols[0]
                y_column = numeric_cols[0]
                title = f"{y_column} by {x_column}"
            elif len(numeric_cols) >= 2:
                # Two numeric columns -> scatter plot
                chart_type = "scatter"
                x_column = numeric_cols[0]
                y_column = numeric_cols[1]
                title = f"{y_column} vs {x_column}"
            elif len(categorical_cols) >= 1 and len(columns) >= 2:
                # Use first categorical as x, second column as y
                chart_type = "bar"
                x_column = columns[0]
                y_column = columns[1]
                title = f"{y_column} by {x_column}"
            else:
                # Default: use first two columns
                x_column = columns[0]
                y_column = columns[1] if len(columns) > 1 else columns[0]
                title = f"{y_column} by {x_column}"

            # For pie charts, limit to small category counts
            if chart_type == "bar" and results.rowCount <= 6 and categorical_cols:
                chart_type = "pie"

            spec_dict = {
                "chartType": chart_type,
                "title": title,
                "xAxis": {
                    "column": x_column,
                    "label": x_column.replace("_", " ").title()
                },
                "yAxis": {
                    "column": y_column,
                    "label": y_column.replace("_", " ").title()
                },
                "colors": ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
                "reasoning": f"Fallback: {chart_type} chart based on data structure analysis"
            }

            logger.info(f"Generated fallback {chart_type} visualization")
            return VisualizationSpec(**spec_dict)

        except Exception as e:
            logger.error(f"Fallback visualization generation failed: {str(e)}")
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
  "dataLabels": {{  // Optional: show values on chart elements
    "show": true,           // Enable/disable data labels
    "position": "auto",     // Position: "auto", "inside", "outside", "top", "bottom"
    "format": ",.0f",       // Format string: ".0f", ",.2f", "$,.0f", ".0%", etc.
    "font": {{"size": 12, "color": "#333", "weight": "bold"}}
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
        """Build prompt for visualization modification using raw Plotly configuration."""

        current_spec_json = current_spec.model_dump(by_alias=True)

        # Get sample data for Claude to use in traces
        sample_rows = results.rows[:100]  # Limit to 100 rows for the prompt
        columns = results.columns

        # Build column data for Claude to reference (with bounds checking)
        column_data = {}
        for i, col in enumerate(columns):
            column_data[col] = [row[i] if i < len(row) else None for row in sample_rows]

        prompt = f"""You are a Plotly.js visualization expert. The user wants to modify their chart using natural language. You have COMPLETE control over the Plotly configuration.

**IMPORTANT: You are generating RAW Plotly.js configuration that will be passed directly to Plotly.newPlot(). You can use ANY valid Plotly.js feature.**

**Current Visualization Spec:**
```json
{json.dumps(current_spec_json, indent=2)}
```

**Available Data:**
- Columns: {json.dumps(columns)}
- Row count: {results.rowCount}
- Sample data (first {len(sample_rows)} rows):
```json
{json.dumps(column_data, indent=2)}
```

**User's Natural Language Request:** "{modification_request}"

**YOUR TASK:**
Interpret the user's request and generate a complete Plotly configuration. You MUST output `plotlyData` (array of traces) and `plotlyLayout` (layout object) that will be passed directly to Plotly.

**Key Plotly.js Features You Can Use:**

1. **Trace Types**: bar, scatter, pie, heatmap, histogram, box, violin, sunburst, treemap, sankey, candlestick, ohlc, waterfall, funnel, indicator, choropleth, scattergeo, scatter3d, surface, mesh3d, etc.

2. **Number Formatting** (tickformat uses d3-format):
   - Billions: tickformat: ".3s" shows "1.23B", tickformat: ".0s" shows "1B"
   - Millions: tickformat: ".2s" shows "1.2M"
   - Currency: tickformat: "$,.0f" shows "$1,234,567"
   - Percentage: tickformat: ".0%" shows "45%"
   - Commas: tickformat: ",.0f" shows "1,234,567"
   - Custom: tickvals: [1e9, 2e9, 3e9], ticktext: ["1B", "2B", "3B"]

3. **Data Labels** (text on traces):
   - Add text: text: [array of values], textposition: "outside"/"inside"/"auto"
   - Format: texttemplate: "%{{value:.2f}}" or custom formatting
   - Style: textfont: {{size: 14, color: "#333"}}

4. **Colors**: marker.color, line.color, colorscale, etc.

5. **Layout Options**: title, xaxis, yaxis, legend, annotations, shapes, images, etc.

6. **Axis Configuration**:
   - Title: xaxis.title.text
   - Range: xaxis.range: [min, max]
   - Type: xaxis.type: "linear"/"log"/"date"/"category"
   - Grid: xaxis.showgrid, xaxis.gridcolor
   - Ticks: xaxis.tickformat, xaxis.tickvals, xaxis.ticktext

**Example Response for "show values in billions with no decimals":**
```json
{{
  "chartType": "bar",
  "title": "Sales by Region",
  "plotlyData": [
    {{
      "type": "bar",
      "x": ["North", "South", "East", "West"],
      "y": [1500000000, 2300000000, 1800000000, 2100000000],
      "marker": {{"color": "#3b82f6"}},
      "text": ["1.5B", "2.3B", "1.8B", "2.1B"],
      "textposition": "outside"
    }}
  ],
  "plotlyLayout": {{
    "title": {{"text": "Sales by Region", "font": {{"size": 18}}}},
    "yaxis": {{
      "title": {{"text": "Sales"}},
      "tickformat": ".0s"
    }},
    "xaxis": {{"title": {{"text": "Region"}}}}
  }},
  "reasoning": "Formatted Y-axis to show values in billions using .0s format (SI notation with 0 decimal places)"
}}
```

**Example Response for "make it a pie chart with percentages":**
```json
{{
  "chartType": "pie",
  "title": "Distribution",
  "plotlyData": [
    {{
      "type": "pie",
      "labels": ["A", "B", "C"],
      "values": [30, 50, 20],
      "textinfo": "label+percent",
      "textposition": "inside",
      "marker": {{"colors": ["#3b82f6", "#10b981", "#f59e0b"]}}
    }}
  ],
  "plotlyLayout": {{
    "title": {{"text": "Distribution"}}
  }},
  "reasoning": "Converted to pie chart with percentage labels"
}}
```

**CRITICAL REQUIREMENTS:**
1. ALWAYS include `plotlyData` array with complete trace(s) using the actual data from the columns
2. ALWAYS include `plotlyLayout` object
3. Include `chartType` for reference
4. Use the actual column data provided above in your traces
5. Return ONLY valid JSON, no markdown, no explanation
6. You can do ANYTHING Plotly.js supports - there are no limitations!

Return the complete JSON object:"""

        return prompt

    def _parse_visualization_spec(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Parse visualization spec from Claude's response.

        Args:
            response: Raw response text

        Returns:
            Parsed visualization spec dict or None if parsing fails
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
            "chart", "graph", "plot", "visualize", "visualization", "visual",
            "pie", "bar", "line", "scatter", "heatmap", "histogram", "bubble",
            "area", "donut", "horizontal", "vertical", "stacked",

            # Colors - expanded
            "color", "colour", "blue", "red", "green", "yellow", "orange", "purple",
            "black", "white", "pink", "cyan", "magenta", "gray", "grey", "brown",
            "teal", "indigo", "violet", "lime", "amber", "emerald", "sky", "rose",
            "dark", "light", "brighter", "darker", "colorful", "monochrome",

            # Actions - expanded
            "make it", "show as", "change to", "convert", "modify", "update",
            "switch to", "turn into", "transform", "display as", "render as",
            "can you", "could you", "please", "want it", "i want", "i'd like",
            "should be", "needs to be", "set to", "use",

            # Font customization
            "font", "size", "bigger", "smaller", "bold", "arial", "courier",
            "increase", "decrease", "larger", "family", "text", "title",
            "heading", "readable", "thick", "thin",

            # Annotations
            "annotation", "label", "marker", "arrow", "highlight", "point to",
            "mark", "note", "callout", "emphasize",

            # Data labels
            "data label", "show value", "show number", "display value",

            # Layout
            "width", "height", "wider", "taller", "legend", "margin",
            "spacing", "padding", "compact", "expand",

            # Axis
            "axis", "range", "scale", "grid", "tick", "format",
            "x-axis", "y-axis", "horizontal", "vertical",

            # Styling
            "style", "theme", "look", "appearance", "design"
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
