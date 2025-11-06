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
from typing import List, Dict, Any, Optional
from databricks.sdk import WorkspaceClient
from server.config import settings

logger = logging.getLogger(__name__)


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

    def _get_tool_definitions(self) -> List[Dict[str, Any]]:
        """
        Define tools available to Claude.

        Returns:
            List of tool definitions in OpenAI format
        """
        return [
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

    async def _execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool by calling tool functions directly.

        Args:
            tool_name: Name of the tool to execute
            tool_input: Input parameters for the tool

        Returns:
            Tool execution result
        """
        try:
            # Import tool functions dynamically to avoid circular imports
            from server.routers.tools import get_competitor_pricing, get_market_trend

            logger.info(f"Executing tool: {tool_name} with input: {tool_input}")

            # Call the appropriate tool function
            if tool_name == "get_competitor_pricing":
                result = await get_competitor_pricing(product=tool_input.get("product", ""))
            elif tool_name == "get_market_trend":
                result = await get_market_trend(category=tool_input.get("category", ""))
            else:
                return {"error": f"Unknown tool: {tool_name}"}

            logger.info(f"Tool {tool_name} returned: {result}")
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
        Analyze query results using Claude AI.

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

            # Call Claude endpoint with tool support
            logger.info("Calling _call_claude_with_tools...")
            response = await self._call_claude_with_tools(prompt)
            logger.info(f"Response received, length: {len(response)} chars")

            # Parse and return the analysis
            logger.info("Parsing response...")
            result = self._parse_response(response)
            logger.info("Parsing complete")
            return result

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

        prompt = f"""You are an expert data analyst helping a business user understand their Nielsen sales data query results.

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
  "summary": "A clear, business-focused 2-3 sentence summary of what the data shows. Focus on key insights and trends.",
  "followup_questions": [
    "3-5 relevant follow-up questions the user might want to ask based on these results",
    "Make them specific to the data shown, not generic"
  ],
  "insights": [
    "1-3 proactive insights or observations about the data",
    "Focus on trends, anomalies, or noteworthy patterns"
  ]
}

**Important:**
- Be concise and business-focused
- Use specific numbers from the data
- Make follow-up questions contextual and relevant
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
        query_results: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Chat with Claude in the context of query results.

        Args:
            message: User's message/question
            conversation_history: Previous messages in the conversation
            query_results: Current query results being discussed (optional)

        Returns:
            Dict with:
                - message: Claude's response
                - suggested_followups: List of suggested follow-up questions
        """
        try:
            from databricks.sdk.service.serving import ChatMessage, ChatMessageRole

            logger.info(f"Chat request: {message}")

            # Build the conversation context
            messages = []

            # Add system message with context
            system_context = "You are an expert data analyst helping a business user understand their Nielsen sales data."

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

            # Add current message
            messages.append(
                ChatMessage(
                    role=ChatMessageRole.USER,
                    content=message
                )
            )

            # Call Claude
            logger.info("Calling Claude for chat response...")
            response = self.client.serving_endpoints.query(
                name=self.endpoint_name,
                messages=messages,
                max_tokens=1500,
                temperature=0.7
            )

            if response.choices and len(response.choices) > 0:
                response_text = response.choices[0].message.content
                logger.info(f"Chat response received: {len(response_text)} chars")

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
            Parsed analysis dictionary
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

            # Validate structure
            return {
                "summary": analysis.get("summary", "Query executed successfully."),
                "followup_questions": analysis.get("followup_questions", [])[:5],  # Max 5
                "insights": analysis.get("insights", [])[:3]  # Max 3
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {str(e)}")
            logger.debug(f"Response was: {response}")
            # Return fallback
            return {
                "summary": "Query executed successfully. Results are displayed below.",
                "followup_questions": [],
                "insights": []
            }
