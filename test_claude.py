"""
Test Claude endpoint call in isolation
"""
import sys
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.serving import ChatMessage, ChatMessageRole

def test_claude():
    print("Initializing WorkspaceClient...")
    client = WorkspaceClient()

    print("Creating ChatMessage...")
    messages = [
        ChatMessage(
            role=ChatMessageRole.USER,
            content="What is 2+2?"
        )
    ]
    print(f"Messages type: {type(messages)}")
    print(f"Messages: {messages}")
    print(f"Message[0] type: {type(messages[0])}")

    endpoint_name = "databricks-claude-sonnet-4-5"

    print(f"\nCalling endpoint: {endpoint_name}...")
    try:
        response = client.serving_endpoints.query(
            name=endpoint_name,
            messages=messages,
            max_tokens=100,
            temperature=0.7
        )

        print(f"Response type: {type(response)}")
        print(f"Response: {response}")

        if response.choices and len(response.choices) > 0:
            answer = response.choices[0].message.content
            print(f"\nAnswer: {answer}")
        else:
            print("No response received")

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_claude()
