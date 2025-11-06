#!/usr/bin/env python3
"""Upload app.yaml to workspace."""
import os
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.workspace import ImportFormat

def upload_app_yaml():
    """Upload app.yaml file to workspace."""
    client = WorkspaceClient(
        host=os.environ.get("DATABRICKS_HOST"),
        token=os.environ.get("DATABRICKS_TOKEN")
    )

    workspace_path = "/Workspace/Users/medelm@orkla.biz/databricks_apps/Apps/mathias-pse-test/app.yaml"
    local_path = "app.yaml"

    print(f"Uploading {local_path} to {workspace_path}...")

    with open(local_path, 'rb') as f:
        content = f.read()

    client.workspace.upload(
        path=workspace_path,
        content=content,
        overwrite=True,
        format=ImportFormat.AUTO
    )

    print("Upload successful!")

if __name__ == "__main__":
    upload_app_yaml()
