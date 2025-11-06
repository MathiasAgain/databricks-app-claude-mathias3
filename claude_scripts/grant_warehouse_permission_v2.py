#!/usr/bin/env python3
"""
Grant SQL Warehouse permissions to a service principal using PATCH.
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
        # Use patch method to add just the new permission
        print(f"\nGranting 'CAN_USE' permission to {service_principal_name}...")

        client.permissions.update(
            request_object_type="warehouses",
            request_object_id=warehouse_id,
            access_control_list=[
                AccessControlRequest(
                    service_principal_name=service_principal_name,
                    permission_level=PermissionLevel.CAN_USE
                )
            ]
        )

        print("✓ Successfully granted warehouse permissions!")
        print(f"\nService principal {service_principal_name} can now use warehouse {warehouse_id}")

        # Verify the permission was added
        print("\nVerifying permissions...")
        perms = client.permissions.get(
            request_object_type="warehouses",
            request_object_id=warehouse_id
        )

        sp_found = False
        if perms.access_control_list:
            for acl in perms.access_control_list:
                if acl.service_principal_name == service_principal_name:
                    sp_found = True
                    print(f"  Found {service_principal_name} with permissions: {acl.all_permissions}")
                    break

        if sp_found:
            print("✓ Permission verification successful!")
        else:
            print("× Warning: Could not verify permission was added")

    except Exception as e:
        print(f"× Error granting permissions: {str(e)}")
        print(f"\nYou may need to grant permissions manually through the Databricks UI:")
        print(f"1. Go to SQL Warehouses")
        print(f"2. Open warehouse: {warehouse_id}")
        print(f"3. Go to Permissions tab")
        print(f"4. Add service principal: {service_principal_name}")
        print(f"5. Grant 'Can Use' permission")
        raise

if __name__ == "__main__":
    grant_warehouse_permission()
