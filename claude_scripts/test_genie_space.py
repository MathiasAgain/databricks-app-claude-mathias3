#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to diagnose Genie Space configuration issues.

This script checks:
1. If the Genie Space exists and is accessible
2. The space configuration (data sources, instructions, questions)
3. Whether the space can generate SQL queries
4. API response structure and error handling
"""

import logging
import json
import os
import sys
import io
from typing import Optional
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import EndpointConfPair

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env.local')

GENIE_SPACE_ID = os.getenv('GENIE_SPACE_ID', '01f0a834208e13dab88b1fd3f7d718c0')
WAREHOUSE_ID = os.getenv('DATABRICKS_WAREHOUSE_ID', '939811bf15d2854c')

print(f"\n{'='*80}")
print("GENIE SPACE DIAGNOSTIC TEST")
print(f"{'='*80}")
print(f"Space ID: {GENIE_SPACE_ID}")
print(f"Warehouse ID: {WAREHOUSE_ID}")
print(f"{'='*80}\n")

try:
    # Initialize Databricks client
    print("[1/6] Initializing Databricks SDK client...")
    client = WorkspaceClient()
    print("[OK] SDK client initialized successfully")
    print(f"  Workspace Host: {client.config.host}")
    print()

    # Get current user
    print("[2/6] Verifying authentication...")
    user = client.current_user.me()
    print(f"[OK] Authenticated as: {user.display_name} ({user.user_name})")
    print()

    # Test Genie API availability
    print("[3/6] Testing Genie API availability...")
    try:
        # Try to access genie API
        if hasattr(client, 'genie'):
            print("[OK] Genie API is available on client")
            print(f"  Genie service attributes: {dir(client.genie)}")
        else:
            print("[ERROR] Genie API not available on client")
            print(f"  Available attributes: {[x for x in dir(client) if not x.startswith('_')]}")
    except Exception as e:
        print(f"[ERROR] Error accessing Genie API: {e}")
    print()

    # Check Genie Space details
    print("[4/6] Checking Genie Space configuration...")
    try:
        # Note: This may not work with all SDK versions
        # The Genie API might not expose space details directly
        print(f"Attempting to get space details for: {GENIE_SPACE_ID}")

        # Try different approaches based on SDK version
        if hasattr(client.genie, 'get_space'):
            space = client.genie.get_space(GENIE_SPACE_ID)
            print(f"[OK] Space found!")
            print(f"  Space ID: {space.space_id}")
            print(f"  Space Name: {getattr(space, 'display_name', 'N/A')}")
            print(f"  Space Details: {json.dumps(space.__dict__, indent=2, default=str)}")
        else:
            print("[ERROR] Genie space details API not available in this SDK version")
            print("  Will proceed with testing conversation API directly")
    except Exception as e:
        print(f"[WARN] Could not fetch space details: {e}")
        print("  This may be normal - attempting direct conversation test instead")
    print()

    # Test basic conversation with simple question
    print("[5/6] Testing Genie conversation API with a simple question...")
    try:
        test_question = "Show me a simple query"
        print(f"Sending test question: '{test_question}'")

        response = client.genie.start_conversation_and_wait(
            space_id=GENIE_SPACE_ID,
            content=test_question
        )

        print(f"[OK] Genie API responded!")
        print(f"\nResponse type: {type(response)}")
        print(f"Response attributes: {[x for x in dir(response) if not x.startswith('_')]}")

        # Print response details
        if hasattr(response, 'status'):
            print(f"  Status: {response.status}")
        if hasattr(response, 'error'):
            print(f"  Error: {response.error}")
        if hasattr(response, 'text'):
            print(f"  Text: {response.text[:200] if response.text else 'None'}")
        if hasattr(response, 'attachments'):
            print(f"  Attachments: {len(response.attachments) if response.attachments else 0}")
            if response.attachments:
                for i, att in enumerate(response.attachments):
                    print(f"    Attachment {i}: {type(att)}")
                    print(f"      Attributes: {[x for x in dir(att) if not x.startswith('_')]}")
                    if hasattr(att, 'query'):
                        print(f"      Has query: {att.query}")
                        if hasattr(att.query, 'query'):
                            print(f"        Query SQL: {att.query.query[:100] if att.query.query else 'None'}")

        # Print full response for debugging
        print(f"\nFull Response JSON:")
        try:
            print(json.dumps(response.__dict__, indent=2, default=str))
        except Exception as json_err:
            print(f"Could not serialize response: {json_err}")
            print(f"Response str: {str(response)}")

    except Exception as e:
        print(f"[ERROR] Genie conversation failed: {e}")
        print(f"  Exception type: {type(e).__name__}")
        import traceback
        print(f"  Traceback: {traceback.format_exc()}")
    print()

    # Check warehouse accessibility
    print("[6/6] Checking warehouse accessibility...")
    try:
        # Get warehouse details
        warehouse = client.warehouses.get(WAREHOUSE_ID)
        print(f"[OK] Warehouse accessible!")
        print(f"  Name: {warehouse.name}")
        print(f"  State: {warehouse.state}")
        print(f"  Running: {warehouse.state == 'RUNNING'}")

        if warehouse.state != 'RUNNING':
            print(f"  [WARN] WARNING: Warehouse is not running! Current state: {warehouse.state}")
    except Exception as e:
        print(f"[ERROR] Could not access warehouse: {e}")
    print()

except Exception as e:
    print(f"FATAL ERROR: {e}")
    import traceback
    print(traceback.format_exc())
    sys.exit(1)

print(f"\n{'='*80}")
print("DIAGNOSTIC SUMMARY")
print(f"{'='*80}")
print("""
This diagnostic test checked:
1. SDK client initialization
2. Databricks authentication
3. Genie API availability
4. Genie Space configuration
5. Basic conversation test
6. Warehouse accessibility

Common issues that cause "failed to reach COMPLETED, got MessageStatus.FAILED":
- Genie Space has no configured data sources
- Genie Space has no sample questions or instructions
- Service principal lacks permissions on the warehouse
- Warehouse is not in RUNNING state
- Space is empty/not properly initialized

Next steps if issues found:
1. Configure Genie Space with data sources (tables/schema)
2. Add sample questions and instructions to the space
3. Ensure service principal has Query and other permissions
4. Start the warehouse if it's stopped
5. Check Databricks workspace logs for detailed error messages
""".strip())
print(f"{'='*80}\n")
