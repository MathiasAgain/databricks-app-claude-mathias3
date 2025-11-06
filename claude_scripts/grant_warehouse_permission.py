#!/usr/bin/env python3
"""
Grant SQL Warehouse permissions to a service principal.
"""
import os
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.iam import AccessControlRequest, PermissionLevel

def grant_warehouse_permission():
    """Grant Can Use permission on warehouse to service principal."""

    # Initialize client
    client = WorkspaceClient(
        host=os.environ.get("DATABRICKS_HOST"),
        token=os.environ.get("DATABRICKS_TOKEN")
    )

    warehouse_id = "939811bf15d2854c"
    service_principal_name = "app-1b5gbx mathias-pse-test"

    print(f"Granting warehouse permissions...")
    print(f"  Warehouse ID: {warehouse_id}")
    print(f"  Service Principal: {service_principal_name}")

    try:
        # Get current permissions
        print("\nFetching current permissions...")
        current_perms = client.permissions.get(
            request_object_type="warehouses",
            request_object_id=warehouse_id
        )
        print(f"  Current permissions retrieved")
        print(f"  Current access control list: {len(current_perms.access_control_list)} entries")

        # Update permissions to add service principal with CAN_USE permission
        print(f"\nGranting 'CAN_USE' permission to {service_principal_name}...")

        # Build new access control list including existing permissions
        new_acl = list(current_perms.access_control_list) if current_perms.access_control_list else []
        new_acl.append(
            AccessControlRequest(
                service_principal_name=service_principal_name,
                permission_level=PermissionLevel.CAN_USE
            )
        )

        client.permissions.update(
            request_object_type="warehouses",
            request_object_id=warehouse_id,
            access_control_list=new_acl
        )

        print("✅ Successfully granted warehouse permissions!")
        print(f"\nService principal {service_principal_name} can now use warehouse {warehouse_id}")

    except Exception as e:
        print(f"❌ Error granting permissions: {str(e)}")
        print(f"\nYou may need to grant permissions manually through the Databricks UI:")
        print(f"1. Go to SQL Warehouses")
        print(f"2. Open warehouse: {warehouse_id}")
        print(f"3. Go to Permissions tab")
        print(f"4. Add service principal: {service_principal_name}")
        print(f"5. Grant 'Can Use' permission")
        raise

if __name__ == "__main__":
    grant_warehouse_permission()
