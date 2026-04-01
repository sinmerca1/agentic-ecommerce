#!/bin/bash

# Agent Control Center VPS Deployment Script
# This script pulls the latest code, builds, and deploys to Docker

set -e

echo "======================================"
echo "Agent Control Center Deployment"
echo "======================================"
echo ""

# Configuration
VPS_HOME="/root/agentic-ecommerce"
DOCKER_IMAGE="agentic-ecommerce-app"
DOCKER_CONTAINER="agentic-ecommerce"
API_PORT="8002"
DASHBOARD_PORT="9000"

# Check if running on VPS or local
if [ ! -d "$VPS_HOME" ]; then
  echo "❌ VPS directory not found at $VPS_HOME"
  echo "This script should be run on the VPS server"
  exit 1
fi

# Step 1: Pull latest code
echo "📥 Pulling latest code from GitHub..."
cd "$VPS_HOME"
git pull origin main
echo "✅ Code pulled successfully"
echo ""

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 3: Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo "✅ Build complete"
echo ""

# Step 4: Stop and remove old container
echo "🛑 Stopping old container..."
docker stop "$DOCKER_CONTAINER" 2>/dev/null || true
docker rm "$DOCKER_CONTAINER" 2>/dev/null || true
echo "✅ Old container removed"
echo ""

# Step 5: Rebuild Docker image
echo "🐳 Building Docker image..."
docker build -t "$DOCKER_IMAGE" .
echo "✅ Docker image built"
echo ""

# Step 6: Run new container
echo "🚀 Starting new container..."
docker run -d \
  --name "$DOCKER_CONTAINER" \
  -p "$API_PORT:3000" \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e ELASTICSEARCH_HOST=elasticsearch \
  -e ELASTICSEARCH_PORT=9200 \
  -e OLLAMA_BASE_URL=http://ollama:11434 \
  -e PRODUCTS_INDEX=gurrex_products \
  --network agentic-ecommerce_agentic-network \
  "$DOCKER_IMAGE"

echo "✅ Container started on port $API_PORT"
echo ""

# Step 7: Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 3

# Step 8: Verify deployment
echo "✅ Checking deployment..."
if curl -s http://localhost:$API_PORT/api/control/health > /dev/null; then
  echo "✅ API is responding"
else
  echo "⚠️  API not responding yet, container may still be starting..."
fi
echo ""

# Step 9: Dashboard setup
echo "📡 Setting up dashboard..."
cd "$VPS_HOME/dashboard"

# Kill any existing http.server process on port 9000
pkill -f "http.server.*$DASHBOARD_PORT" 2>/dev/null || true

# Start new server in background
nohup python3 -m http.server "$DASHBOARD_PORT" > /tmp/dashboard.log 2>&1 &
sleep 1

if curl -s http://localhost:$DASHBOARD_PORT > /dev/null; then
  echo "✅ Dashboard server started on port $DASHBOARD_PORT"
else
  echo "⚠️  Dashboard server may be starting..."
fi
echo ""

# Step 10: Summary
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "📊 Dashboard:"
echo "   URL: http://mail.mercadabra.com/control"
echo "   Local: http://localhost:$DASHBOARD_PORT"
echo ""
echo "🔌 API Endpoints:"
echo "   Health: curl http://localhost:$API_PORT/api/control/health"
echo "   Stats:  curl http://localhost:$API_PORT/api/control/stats"
echo "   Events: curl -N http://localhost:$API_PORT/api/control/events"
echo ""
echo "📋 Next Steps:"
echo "   1. Open http://mail.mercadabra.com/control in your browser"
echo "   2. Check system health status"
echo "   3. Create schedules via dashboard or:"
echo "      bash $VPS_HOME/scripts/setup-schedules.sh"
echo ""
echo "🔍 Troubleshooting:"
echo "   Logs: docker logs $DOCKER_CONTAINER"
echo "   Health: curl http://localhost:$API_PORT/api/control/health | jq"
echo ""
