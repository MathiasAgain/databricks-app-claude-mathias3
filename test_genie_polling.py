"""
Test Genie with manual polling (like the UI does) instead of start_conversation_and_wait.

This tests whether using manual polling gives us text attachments that the
convenience method doesn't return.
"""

import os
import sys
import time
from pathlib import Path

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

def test_manual_polling(question: str):
    """Test Genie with manual polling (like UI does)."""

    print(f"\n{'='*80}")
    print(f"Testing Manual Polling Approach")
    print(f"{'='*80}")
    print(f"Question: {question}")
    print(f"{'-'*80}\n")

    try:
        # Initialize client
        workspace_client = WorkspaceClient()
        space_id = os.getenv('GENIE_SPACE_ID')

        if not space_id:
            print("[ERROR] GENIE_SPACE_ID not found")
            return

        print(f"Using Genie Space ID: {space_id}")

        # Step 1: Start conversation and send message (non-blocking)
        print("\nStep 1: Starting conversation and sending message...")
        message = workspace_client.genie.start_conversation(
            space_id=space_id,
            content=question
        )
        conversation_id = message.conversation_id
        message_id = message.message_id
        print(f"  Conversation ID: {conversation_id}")
        print(f"  Message ID: {message_id}")

        # Step 2: Poll for completion (like UI does)
        print("\nStep 2: Polling for completion...")
        max_polls = 60  # 60 polls * 2 seconds = 2 minutes max
        poll_interval = 2

        for poll_count in range(max_polls):
            print(f"  Poll {poll_count + 1}/{max_polls}...", end='')

            # Get message status
            current_message = workspace_client.genie.get_message(
                space_id=space_id,
                conversation_id=conversation_id,
                message_id=message_id
            )

            status = current_message.status
            print(f" Status: {status}")

            if str(status) == "MessageStatus.COMPLETED":
                print("\n[SUCCESS] Message completed!")

                # Check attachments
                attachments = getattr(current_message, 'attachments', None)

                if not attachments:
                    print("[WARNING] No attachments in completed message")
                    return

                print(f"\nAttachments: {len(attachments)} found")

                # Process each attachment
                for i, attachment in enumerate(attachments):
                    print(f"\n  Attachment {i+1}:")

                    # Check for text
                    text_obj = getattr(attachment, 'text', None)
                    if text_obj:
                        text_content = getattr(text_obj, 'content', None)
                        if text_content:
                            print(f"    [YES] TEXT ATTACHMENT FOUND!")
                            print(f"    Content length: {len(text_content)} chars")
                            print(f"    Content preview: {text_content[:300]}...")
                        else:
                            print(f"    [WARNING] Text object exists but content is None")
                    else:
                        print(f"    [NO] No text attachment")

                    # Check for query
                    query_obj = getattr(attachment, 'query', None)
                    if query_obj:
                        print(f"    [YES] QUERY ATTACHMENT FOUND!")
                        sql = getattr(query_obj, 'query', None)
                        if sql:
                            print(f"    SQL length: {len(sql)} chars")

                    # Show full structure
                    try:
                        import json
                        attachment_dict = attachment.as_dict()
                        print(f"\n    Full attachment structure:")
                        print(f"    {json.dumps(attachment_dict, indent=6)}")
                    except Exception as e:
                        print(f"    Could not serialize: {e}")

                return

            elif str(status) in ["MessageStatus.FAILED", "MessageStatus.CANCELLED"]:
                print(f"\n[ERROR] Message {status}")
                return

            # Wait before next poll
            time.sleep(poll_interval)

        print(f"\n[TIMEOUT] Message did not complete after {max_polls * poll_interval} seconds")

    except Exception as e:
        print(f"\n[ERROR] {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()


def main():
    """Run test with manual polling."""
    test_manual_polling("Top 10 products by value sales?")

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()
