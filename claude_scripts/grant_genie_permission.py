#!/usr/bin/env python3
"""Grant Genie Space permissions to service principal."""
import os
from databricks.sdk import WorkspaceClient

client = WorkspaceClient(
    host=os.environ.get("DATABRICKS_HOST"),
    token=os.environ.get("DATABRICKS_TOKEN")
)

space_id = "01f0a834208e13dab88b1fd3f7d718c0"
service_principal_name = "app-1b5gbx mathias-pse-test"

print(f"Granting Genie Space permission...")
print(f"  Space ID: {space_id}")
print(f"  Service Principal: {service_principal_name}")

try:
    # Try to grant permission using the permissions API
    from databricks.sdk.service.iam import AccessControlRequest, PermissionLevel

    client.permissions.update(
        request_object_type="genie",
        request_object_id=f"spaces/{space_id}",
        access_control_list=[
            AccessControlRequest(
                service_principal_name=service_principal_name,
                permission_level=PermissionLevel.CAN_USE
            )
        ]
    )

    print("[SUCCESS] Permission granted successfully!")

except Exception as e:
    print(f"[ERROR] Error: {str(e)}")
    print("\nYou need to manually grant permission in the Databricks UI:")
    print(f"1. Go to Genie Spaces")
    print(f"2. Open space: {space_id}")
    print(f"3. Click 'Share' or 'Permissions'")
    print(f"4. Add service principal: {service_principal_name}")
    print(f"5. Grant 'Can Use' permission")
