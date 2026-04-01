#!/bin/bash

# Setup default schedules for agents
# This script configures automated agent runs

API_URL="http://localhost:8002/api/control"

echo "Setting up default agent schedules..."

# Pricing agent - Daily at 8 AM
echo "📅 Scheduling pricing agent daily at 8 AM..."
curl -X POST "$API_URL/schedules" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "pricing",
    "cron": "0 8 * * *"
  }' | jq .

# Inventory agent - Every 6 hours
echo "📅 Scheduling inventory agent every 6 hours..."
curl -X POST "$API_URL/schedules" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "inventory",
    "cron": "0 */6 * * *"
  }' | jq .

# Support agent - Every 30 minutes
echo "📅 Scheduling support agent every 30 minutes..."
curl -X POST "$API_URL/schedules" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "support",
    "cron": "*/30 * * * *"
  }' | jq .

echo ""
echo "✅ Default schedules configured!"
echo ""
echo "View schedules: curl http://localhost:8002/api/control/schedules"
echo "View dashboard: http://mail.mercadabra.com/control"
