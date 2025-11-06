#!/bin/bash
# Grant SQL Warehouse permissions via REST API

source .env.local

WAREHOUSE_ID="939811bf15d2854c"
SERVICE_PRINCIPAL="app-1b5gbx mathias-pse-test"

echo "Granting warehouse permissions..."
echo "  Warehouse ID: $WAREHOUSE_ID"
echo "  Service Principal: $SERVICE_PRINCIPAL"
echo ""

# PATCH request to add permission
echo "Adding CAN_USE permission..."
curl -X PATCH \
  "${DATABRICKS_HOST}/api/2.0/permissions/warehouses/${WAREHOUSE_ID}" \
  -H "Authorization: Bearer ${DATABRICKS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "access_control_list": [
      {
        "service_principal_name": "'"${SERVICE_PRINCIPAL}"'",
        "permission_level": "CAN_USE"
      }
    ]
  }' | python -m json.tool

echo ""
echo "Done! Verifying permissions..."

# GET request to verify
curl -X GET \
  "${DATABRICKS_HOST}/api/2.0/permissions/warehouses/${WAREHOUSE_ID}" \
  -H "Authorization: Bearer ${DATABRICKS_TOKEN}" \
  | python -m json.tool | grep -A10 "${SERVICE_PRINCIPAL}"
