#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test various types of questions against Genie Space
to identify which types fail or succeed.
"""

import logging
import os
import sys
import io
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.dashboards import MessageStatus

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

logging.basicConfig(level=logging.WARNING)

from dotenv import load_dotenv
load_dotenv('.env.local')

GENIE_SPACE_ID = os.getenv('GENIE_SPACE_ID', '01f0a834208e13dab88b1fd3f7d718c0')

print("\n" + "="*80)
print("GENIE SPACE QUESTION TESTING")
print("="*80 + "\n")

client = WorkspaceClient()
user = client.current_user.me()
print(f"Testing as: {user.display_name}\n")

# Test questions
test_questions = [
    # Simple questions
    ("Simple: Show sales", "Show sales"),
    ("Simple: List brands", "List brands"),
    ("Simple: Product data", "Product data"),

    # Data-specific questions
    ("Data: Top 10 products", "What are the top 10 products by sales revenue?"),
    ("Data: Sales by brand", "Show me total sales by brand"),
    ("Data: Annual trend", "Show sales trend by year"),
    ("Data: Regional analysis", "What are regional sales patterns?"),

    # Complex questions
    ("Complex: YoY analysis", "Compare year-over-year performance for the top 5 categories"),
    ("Complex: Outliers", "Which products are outliers in terms of sales performance?"),

    # Vague questions
    ("Vague: General info", "Tell me about the data"),
    ("Vague: Summary", "Give me a summary"),

    # Boundary cases
    ("Boundary: Very long", "Show me detailed analysis of " + "data " * 50),
]

results = []

for label, question in test_questions:
    print(f"[TEST] {label}")
    print(f"  Question: {question[:60]}...")

    try:
        response = client.genie.start_conversation_and_wait(
            space_id=GENIE_SPACE_ID,
            content=question
        )

        status = response.status if hasattr(response, 'status') else 'UNKNOWN'
        error = response.error if hasattr(response, 'error') else None

        if status == MessageStatus.COMPLETED:
            # Extract SQL
            sql = None
            if hasattr(response, 'attachments') and response.attachments:
                for att in response.attachments:
                    if hasattr(att, 'query') and att.query and hasattr(att.query, 'query'):
                        sql = att.query.query
                        break

            rows = 0
            if hasattr(response, 'query_result') and response.query_result:
                rows = response.query_result.row_count or 0

            print(f"  Status: COMPLETED")
            print(f"  SQL Length: {len(sql) if sql else 'N/A'}")
            print(f"  Rows: {rows}")
            results.append((label, "PASS", status, None))

        elif status == MessageStatus.FAILED:
            print(f"  Status: FAILED")
            if error:
                print(f"  Error: {error}")
            results.append((label, "FAIL", status, str(error)))

        else:
            print(f"  Status: {status}")
            results.append((label, "WARN", status, None))

    except Exception as e:
        print(f"  Exception: {str(e)[:100]}")
        results.append((label, "ERROR", "EXCEPTION", str(e)))

    print()

# Summary
print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80 + "\n")

pass_count = sum(1 for _, result, _, _ in results if result == "PASS")
fail_count = sum(1 for _, result, _, _ in results if result == "FAIL")
error_count = sum(1 for _, result, _, _ in results if result == "ERROR")

print(f"PASSED: {pass_count}/{len(results)}")
print(f"FAILED: {fail_count}/{len(results)}")
print(f"ERRORS: {error_count}/{len(results)}")
print()

if fail_count > 0:
    print("Failed questions:")
    for label, result, status, error in results:
        if result == "FAIL":
            print(f"  - {label}: {status}")
            if error:
                print(f"    Error: {error[:100]}")

print("\n" + "="*80)
