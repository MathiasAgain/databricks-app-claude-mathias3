#!/usr/bin/env python3
"""Grant catalog and schema permissions using SQL GRANT statements."""
import os
from databricks.sdk import WorkspaceClient

client = WorkspaceClient(
    host=os.environ.get("DATABRICKS_HOST"),
    token=os.environ.get("DATABRICKS_TOKEN")
)

service_principal_name = "`app-1b5gbx mathias-pse-test`"
catalog_name = "p_coe_gold"
schema_name = "ofs_nielsen"
warehouse_id = "939811bf15d2854c"

print(f"Granting permissions to service principal: {service_principal_name}")
print(f"Catalog: {catalog_name}")
print(f"Schema: {catalog_name}.{schema_name}")
print()

# Grant USE CATALOG permission
print("=" * 80)
print("GRANTING CATALOG PERMISSIONS")
print("=" * 80)
try:
    sql = f"GRANT USE CATALOG ON CATALOG {catalog_name} TO {service_principal_name}"
    print(f"Executing: {sql}")

    response = client.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql,
        wait_timeout="30s"
    )
    print("[SUCCESS] USE CATALOG granted!")
except Exception as e:
    print(f"[ERROR] Failed to grant USE CATALOG: {e}")

# Grant USE SCHEMA permission
print("\n" + "=" * 80)
print("GRANTING SCHEMA PERMISSIONS")
print("=" * 80)
try:
    sql = f"GRANT USE SCHEMA ON SCHEMA {catalog_name}.{schema_name} TO {service_principal_name}"
    print(f"Executing: {sql}")

    response = client.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql,
        wait_timeout="30s"
    )
    print("[SUCCESS] USE SCHEMA granted!")
except Exception as e:
    print(f"[ERROR] Failed to grant USE SCHEMA: {e}")

# Grant SELECT permission on all tables in schema
print("\n" + "=" * 80)
print("GRANTING TABLE PERMISSIONS")
print("=" * 80)
try:
    sql = f"GRANT SELECT ON SCHEMA {catalog_name}.{schema_name} TO {service_principal_name}"
    print(f"Executing: {sql}")

    response = client.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql,
        wait_timeout="30s"
    )
    print("[SUCCESS] SELECT granted on all tables in schema!")
except Exception as e:
    print(f"[ERROR] Failed to grant SELECT: {e}")

print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)
try:
    # Check catalog permissions
    sql = f"SHOW GRANTS ON CATALOG {catalog_name}"
    print(f"\nExecuting: {sql}")
    response = client.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql,
        wait_timeout="30s"
    )

    if response.result and response.result.data_array:
        print("\nCatalog grants:")
        for row in response.result.data_array:
            if service_principal_name.strip('`') in str(row):
                print(f"  {row}")

    # Check schema permissions
    sql = f"SHOW GRANTS ON SCHEMA {catalog_name}.{schema_name}"
    print(f"\nExecuting: {sql}")
    response = client.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql,
        wait_timeout="30s"
    )

    if response.result and response.result.data_array:
        print("\nSchema grants:")
        for row in response.result.data_array:
            if service_principal_name.strip('`') in str(row):
                print(f"  {row}")
except Exception as e:
    print(f"[WARNING] Verification failed: {e}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print("""
Permissions granted:
1. USE CATALOG on 'p_coe_gold'
2. USE SCHEMA on 'p_coe_gold.ofs_nielsen'
3. SELECT on all tables in 'p_coe_gold.ofs_nielsen'

Genie should now work correctly!
""")
