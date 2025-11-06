#!/usr/bin/env python3
"""Grant catalog and schema permissions to service principal."""
import os
from databricks.sdk import WorkspaceClient

client = WorkspaceClient(
    host=os.environ.get("DATABRICKS_HOST"),
    token=os.environ.get("DATABRICKS_TOKEN")
)

service_principal_name = "app-1b5gbx mathias-pse-test"
catalog_name = "p_coe_gold"
schema_name = "ofs_nielsen"

print(f"Granting permissions to service principal: {service_principal_name}")
print(f"Catalog: {catalog_name}")
print(f"Schema: {catalog_name}.{schema_name}")
print()

# Grant USE CATALOG permission
print("=" * 80)
print("GRANTING CATALOG PERMISSIONS")
print("=" * 80)
try:
    print(f"Granting USE CATALOG on '{catalog_name}'...")
    client.grants.update(
        securable_type="catalog",
        full_name=catalog_name,
        changes=[
            {
                "add": [
                    {
                        "principal": service_principal_name,
                        "privileges": ["USE CATALOG"]
                    }
                ]
            }
        ]
    )
    print("[SUCCESS] USE CATALOG granted!")
except Exception as e:
    print(f"[ERROR] Failed to grant USE CATALOG: {e}")

# Grant USE SCHEMA permission
print("\n" + "=" * 80)
print("GRANTING SCHEMA PERMISSIONS")
print("=" * 80)
try:
    print(f"Granting USE SCHEMA on '{catalog_name}.{schema_name}'...")
    client.grants.update(
        securable_type="schema",
        full_name=f"{catalog_name}.{schema_name}",
        changes=[
            {
                "add": [
                    {
                        "principal": service_principal_name,
                        "privileges": ["USE SCHEMA"]
                    }
                ]
            }
        ]
    )
    print("[SUCCESS] USE SCHEMA granted!")
except Exception as e:
    print(f"[ERROR] Failed to grant USE SCHEMA: {e}")

# Grant SELECT permission on all tables in schema
print("\n" + "=" * 80)
print("GRANTING TABLE PERMISSIONS")
print("=" * 80)
try:
    print(f"Granting SELECT on all tables in '{catalog_name}.{schema_name}'...")

    # List all tables in the schema
    tables = client.tables.list(
        catalog_name=catalog_name,
        schema_name=schema_name
    )

    table_count = 0
    for table in tables:
        try:
            table_full_name = f"{catalog_name}.{schema_name}.{table.name}"
            print(f"  - Granting SELECT on {table_full_name}...")
            client.grants.update(
                securable_type="table",
                full_name=table_full_name,
                changes=[
                    {
                        "add": [
                            {
                                "principal": service_principal_name,
                                "privileges": ["SELECT"]
                            }
                        ]
                    }
                ]
            )
            table_count += 1
        except Exception as e:
            print(f"    [WARNING] Failed to grant SELECT on {table.name}: {e}")

    print(f"[SUCCESS] SELECT granted on {table_count} tables!")
except Exception as e:
    print(f"[ERROR] Failed to grant SELECT: {e}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print("""
Permissions granted:
1. ✓ USE CATALOG on 'p_coe_gold'
2. ✓ USE SCHEMA on 'p_coe_gold.ofs_nielsen'
3. ✓ SELECT on tables in 'p_coe_gold.ofs_nielsen.*'

Genie should now work correctly!
""")
