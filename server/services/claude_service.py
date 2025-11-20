"""
Claude AI Service - Query analysis and insights generation.

Integrates with Databricks Claude Sonnet 4.5 endpoint to provide:
- Intelligent query result analysis
- Context-aware summaries
- Smart follow-up question generation
- Proactive insights
- Tool calling for external data enrichment
"""

import logging
import json
import asyncio
from typing import List, Dict, Any, Optional
from databricks.sdk import WorkspaceClient
from server.config import settings

logger = logging.getLogger(__name__)

# Timeout constants for Claude API calls
CLAUDE_ANALYSIS_TIMEOUT = 30  # 30 seconds for analysis
CLAUDE_CHAT_TIMEOUT = 20      # 20 seconds for chat


class ClaudeService:
    """Service for Claude AI analysis and insights with conversational follow-ups."""

    def __init__(self, workspace_client: WorkspaceClient):
        """
        Initialize Claude service.

        Args:
            workspace_client: Databricks workspace client
        """
        self.client = workspace_client
        self.endpoint_name = "databricks-claude-sonnet-4-5"

    def _get_tool_definitions(self, include_visualization: bool = False) -> List[Dict[str, Any]]:
        """
        Define tools available to Claude.

        Args:
            include_visualization: Whether to include visualization modification tool

        Returns:
            List of tool definitions in OpenAI format
        """
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_competitor_pricing",
                    "description": "Fetch competitor pricing data for a product. Use this when analyzing product performance to provide market context.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product": {
                                "type": "string",
                                "description": "The product name to look up pricing for"
                            }
                        },
                        "required": ["product"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_market_trend",
                    "description": "Get market trend information for a product category. Useful for understanding broader market dynamics.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "category": {
                                "type": "string",
                                "description": "The product category to analyze trends for"
                            }
                        },
                        "required": ["category"]
                    }
                }
            }
        ]

        # Add visualization tool if requested (for chat endpoint)
        if include_visualization:
            tools.append({
                "type": "function",
                "function": {
                    "name": "modify_visualization",
                    "description": "Modify the current chart's appearance including colors, chart type, styling, annotations, and labels. Use this when the user wants to change how the data is visualized (e.g., 'make it yellow', 'change to pie chart', 'add labels').",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "modification_request": {
                                "type": "string",
                                "description": "What the user wants to change about the visualization"
                            }
                        },
                        "required": ["modification_request"]
                    }
                }
            })

        return tools

    async def _execute_tool(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a tool by calling tool functions directly.

        Args:
            tool_name: Name of the tool to execute
            tool_input: Input parameters for the tool
            context: Additional context (e.g., current visualization, query results)

        Returns:
            Tool execution result
        """
        try:
            logger.info(f"Executing tool: {tool_name} with input: {tool_input}")

            # Call the appropriate tool function
            if tool_name == "get_competitor_pricing":
                # Import tool functions dynamically to avoid circular imports
                from server.routers.tools import get_competitor_pricing
                result = await get_competitor_pricing(product=tool_input.get("product", ""))

            elif tool_name == "get_market_trend":
                from server.routers.tools import get_market_trend
                result = await get_market_trend(category=tool_input.get("category", ""))

            elif tool_name == "modify_visualization":
                # Import visualization service
                from server.services.visualization_service import get_visualization_service
                from server.models import QueryResults, VisualizationSpec

                viz_service = get_visualization_service()
                modification_request = tool_input.get("modification_request", "")

                # Get current viz spec and query results from context
                if not context:
                    return {"error": "No context provided for visualization modification"}

                current_viz_spec = context.get("current_viz_spec")
                query_results = context.get("query_results")

                if not current_viz_spec:
                    return {"error": "No visualization currently displayed"}

                if not query_results:
                    return {"error": "No query results available"}

                # Convert dict to QueryResults object
                results_obj = QueryResults(
                    columns=query_results["columns"],
                    rows=query_results["rows"],
                    rowCount=query_results["rowCount"]
                )

                # Call visualization service to modify
                new_viz_spec = await viz_service.modify_visualization(
                    current_spec=current_viz_spec,
                    results=results_obj,
                    modification_request=modification_request
                )

                if new_viz_spec:
                    result = {
                        "success": True,
                        "visualization_spec": new_viz_spec.model_dump(by_alias=True),
                        "message": "Visualization updated successfully"
                    }
                else:
                    result = {
                        "success": False,
                        "error": "Failed to generate updated visualization"
                    }
            else:
                return {"error": f"Unknown tool: {tool_name}"}

            logger.info(f"Tool {tool_name} completed successfully")
            return result

        except Exception as e:
            logger.error(f"Tool execution failed for {tool_name}: {str(e)}")
            return {"error": str(e)}

    async def analyze_query_results(
        self,
        question: str,
        sql: str,
        results: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Analyze query results using Claude AI with timeout protection.

        Args:
            question: Original natural language question
            sql: Generated SQL query
            results: Query results (columns, rows, row_count)

        Returns:
            Dict with:
                - summary: AI-generated summary of results
                - followup_questions: List of suggested follow-up questions
                - insights: List of proactive insights
        """
        try:
            logger.info("analyze_query_results starting...")
            # Prepare the analysis prompt
            logger.info("Building analysis prompt...")
            prompt = self._build_analysis_prompt(question, sql, results)
            logger.info(f"Prompt built, length: {len(prompt)} chars")

            # Call Claude endpoint with tool support and timeout protection
            logger.info(f"Calling Claude with {CLAUDE_ANALYSIS_TIMEOUT}s timeout...")
            try:
                response = await asyncio.wait_for(
                    self._call_claude_with_tools(prompt),
                    timeout=CLAUDE_ANALYSIS_TIMEOUT
                )
                logger.info(f"Response received, length: {len(response)} chars")
            except asyncio.TimeoutError:
                logger.error(f"Claude analysis timed out after {CLAUDE_ANALYSIS_TIMEOUT}s")
                raise Exception(f"Claude analysis timed out after {CLAUDE_ANALYSIS_TIMEOUT} seconds")

            # Parse and return the analysis
            logger.info("Parsing response...")
            result = self._parse_response(response)
            logger.info("Parsing complete")
            return result

        except asyncio.TimeoutError:
            logger.error("Claude analysis timed out")
            # Return fallback on timeout
            return {
                "summary": "Query executed successfully. Results are displayed in the table below.",
                "followup_questions": [
                    "Show the breakdown by region",
                    "Compare with previous period",
                    "Show trends over time"
                ],
                "insights": []
            }
        except Exception as e:
            error_msg = str(e)
            if "401 Unauthorized" in error_msg or "401" in error_msg:
                logger.warning(
                    "Claude AI authentication failed in local development. "
                    "This is expected - Model Serving endpoints require Databricks Apps environment. "
                    "Claude AI will work correctly when deployed to Databricks."
                )
            else:
                logger.error(f"Claude analysis failed: {error_msg}")
                logger.exception("Full analyze_query_results exception:")

            # Return fallback response on error (allows Genie + Dashboard to work)
            return {
                "summary": "Query executed successfully. Results are displayed in the table below.",
                "followup_questions": [
                    "Show the breakdown by region",
                    "Compare with previous period",
                    "Show trends over time"
                ],
                "insights": []
            }

    def _build_analysis_prompt(
        self,
        question: str,
        sql: str,
        results: Dict[str, Any]
    ) -> str:
        """Build the analysis prompt for Claude."""
        # Format results for context
        columns = results.get("columns", [])
        rows = results.get("rows", [])
        row_count = results.get("rowCount", 0)

        # Sample first few rows for analysis
        sample_rows = rows[:5] if rows else []

        prompt = f"""You are an expert data analyst helping a business user understand their Nielsen sales data within the Perfect Sales Execution (PSE) framework.

**Perfect Sales Execution Framework Context:**
This application analyzes Nielsen sales data through the lens of PSE, which consists of five key pillars:

1. **Availability** - Out-of-stock prevention, SKU availability, inventory management, stock levels
2. **Visibility** - Shelf placement, facings, share of shelf, merchandising presence, product visibility
3. **Price & Promotion** - Pricing compliance, promotional execution, price competitiveness, promotional effectiveness
4. **Merchandising** - Planogram compliance, display execution, POS materials, in-store presentation
5. **Relationship** - Account management, joint business planning, partnership quality, retailer relationships

When analyzing sales data, consider which PSE pillar(s) the data relates to and provide insights that help improve execution in those areas. Focus on actionable insights that drive better retail execution.

**User's Question:**
{question}

**Generated SQL:**
```sql
{sql}
```

**Results Summary:**
- Total rows returned: {row_count}
- Columns: {', '.join(columns)}

**Sample Data (first 5 rows):**
"""
        # Add sample data
        if sample_rows and columns:
            for row in sample_rows:
                row_dict = dict(zip(columns, row))
                prompt += f"\n{json.dumps(row_dict, indent=2)}"
        else:
            prompt += "\n(No data returned)"

        prompt += """

**Your Task:**
Provide a JSON response with the following structure:
{
  "summary": "A clear, business-focused 2-3 sentence summary of what the data shows. Focus on key insights and trends, connecting to relevant PSE pillars when applicable.",
  "followup_questions": [
    "3-5 relevant follow-up questions the user might want to ask based on these results",
    "Make them specific to the data shown and aligned with PSE framework pillars",
    "Focus on questions that help improve retail execution (e.g., availability gaps, visibility opportunities, pricing effectiveness)"
  ],
  "insights": [
    "1-3 proactive insights or observations about the data",
    "Focus on trends, anomalies, or noteworthy patterns",
    "Connect insights to PSE pillars (Availability, Visibility, Price & Promotion, Merchandising, Relationship)",
    "Provide actionable recommendations for improving retail execution where relevant"
  ],
  "visualizationSpec": {
    "chartType": "Choose the MOST appropriate chart type based on the data structure and analytical intent: bar (comparisons, categories), line (trends over time), scatter (correlations, relationships), pie (proportions, parts of whole), heatmap (patterns across 2 dimensions), histogram (distributions), box (statistical distribution), area (cumulative trends), bubble (3 dimensions)",
    "title": "Descriptive title for the chart that captures the analytical insight",
    "xAxis": {
      "column": "Column name for X axis (use first column if categorical, time column if time-series)",
      "label": "Human-readable label for X axis",
      "type": "category|linear|time|log - choose based on data type"
    },
    "yAxis": {
      "column": "Column name for Y axis (typically the measure being analyzed)",
      "label": "Human-readable label for Y axis",
      "type": "linear|log - choose based on data distribution"
    },
    "groupBy": "Optional: Column name to group/color data by (for multi-series charts)",
    "aggregation": "Optional: If data needs aggregation - sum|avg|count|min|max",
    "reasoning": "1-2 sentences explaining WHY this chart type best represents the data and supports the analytical context. Connect to the user's question and insights."
  }
}

**Visualization Selection Guidelines:**
- **Bar charts**: Best for comparing categories, products, regions. Use when comparing discrete items.
- **Line charts**: Best for time-series, trends over periods. Use when X-axis is temporal.
- **Scatter plots**: Best for showing correlations, relationships between 2 numeric variables.
- **Pie charts**: Best for showing parts of a whole (percentages, proportions). Use sparingly, only when <7 categories.
- **Heatmap**: Best for patterns across 2 categorical dimensions (e.g., product vs region performance).
- **Histogram**: Best for showing distribution of a single numeric variable.
- **Box plots**: Best for showing statistical distribution, quartiles, outliers.
- **Area charts**: Best for showing cumulative trends, stacked values over time.
- **Bubble charts**: Best for 3D data (X, Y, size), showing relationships with magnitude.

**Important:**
- Be concise and business-focused
- Use specific numbers from the data
- Connect findings to PSE framework pillars when relevant (e.g., 'This availability issue...', 'From a visibility perspective...')
- Make follow-up questions contextual, relevant, and aligned with improving PSE execution
- Provide actionable insights that help drive better retail execution
- **ALWAYS include visualizationSpec** - choose the chart type that best matches the data structure and analytical intent
- The visualization should enhance understanding of your summary and insights
- Consider what the user is trying to learn from the data when selecting chart type
- If no data was returned, explain why that might be
- Return ONLY valid JSON, no other text
"""
        return prompt

    async def _call_claude_with_tools(self, prompt: str) -> str:
        """
        Call Claude endpoint with tool calling support.

        Args:
            prompt: The prompt to send to Claude

        Returns:
            Claude's final response text after tool execution
        """
        try:
            from databricks.sdk.service.serving import ChatMessage, ChatMessageRole

            logger.info("Creating initial ChatMessage...")
            messages = [
                ChatMessage(
                    role=ChatMessageRole.USER,
                    content=prompt
                )
            ]

            # Get tool definitions
            tools = self._get_tool_definitions()
            logger.info(f"Tool calling enabled with {len(tools)} tools")

            # Try calling with tools parameter - this will test if it's supported
            try:
                logger.info(f"Calling serving endpoint: {self.endpoint_name} WITH TOOLS")
                response = self.client.serving_endpoints.query(
                    name=self.endpoint_name,
                    messages=messages,
                    max_tokens=2000,
                    temperature=0.7,
                    tools=tools  # ← Testing if this parameter works!
                )

                logger.info("Response received from Claude with tools")

                # Check if Claude wants to use tools
                if response.choices and len(response.choices) > 0:
                    message = response.choices[0].message

                    # Check for tool_calls in the response
                    if hasattr(message, 'tool_calls') and message.tool_calls:
                        logger.info(f"Claude requested {len(message.tool_calls)} tool calls")

                        # Execute each tool
                        for tool_call in message.tool_calls:
                            tool_name = tool_call.function.name
                            tool_input = json.loads(tool_call.function.arguments)

                            logger.info(f"Executing tool: {tool_name}")
                            tool_result = await self._execute_tool(tool_name, tool_input)

                            # Add assistant message with tool call
                            messages.append(message)

                            # Add tool result message
                            tool_result_message = ChatMessage(
                                role=ChatMessageRole.TOOL,
                                content=json.dumps(tool_result),
                                tool_call_id=tool_call.id
                            )
                            messages.append(tool_result_message)

                        # Call Claude again with tool results
                        logger.info("Calling Claude again with tool results")
                        final_response = self.client.serving_endpoints.query(
                            name=self.endpoint_name,
                            messages=messages,
                            max_tokens=2000,
                            temperature=0.7
                        )

                        if final_response.choices and len(final_response.choices) > 0:
                            return final_response.choices[0].message.content

                    # No tool calls, return content directly
                    if message.content:
                        logger.info("No tool calls made, returning direct response")
                        return message.content

                logger.warning("Response missing expected structure")
                return "{}"

            except TypeError as e:
                # If tools parameter is not supported, log and fall back
                if "unexpected keyword argument 'tools'" in str(e):
                    logger.warning("Tools parameter not supported by Databricks SDK. Falling back to no tools.")
                    # Call without tools
                    response = self.client.serving_endpoints.query(
                        name=self.endpoint_name,
                        messages=messages,
                        max_tokens=2000,
                        temperature=0.7
                    )
                    if response.choices and len(response.choices) > 0:
                        return response.choices[0].message.content
                    return "{}"
                else:
                    raise

        except Exception as e:
            logger.error(f"Failed to call Claude endpoint: {str(e)}")
            logger.exception("Full traceback:")
            raise

    async def chat_with_context(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        query_results: Optional[Dict[str, Any]] = None,
        current_viz_spec: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Chat with Claude in the context of query results with tool calling support.

        Args:
            message: User's message/question
            conversation_history: Previous messages in the conversation
            query_results: Current query results being discussed (optional)
            current_viz_spec: Current visualization spec (enables viz modification tool)

        Returns:
            Dict with:
                - message: Claude's response
                - suggested_followups: List of suggested follow-up questions
                - visualization_spec: Updated visualization (if modify_visualization tool was called)
        """
        try:
            from databricks.sdk.service.serving import ChatMessage, ChatMessageRole

            logger.info(f"Chat request: {message}")

            # Build the conversation context
            messages = []

            # Add system message with context
            system_context = """You are an expert data analyst helping a business user understand their Nielsen sales data within the Perfect Sales Execution (PSE) framework.

**Perfect Sales Execution Framework:**
This application operates within the PSE framework, which consists of five key pillars:

1. **Availability** - Out-of-stock prevention, SKU availability, inventory management, stock levels
2. **Visibility** - Shelf placement, facings, share of shelf, merchandising presence, product visibility
3. **Price & Promotion** - Pricing compliance, promotional execution, price competitiveness, promotional effectiveness
4. **Merchandising** - Planogram compliance, display execution, POS materials, in-store presentation
5. **Relationship** - Account management, joint business planning, partnership quality, retailer relationships

When discussing sales data and providing insights, consider which PSE pillar(s) are most relevant and provide actionable recommendations that help improve retail execution. Focus on practical, business-oriented advice that drives better in-store performance."""

            if query_results:
                columns = query_results.get("columns", [])
                rows = query_results.get("rows", [])
                row_count = query_results.get("rowCount", 0)
                sample_rows = rows[:3] if rows else []

                system_context += f"\n\nCurrent query results context:\n"
                system_context += f"- Total rows: {row_count}\n"
                system_context += f"- Columns: {', '.join(columns)}\n"

                if sample_rows and columns:
                    system_context += f"\nSample data:\n"
                    for row in sample_rows:
                        row_dict = dict(zip(columns, row))
                        system_context += f"{json.dumps(row_dict, indent=2)}\n"

            messages.append(
                ChatMessage(
                    role=ChatMessageRole.SYSTEM,
                    content=system_context
                )
            )

            # Add conversation history
            for msg in conversation_history:
                role = ChatMessageRole.USER if msg["role"] == "user" else ChatMessageRole.ASSISTANT
                messages.append(
                    ChatMessage(
                        role=role,
                        content=msg["content"]
                    )
                )

            # Add current message - focus on analytics, but mention visualization tool if available
            if current_viz_spec:
                user_prompt = f"""{message}

You have access to a modify_visualization tool that can update the current chart. Use it when the user asks to change visualization appearance (colors, chart type, styling, etc.).

For analytical questions, provide your response as a JSON object with this structure:
{{
  "message": "Your detailed analytical response to the user's question",
  "suggested_followups": ["3-5 relevant follow-up questions"]
}}

**Your Focus:**
- Provide clear, actionable business insights
- Explain trends, patterns, and anomalies in the data
- Give recommendations based on PSE framework when relevant
- Use modify_visualization tool for visualization changes (colors, chart types, etc.)
- For analytical questions, respond with JSON

Return ONLY the JSON object for analytical responses, no other text."""
            else:
                user_prompt = f"""{message}

Please provide your response as a JSON object with this structure:
{{
  "message": "Your detailed analytical response to the user's question",
  "suggested_followups": ["3-5 relevant follow-up questions"]
}}

**Your Focus:**
- Provide clear, actionable business insights
- Explain trends, patterns, and anomalies in the data
- Give recommendations based on PSE framework when relevant
- Suggest analytical next steps or follow-up questions

Return ONLY the JSON object, no other text."""

            messages.append(
                ChatMessage(
                    role=ChatMessageRole.USER,
                    content=user_prompt
                )
            )

            # Enable visualization tool if current viz spec is available
            has_viz_tool = current_viz_spec is not None
            tools = self._get_tool_definitions(include_visualization=has_viz_tool) if has_viz_tool else []

            # Call Claude with timeout protection and tool support
            logger.info(f"Calling Claude for chat response with {CLAUDE_CHAT_TIMEOUT}s timeout, tools={'enabled' if has_viz_tool else 'disabled'}...")

            async def call_claude():
                """Wrapper to make SDK call awaitable."""
                kwargs = {
                    "name": self.endpoint_name,
                    "messages": messages,
                    "max_tokens": 1500,
                    "temperature": 0.7
                }
                if has_viz_tool and tools:
                    kwargs["tools"] = tools
                return await asyncio.to_thread(
                    self.client.serving_endpoints.query,
                    **kwargs
                )

            try:
                response = await asyncio.wait_for(call_claude(), timeout=CLAUDE_CHAT_TIMEOUT)
            except asyncio.TimeoutError:
                logger.error(f"Claude chat timed out after {CLAUDE_CHAT_TIMEOUT}s")
                return {
                    "message": "Response is taking longer than expected. Please try rephrasing your question.",
                    "suggested_followups": []
                }
            except TypeError as e:
                # Tools not supported, retry without tools
                if "unexpected keyword argument 'tools'" in str(e):
                    logger.warning("Tools not supported, falling back to non-tool chat")
                    async def call_claude_no_tools():
                        return await asyncio.to_thread(
                            self.client.serving_endpoints.query,
                            name=self.endpoint_name,
                            messages=messages,
                            max_tokens=1500,
                            temperature=0.7
                        )
                    response = await asyncio.wait_for(call_claude_no_tools(), timeout=CLAUDE_CHAT_TIMEOUT)
                else:
                    raise

            # Check for tool calls in response
            if response.choices and len(response.choices) > 0:
                message_response = response.choices[0].message

                # Handle tool calls (visualization modification)
                if hasattr(message_response, 'tool_calls') and message_response.tool_calls:
                    logger.info(f"Claude requested {len(message_response.tool_calls)} tool calls")

                    for tool_call in message_response.tool_calls:
                        tool_name = tool_call.function.name
                        tool_input = json.loads(tool_call.function.arguments)

                        if tool_name == "modify_visualization":
                            # Execute visualization modification
                            context = {
                                "current_viz_spec": current_viz_spec,
                                "query_results": query_results
                            }
                            tool_result = await self._execute_tool(tool_name, tool_input, context)

                            if tool_result.get("success"):
                                # Return the updated visualization spec
                                return {
                                    "message": "I've updated the visualization based on your request.",
                                    "suggested_followups": [
                                        "Change the colors",
                                        "Try a different chart type",
                                        "Add annotations"
                                    ],
                                    "visualization_spec": tool_result["visualization_spec"]
                                }
                            else:
                                return {
                                    "message": f"I couldn't update the visualization: {tool_result.get('error', 'Unknown error')}",
                                    "suggested_followups": []
                                }

                # No tool calls - parse as regular analytical response
                response_text = message_response.content
                logger.info(f"Chat response received: {len(response_text)} chars")

                # Try to parse as JSON to extract structured response
                try:
                    parsed = self._parse_chat_response(response_text)
                    return parsed
                except Exception as e:
                    logger.warning(f"Failed to parse chat response as JSON: {e}, returning plain text")
                    # Fallback to plain text response
                    return {
                        "message": response_text,
                        "suggested_followups": [
                            "Can you explain this in more detail?",
                            "What are the key insights?",
                            "What should I do next?"
                        ]
                    }

            return {
                "message": "I'm having trouble processing your question. Could you rephrase it?",
                "suggested_followups": []
            }

        except asyncio.TimeoutError:
            logger.error("Claude chat timed out")
            return {
                "message": "Response is taking longer than expected. Please try rephrasing your question.",
                "suggested_followups": []
            }
        except Exception as e:
            logger.error(f"Chat failed: {str(e)}")
            logger.exception("Full chat exception:")

            # Return fallback
            return {
                "message": "I'm currently unavailable. Please try again later.",
                "suggested_followups": []
            }

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse Claude's JSON response.

        Args:
            response: Raw response text from Claude

        Returns:
            Parsed analysis dictionary including visualizationSpec
        """
        try:
            # Try to extract JSON from response
            # Claude might wrap it in markdown code blocks
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()
            elif "```" in response:
                json_start = response.find("```") + 3
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()

            analysis = json.loads(response)

            # Validate structure and extract fields
            result = {
                "summary": analysis.get("summary", "Query executed successfully."),
                "followup_questions": analysis.get("followup_questions", [])[:5],  # Max 5
                "insights": analysis.get("insights", [])[:3]  # Max 3
            }

            # Extract visualization spec if present
            if "visualizationSpec" in analysis:
                result["visualization_spec"] = analysis["visualizationSpec"]
                logger.info(f"Extracted visualization spec: {analysis['visualizationSpec'].get('chartType', 'unknown')}")

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {str(e)}")
            logger.debug(f"Response was: {response}")
            # Return fallback
            return {
                "summary": "Query executed successfully. Results are displayed below.",
                "followup_questions": [],
                "insights": []
            }

    def _parse_chat_response(self, response: str) -> Dict[str, Any]:
        """
        Parse Claude's chat response JSON (analytics only).

        Args:
            response: Raw response text from Claude

        Returns:
            Parsed chat response dictionary with analytics insights
        """
        try:
            # Try to extract JSON from response
            # Claude might wrap it in markdown code blocks
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()
            elif "```" in response:
                json_start = response.find("```") + 3
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()

            chat_data = json.loads(response)

            # Build result with analytics fields only
            result = {
                "message": chat_data.get("message", ""),
                "suggested_followups": chat_data.get("suggested_followups", [])[:5]
            }

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse chat response as JSON: {str(e)}")
            logger.debug(f"Response was: {response}")
            raise  # Re-raise to trigger fallback in caller
