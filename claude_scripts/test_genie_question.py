#!/usr/bin/env python3
"""Test Genie question via deployed app."""
import requests
import json

app_url = "https://mathias-pse-test-4295693306818923.3.azure.databricksapps.com"
question = "Show top 5 products by sales"

print(f"Testing Genie question on deployed app...")
print(f"App URL: {app_url}")
print(f"Question: {question}")
print()

# Test the /api/genie/ask endpoint
url = f"{app_url}/api/genie/ask"
payload = {"question": question}

print(f"POST {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")
print()

try:
    response = requests.post(url, json=payload, timeout=60)

    print(f"Status Code: {response.status_code}")
    print()

    if response.status_code == 200:
        print("[SUCCESS] Genie is working!")
        print()
        result = response.json()
        print("Response:")
        print(json.dumps(result, indent=2))
    else:
        print("[ERROR] Request failed")
        print()
        print("Response:")
        print(response.text)

except requests.exceptions.Timeout:
    print("[ERROR] Request timed out after 60 seconds")
except Exception as e:
    print(f"[ERROR] Exception: {e}")
