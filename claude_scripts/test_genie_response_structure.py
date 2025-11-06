#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analyze the Genie API response structure in detail.
"""

import logging
import json
import os
import sys
import io
from databricks.sdk import WorkspaceClient

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Setup logging
logging.basicConfig(
    level=logging.WARNING,  # Reduce noise
    format='%(asctime)s - %(levelname)s - %(message)s'
)

from dotenv import load_dotenv
load_dotenv('.env.local')

GENIE_SPACE_ID = os.getenv('GENIE_SPACE_ID', '01f0a834208e13dab88b1fd3f7d718c0')

print("\n" + "="*80)
print("GENIE API RESPONSE STRUCTURE ANALYSIS")
print("="*80 + "\n")

client = WorkspaceClient()
user = client.current_user.me()
print(f"Authenticated as: {user.display_name}")
print()

# Test conversation
print("Starting test conversation...")
response = client.genie.start_conversation_and_wait(
    space_id=GENIE_SPACE_ID,
    content="Show me the top products by sales"
)

print("\n[RESPONSE OBJECT DETAILS]")
print(f"Response type: {type(response)}")
print(f"Response class name: {response.__class__.__name__}")
print(f"Response module: {response.__class__.__module__}")
print()

print("[CHECKING ATTRIBUTES]")
attrs = [x for x in dir(response) if not x.startswith('_')]
print(f"Available attributes: {attrs}")
print()

print("[RESPONSE.STATUS]")
if hasattr(response, 'status'):
    print(f"  status: {response.status}")
    print(f"  status type: {type(response.status)}")
    print(f"  status value: {response.status.value if hasattr(response.status, 'value') else 'N/A'}")
print()

print("[RESPONSE.ATTACHMENTS]")
if hasattr(response, 'attachments') and response.attachments:
    print(f"  Count: {len(response.attachments)}")
    for i, att in enumerate(response.attachments):
        print(f"\n  Attachment {i}:")
        print(f"    Type: {type(att)}")
        print(f"    Class: {att.__class__.__name__}")
        print(f"    Attributes: {[x for x in dir(att) if not x.startswith('_')]}")

        if hasattr(att, 'query'):
            query_obj = att.query
            print(f"    query attribute exists: True")
            print(f"    query type: {type(query_obj)}")
            print(f"    query class: {query_obj.__class__.__name__ if query_obj else 'None'}")

            if query_obj:
                print(f"    query attributes: {[x for x in dir(query_obj) if not x.startswith('_')]}")

                # Check for 'query' inside the query object
                if hasattr(query_obj, 'query'):
                    print(f"    query.query exists: True")
                    print(f"    query.query type: {type(query_obj.query)}")
                    print(f"    query.query length: {len(query_obj.query) if query_obj.query else 0}")
                    print(f"    query.query[:100]: {query_obj.query[:100] if query_obj.query else 'None'}")
                else:
                    print(f"    query.query exists: False")
                    print(f"    Available in query object: {[x for x in dir(query_obj) if not x.startswith('_')]}")
        else:
            print(f"    query attribute exists: False")

        if hasattr(att, 'text'):
            print(f"    text: {att.text[:100] if att.text else 'None'}")
else:
    print("  No attachments found")
print()

print("[RESPONSE.CONTENT]")
if hasattr(response, 'content'):
    print(f"  Content: {response.content[:100] if response.content else 'None'}")
print()

print("[RESPONSE.ERROR]")
if hasattr(response, 'error'):
    print(f"  Error: {response.error}")
print()

print("[RESPONSE.QUERY_RESULT]")
if hasattr(response, 'query_result'):
    qr = response.query_result
    print(f"  Type: {type(qr)}")
    if qr:
        print(f"  Attributes: {[x for x in dir(qr) if not x.startswith('_')]}")
        if hasattr(qr, 'row_count'):
            print(f"  Row count: {qr.row_count}")
print()

print("[FULL OBJECT AS DICT]")
try:
    obj_dict = response.as_dict()
    print(json.dumps(obj_dict, indent=2, default=str))
except Exception as e:
    print(f"Could not convert to dict: {e}")

print("\n" + "="*80)
print("KEY FINDINGS")
print("="*80)
print("""
The Genie API returns a GenieMessage object with:
- status: MessageStatus.COMPLETED (or other status enum)
- attachments: List of GenieAttachment objects
  - Each GenieAttachment has:
    - query: GenieQueryAttachment object containing:
      - query: The SQL string
      - description: Natural language description
      - statement_id: Statement ID for tracking
    - text: Any text content

The current code expects: attachment.query.query
This should be correct based on the class hierarchy.
""")
print("="*80 + "\n")
