#!/usr/bin/env python3
"""Check catalog and schema permissions for service principal."""
import os
from databricks.sdk import WorkspaceClient

client = WorkspaceClient(
    host=os.environ.get("DATABRICKS_HOST"),
    token=os.environ.get("DATABRICKS_TOKEN")
)

service_principal_id = "e535a5f8-c2d0-4476-abee-0db468e659a1"
catalog_name = "p_coe_gold"
schema_name = "ofs_nielsen"

print(f"Checking permissions for service principal: {service_principal_id}")
print(f"Catalog: {catalog_name}")
print(f"Schema: {schema_name}")
print()

# Check catalog permissions
print("=" * 80)
print("CATALOG PERMISSIONS")
print("=" * 80)
try:
    catalog_perms = client.grants.get_effective(
        securable_type="catalog",
        full_name=catalog_name
    )

    print(f"\nEffective permissions on catalog '{catalog_name}':")
    for i, entry in enumerate(catalog_perms.privilege_assignments, 1):
        if service_principal_id in str(entry.principal):
            print(f"\nEntry {i}:")
            print(f"  Principal: {entry.principal}")
            print(f"  Privileges: {entry.privileges}")
except Exception as e:
    print(f"Error getting catalog permissions: {e}")

# Check schema permissions
print("\n" + "=" * 80)
print("SCHEMA PERMISSIONS")
print("=" * 80)
try:
    schema_perms = client.grants.get_effective(
        securable_type="schema",
        full_name=f"{catalog_name}.{schema_name}"
    )

    print(f"\nEffective permissions on schema '{catalog_name}.{schema_name}':")
    for i, entry in enumerate(schema_perms.privilege_assignments, 1):
        if service_principal_id in str(entry.principal):
            print(f"\nEntry {i}:")
            print(f"  Principal: {entry.principal}")
            print(f"  Privileges: {entry.privileges}")
except Exception as e:
    print(f"Error getting schema permissions: {e}")

print("\n" + "=" * 80)
print("REQUIRED PERMISSIONS")
print("=" * 80)
print(f"""
For Genie to work, the service principal needs:
1. USE CATALOG on '{catalog_name}'
2. USE SCHEMA on '{catalog_name}.{schema_name}'
3. SELECT on tables in '{catalog_name}.{schema_name}.*'
""")
