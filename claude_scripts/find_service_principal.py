#!/usr/bin/env python3
"""Find the exact service principal name for the app."""
import os
from databricks.sdk import WorkspaceClient

client = WorkspaceClient(
    host=os.environ.get("DATABRICKS_HOST"),
    token=os.environ.get("DATABRICKS_TOKEN")
)

# Get the app details to find its service principal
app_name = "mathias-pse-test"
service_principal_id = "e535a5f8-c2d0-4476-abee-0db468e659a1"

print("=" * 80)
print("FINDING SERVICE PRINCIPAL")
print("=" * 80)

# Try to get service principal by ID
try:
    sp = client.service_principals.get(id=service_principal_id)
    print(f"\nService Principal Details:")
    print(f"  ID: {sp.id}")
    print(f"  Application ID: {sp.application_id}")
    print(f"  Display Name: {sp.display_name}")
    print(f"  Active: {sp.active}")

    print("\n" + "=" * 80)
    print("SQL GRANT STATEMENTS")
    print("=" * 80)
    print("\nUse the Application ID (client ID) for GRANT statements:\n")

    print(f"-- Using Application ID:")
    print(f"GRANT USE CATALOG ON CATALOG p_coe_gold TO `{sp.application_id}`;\n")
    print(f"GRANT USE SCHEMA ON SCHEMA p_coe_gold.ofs_nielsen TO `{sp.application_id}`;\n")
    print(f"GRANT SELECT ON SCHEMA p_coe_gold.ofs_nielsen TO `{sp.application_id}`;\n")

except Exception as e:
    print(f"Error getting service principal: {e}")

# Also list all service principals to see the format
print("\n" + "=" * 80)
print("ALL SERVICE PRINCIPALS (for reference)")
print("=" * 80)
try:
    sps = client.service_principals.list()
    for sp in sps:
        if "mathias" in str(sp.display_name).lower() or "app-" in str(sp.display_name).lower():
            print(f"\nDisplay Name: {sp.display_name}")
            print(f"  ID: {sp.id}")
            print(f"  Application ID: {sp.application_id}")
except Exception as e:
    print(f"Error listing service principals: {e}")
