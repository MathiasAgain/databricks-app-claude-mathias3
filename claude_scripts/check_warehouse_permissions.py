#!/usr/bin/env python3
"""
Check current SQL Warehouse permissions.
"""
import os
import json
from databricks.sdk import WorkspaceClient

def check_warehouse_permissions():
    """Check current warehouse permissions."""

    # Initialize client
    client = WorkspaceClient(
        host=os.environ.get("DATABRICKS_HOST"),
        token=os.environ.get("DATABRICKS_TOKEN")
    )

    warehouse_id = "939811bf15d2854c"

    print(f"Checking warehouse permissions for: {warehouse_id}\n")

    try:
        # Get current permissions
        current_perms = client.permissions.get(
            request_object_type="warehouses",
            request_object_id=warehouse_id
        )

        print("Current Permissions:")
        print(f"  Total ACL entries: {len(current_perms.access_control_list) if current_perms.access_control_list else 0}\n")

        if current_perms.access_control_list:
            for idx, acl in enumerate(current_perms.access_control_list, 1):
                print(f"Entry {idx}:")
                if acl.user_name:
                    print(f"  User: {acl.user_name}")
                if acl.group_name:
                    print(f"  Group: {acl.group_name}")
                if acl.service_principal_name:
                    print(f"  Service Principal: {acl.service_principal_name}")

                print(f"  Permissions: {acl.all_permissions}")
                if acl.all_permissions:
                    for perm in acl.all_permissions:
                        print(f"    - Level: {perm.permission_level}")
                        print(f"      Inherited: {perm.inherited}")
                print()

    except Exception as e:
        print(f"Error checking permissions: {str(e)}")
        raise

if __name__ == "__main__":
    check_warehouse_permissions()
