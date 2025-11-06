"""
Warehouse Service - Direct SQL execution on Databricks SQL Warehouse.

Provides fallback SQL execution capabilities and query management.
"""

import logging
import time
from typing import Optional
from databricks.sdk import WorkspaceClient
from server.models import QueryResults
from server.config import settings

logger = logging.getLogger(__name__)


class WarehouseService:
    """Service for direct SQL warehouse operations."""

    def __init__(self, workspace_client: WorkspaceClient):
        """
        Initialize warehouse service.

        Args:
            workspace_client: Databricks workspace client
        """
        self.client = workspace_client
        self.warehouse_id = settings.databricks_warehouse_id
        self.active_queries: dict[str, any] = {}

    async def execute_sql(
        self,
        sql: str,
        timeout: int = 30
    ) -> QueryResults:
        """
        Execute SQL query directly on warehouse.

        Args:
            sql: SQL query to execute
            timeout: Query timeout in seconds

        Returns:
            QueryResults with columns and rows

        Raises:
            Exception: If query execution fails or times out
        """
        logger.info(f"Executing SQL on warehouse: {sql[:100]}...")
        start_time = time.time()

        try:
            # Execute SQL statement
            with self.client.sql.statement_execution.execute_statement(
                warehouse_id=self.warehouse_id,
                statement=sql,
                wait_timeout=f"{timeout}s"
            ) as cursor:
                # Fetch all results
                result_data = cursor.fetchall()
                columns = [desc[0] for desc in cursor.description] if cursor.description else []

                # Convert rows to list format
                rows = [list(row) for row in result_data]

                # Check if truncation is needed
                row_count = len(rows)
                truncated = row_count > settings.max_query_results

                if truncated:
                    rows = rows[:settings.max_query_results]
                    logger.warning(
                        f"Results truncated from {row_count} to {settings.max_query_results} rows"
                    )

                execution_time_ms = int((time.time() - start_time) * 1000)
                logger.info(
                    f"SQL executed: {len(rows)} rows in {execution_time_ms}ms"
                )

                return QueryResults(
                    columns=columns,
                    rows=rows,
                    rowCount=len(rows),
                    truncated=truncated
                )

        except Exception as e:
            logger.error(f"SQL execution failed: {str(e)}")
            raise Exception(f"SQL execution failed: {str(e)}")

    async def cancel_query(self, query_id: str) -> bool:
        """
        Cancel a running query.

        Args:
            query_id: Query ID to cancel

        Returns:
            True if cancellation was successful

        Raises:
            Exception: If cancellation fails
        """
        logger.info(f"Attempting to cancel query: {query_id}")

        if query_id not in self.active_queries:
            logger.warning(f"Query {query_id} not found in active queries")
            return False

        try:
            # Get the statement execution from active queries
            statement = self.active_queries[query_id]

            # Cancel the statement
            # Note: The exact cancellation method depends on Databricks SDK version
            self.client.sql.statement_execution.cancel_execution(
                statement_id=statement.statement_id
            )

            # Remove from active queries
            del self.active_queries[query_id]

            logger.info(f"Successfully cancelled query: {query_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to cancel query {query_id}: {str(e)}")
            raise Exception(f"Failed to cancel query: {str(e)}")

    def register_query(self, query_id: str, statement: any) -> None:
        """
        Register an active query for tracking and cancellation.

        Args:
            query_id: Unique query identifier
            statement: Statement execution object
        """
        self.active_queries[query_id] = statement
        logger.debug(f"Registered query: {query_id}")

    def unregister_query(self, query_id: str) -> None:
        """
        Unregister a completed query.

        Args:
            query_id: Query identifier to unregister
        """
        if query_id in self.active_queries:
            del self.active_queries[query_id]
            logger.debug(f"Unregistered query: {query_id}")
