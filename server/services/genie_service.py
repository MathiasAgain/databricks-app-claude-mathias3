"""
Genie Service - Natural language to SQL query generation and execution.

Integrates with Databricks Genie API to convert natural language questions
into SQL queries and execute them on the data warehouse.
"""

import logging
import uuid
import time
import asyncio
from typing import Optional
from cachetools import TTLCache
from databricks.sdk import WorkspaceClient
from server.models import QueryResults, GenieResponse
from server.config import settings

logger = logging.getLogger(__name__)


class GenieService:
    """Service for interacting with Databricks Genie API."""

    def __init__(self, workspace_client: WorkspaceClient):
        """
        Initialize Genie service.

        Args:
            workspace_client: Databricks workspace client
        """
        self.client = workspace_client
        self.space_id = settings.genie_space_id
        self.warehouse_id = settings.databricks_warehouse_id

        # Initialize query cache if caching is enabled
        self.query_cache: Optional[TTLCache] = None
        self._cache_lock: Optional[asyncio.Lock] = None

        if settings.enable_query_caching:
            self.query_cache = TTLCache(
                maxsize=100,
                ttl=settings.query_cache_ttl
            )
            self._cache_lock = asyncio.Lock()
            logger.info(
                f"Query caching enabled (thread-safe): maxsize=100, ttl={settings.query_cache_ttl}s"
            )

    def _get_cache_key(self, question: str) -> str:
        """Generate cache key for a question."""
        return question.lower().strip()

    async def generate_sql(self, question: str) -> tuple[str, str]:
        """
        Generate SQL from natural language question using Genie.

        Args:
            question: Natural language question

        Returns:
            Tuple of (sql_query, natural_language_answer)

        Raises:
            Exception: If SQL generation fails
        """
        logger.info(f"[GENIE_START] Generating SQL for question: {question[:100]}")

        try:
            # Start a new conversation with Genie
            logger.info(f"[GENIE_API] Calling start_conversation_and_wait with space_id={self.space_id}")

            from datetime import timedelta

            # Use longer timeout to allow Genie to generate text responses
            # Documentation shows Genie can return text attachments with natural language answers
            response = self.client.genie.start_conversation_and_wait(
                space_id=self.space_id,
                content=question,
                timeout=timedelta(seconds=120)  # 2 minute timeout for text generation
            )

            logger.info(f"[GENIE_SUCCESS] Got response from Genie")

            # Log the full response structure including status
            logger.info(f"[GENIE_RESPONSE] Response type: {type(response)}")
            logger.info(f"[GENIE_RESPONSE] Response status: {getattr(response, 'status', 'UNKNOWN')}")
            logger.info(f"[GENIE_RESPONSE] Message ID: {getattr(response, 'message_id', 'N/A')}")
            logger.info(f"[GENIE_RESPONSE] Response attributes: {dir(response)}")
            try:
                response_dict = response.as_dict()
                logger.info(f"[GENIE_RESPONSE] Full response dict: {response_dict}")
            except Exception as e:
                logger.warning(f"[GENIE_RESPONSE] Could not serialize response: {e}")

            # Extract SQL and natural language answer from attachments
            # The Genie API returns a GenieMessage object with an attachments list
            # Each attachment can have:
            #   - query: GenieQueryAttachment with SQL query
            #   - text: TextAttachment with natural language response (Genie's answer)
            sql = None
            genie_answer = ""
            attachments = getattr(response, 'attachments', None)

            if attachments:
                logger.info(f"[GENIE_DEBUG] Processing {len(attachments)} attachments")
                for i, attachment in enumerate(attachments):
                    logger.info(f"[GENIE_DEBUG] Attachment {i}: type={type(attachment)}")

                    # Log the full attachment structure using as_dict()
                    try:
                        attachment_dict = attachment.as_dict()
                        logger.info(f"[GENIE_DEBUG] Attachment dict: {attachment_dict}")
                    except Exception as e:
                        logger.warning(f"[GENIE_DEBUG] Could not serialize attachment: {e}")

                    # Extract natural language text response (Genie's answer)
                    # Following official Databricks example: attachment.text.content
                    text_obj = getattr(attachment, 'text', None)
                    if text_obj and not genie_answer:
                        text_content = getattr(text_obj, 'content', None)
                        if text_content:
                            genie_answer = text_content
                            logger.info(
                                f'[GENIE_TEXT] Found text answer: '
                                f'{len(text_content)} chars'
                            )

                    # Extract SQL query
                    query_obj = getattr(attachment, 'query', None)
                    if query_obj:
                        # Query object has the SQL query
                        if not sql:
                            sql_text = getattr(query_obj, 'query', None)
                            if sql_text:
                                sql = sql_text
                                logger.info('[GENIE_SQL] Found SQL query')
            else:
                logger.warning("[GENIE_NO_ATTACHMENTS] Response has no attachments")

            # Validate that we got SQL
            if not sql:
                logger.error(f"[GENIE_NO_SQL] Failed to extract SQL from response")
                logger.error(f"[GENIE_DEBUG] Response content: {genie_answer[:200]}")
                logger.error(f"[GENIE_DEBUG] Has attachments: {attachments is not None}")
                if attachments:
                    logger.error(f"[GENIE_DEBUG] Attachment count: {len(attachments)}")
                raise ValueError(
                    f"Genie did not return a SQL query. "
                    f"Response: {genie_answer[:100] if genie_answer else 'empty'}"
                )

            logger.info(f"[GENIE_SUCCESS] Generated SQL: {len(sql)} chars, answer: {len(genie_answer)} chars")
            return sql, genie_answer

        except Exception as e:
            logger.error(f"[GENIE_EXCEPTION] Type: {type(e).__name__}")
            logger.error(f"[GENIE_EXCEPTION] Message: {str(e)}")
            import traceback
            logger.error(f"[GENIE_TRACEBACK] {traceback.format_exc()}")
            raise Exception(f"Failed to generate SQL: {str(e)}")

    async def execute_query(self, sql: str) -> QueryResults:
        """
        Execute SQL query on warehouse.

        Args:
            sql: SQL query to execute

        Returns:
            QueryResults with columns and rows

        Raises:
            Exception: If query execution fails
        """
        logger.info(f"Executing SQL query: {sql[:100]}...")
        start_time = time.time()

        try:
            # Execute SQL using Databricks SQL Statement Execution API
            response = self.client.statement_execution.execute_statement(
                warehouse_id=self.warehouse_id,
                statement=sql,
                wait_timeout="30s"
            )

            # Extract results from response
            columns = []
            rows = []

            # Get column names from manifest schema
            if response.manifest and response.manifest.schema:
                columns = [col.name for col in response.manifest.schema.columns]

            # Get rows from result data
            if response.result and response.result.data_array:
                rows = response.result.data_array

            # Check if results were truncated
            row_count = len(rows)
            truncated = row_count >= settings.max_query_results

            if truncated:
                rows = rows[:settings.max_query_results]
                logger.warning(
                    f"Query results truncated to {settings.max_query_results} rows"
                )

            execution_time_ms = int((time.time() - start_time) * 1000)
            logger.info(
                f"Query executed successfully: {row_count} rows in {execution_time_ms}ms"
            )

            return QueryResults(
                columns=columns,
                rows=rows,
                rowCount=row_count,
                truncated=truncated
            )

        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            raise Exception(f"Query execution failed: {str(e)}")

    async def ask_question(
        self,
        question: str,
        skip_cache: bool = False
    ) -> GenieResponse:
        """
        Ask a natural language question and get SQL + results.

        This is the main end-to-end method that:
        1. Checks cache (if enabled) - thread-safe
        2. Generates SQL from question
        3. Executes SQL on warehouse
        4. Returns results with metadata

        Args:
            question: Natural language question
            skip_cache: If True, bypass cache

        Returns:
            GenieResponse with SQL, results, and metadata

        Raises:
            Exception: If any step fails
        """
        query_id = str(uuid.uuid4())
        cache_key = self._get_cache_key(question)
        start_time = time.time()

        logger.info(f"[QUESTION_START] query_id={query_id}, question={question[:80]}")

        # Check cache with thread-safety
        if not skip_cache and self.query_cache and self._cache_lock:
            async with self._cache_lock:
                if cache_key in self.query_cache:
                    logger.info(f"[CACHE_HIT] query_id={query_id}")
                    cached_response = self.query_cache[cache_key]
                    return GenieResponse(
                        **cached_response.dict(),
                        cached=True,
                        queryId=query_id
                    )

        # Generate SQL and get Genie's natural language answer
        logger.info(f"[GENERATING_SQL] query_id={query_id}")
        try:
            sql, genie_answer = await self.generate_sql(question)
            logger.info(f"[SQL_GENERATED] query_id={query_id}, sql_len={len(sql)}")
        except Exception as e:
            logger.error(f"[SQL_GENERATION_FAILED] query_id={query_id}, error={str(e)}")
            raise

        # Execute query
        logger.info(f"[EXECUTING_QUERY] query_id={query_id}")
        try:
            results = await self.execute_query(sql)
            logger.info(f"[QUERY_EXECUTED] query_id={query_id}, rows={results.rowCount}")
        except Exception as e:
            logger.error(f"[QUERY_EXECUTION_FAILED] query_id={query_id}, error={str(e)}")
            raise

        # Calculate total execution time
        execution_time_ms = int((time.time() - start_time) * 1000)

        # Create response
        response = GenieResponse(
            question=question,
            sql=sql,
            genieAnswer=genie_answer,
            results=results,
            aiSummary="",  # Will be filled by Claude service
            executionTimeMs=execution_time_ms,
            queryId=query_id,
            cached=False
        )

        # Cache the response with thread-safety
        if self.query_cache and self._cache_lock:
            async with self._cache_lock:
                self.query_cache[cache_key] = response
                logger.info(f"[RESPONSE_CACHED] query_id={query_id}")

        logger.info(f"[QUESTION_COMPLETE] query_id={query_id}, time_ms={execution_time_ms}")
        return response

    def get_suggested_questions(self) -> list[str]:
        """
        Get predefined suggested questions.

        Returns:
            List of suggested question strings
        """
        return [
            "Show top 5 categories by value sales for 2024",
            "Show top 5 products by value sales for 2024",
            "Show top 5 banners by value sales for 2024"
        ]
