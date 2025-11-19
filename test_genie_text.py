"""
Test script to verify Genie text attachments for conversational questions.

This script tests whether Genie returns text attachments (natural language responses)
for conversational questions vs query attachments (SQL) for data questions.
"""

import os
import sys
from pathlib import Path
from datetime import timedelta

# Add server directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
def load_env_file(filepath: str) -> None:
    """Load environment variables from a file."""
    if Path(filepath).exists():
        with open(filepath) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, _, value = line.partition('=')
                    if key and value:
                        os.environ[key] = value

load_env_file('.env')
load_env_file('.env.local')

from databricks.sdk import WorkspaceClient

def test_genie_question(question: str, question_type: str):
    """
    Test Genie with a specific question and log the response structure.

    Args:
        question: The question to ask Genie
        question_type: Description of question type (e.g., "Conversational", "Data Query")
    """
    print(f"\n{'='*80}")
    print(f"Testing {question_type} Question")
    print(f"{'='*80}")
    print(f"Question: {question}")
    print(f"{'-'*80}\n")

    try:
        # Initialize Databricks client
        workspace_client = WorkspaceClient()

        # Get Genie space ID from environment
        space_id = os.getenv('GENIE_SPACE_ID')
        if not space_id:
            print("ERROR: GENIE_SPACE_ID not found in environment variables")
            return

        print(f"Using Genie Space ID: {space_id}")
        print("Calling start_conversation_and_wait with 120s timeout...")

        # Call Genie API
        response = workspace_client.genie.start_conversation_and_wait(
            space_id=space_id,
            content=question,
            timeout=timedelta(seconds=120)
        )

        print(f"\n[OK] Response received!")
        print(f"  Status: {getattr(response, 'status', 'UNKNOWN')}")
        print(f"  Message ID: {getattr(response, 'message_id', 'N/A')}")

        # Check attachments
        attachments = getattr(response, 'attachments', None)

        if not attachments:
            print("\n[WARNING] No attachments in response")
            return

        print(f"\n  Attachments: {len(attachments)} found")

        # Process each attachment
        for i, attachment in enumerate(attachments):
            print(f"\n  Attachment {i+1}:")
            print(f"    Type: {type(attachment)}")

            # Check for text attachment
            text_obj = getattr(attachment, 'text', None)
            if text_obj:
                text_content = getattr(text_obj, 'content', None)
                print(f"    [YES] TEXT ATTACHMENT FOUND!")
                if text_content:
                    print(f"    Content length: {len(text_content)} chars")
                    print(f"    Content preview: {text_content[:200]}...")
                else:
                    print(f"    [WARNING] Text content is empty/None")
            else:
                print(f"    [NO] No text attachment")

            # Check for query attachment
            query_obj = getattr(attachment, 'query', None)
            if query_obj:
                print(f"    [YES] QUERY ATTACHMENT FOUND!")
                sql = getattr(query_obj, 'query', None)
                description = getattr(query_obj, 'description', None)
                if sql:
                    print(f"    SQL length: {len(sql)} chars")
                    print(f"    SQL preview: {sql[:100]}...")
                if description:
                    print(f"    Description: {description[:150]}...")
            else:
                print(f"    [NO] No query attachment")

            # Check for suggested questions
            suggested_obj = getattr(attachment, 'suggested_questions', None)
            if suggested_obj:
                print(f"    [YES] SUGGESTED QUESTIONS FOUND!")

            # Full attachment dict
            try:
                attachment_dict = attachment.as_dict()
                print(f"\n    Full attachment structure:")
                import json
                print(f"    {json.dumps(attachment_dict, indent=6)}")
            except Exception as e:
                print(f"    Could not serialize attachment: {e}")

    except Exception as e:
        print(f"\n[ERROR] {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()


def main():
    """Run tests with different question types."""

    print("\n" + "="*80)
    print("GENIE TEXT ATTACHMENT TEST")
    print("="*80)
    print("\nThis script tests whether Genie returns text attachments for different")
    print("types of questions (conversational vs data queries).")
    print("="*80)

    # Test with user's specific question
    test_genie_question(
        question="Top 10 products by value sales?",
        question_type="User's Data Query"
    )

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()
