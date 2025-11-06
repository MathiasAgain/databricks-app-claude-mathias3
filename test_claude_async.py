"""
Test Claude service in async context (like FastAPI)
"""
import asyncio
from databricks.sdk import WorkspaceClient
from server.services.claude_service import ClaudeService

async def test_claude_service():
    print("Initializing WorkspaceClient...")
    client = WorkspaceClient()

    print("Creating ClaudeService...")
    claude_service = ClaudeService(client)

    print("Testing analyze_query_results...")
    try:
        result = await claude_service.analyze_query_results(
            question="What are the top 3 products?",
            sql="SELECT * FROM products LIMIT 3",
            results={
                "columns": ["product", "sales"],
                "rows": [["Product A", 1000], ["Product B", 900], ["Product C", 800]],
                "rowCount": 3
            }
        )

        print("\nSuccess!")
        print(f"Summary: {result['summary']}")
        print(f"Follow-ups: {result['followup_questions']}")
        print(f"Insights: {result['insights']}")

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_claude_service())
