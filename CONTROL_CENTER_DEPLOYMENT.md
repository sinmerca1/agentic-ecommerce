# Agent Control Center - VPS Deployment Guide

**Status**: Ready for Deployment  
**Time to Deploy**: ~10 minutes  
**Tested**: Yes (locally ✅)

---

## Quick Start

### Step 1: Pull Latest Code
```bash
cd /root/agentic-ecommerce
git pull origin main
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build
```bash
npm run build
```

### Step 4: Deploy Docker Container
```bash
# Stop old container
docker stop agentic-ecommerce
docker rm agentic-ecommerce

# Rebuild image
docker build -t agentic-ecommerce-app .

# Run new container
docker run -d \
  --name agentic-ecommerce \
  -p 8002:8002 \
  -e ELASTICSEARCH_HOST=elasticsearch \
  -e ELASTICSEARCH_PORT=9200 \
  -e OLLAMA_BASE_URL=http://ollama:11434 \
  -e PRODUCTS_INDEX=gurrex_products \
  --network agentic-ecommerce_agentic-network \
  agentic-ecommerce-app
```

### Step 5: Verify Deployment
```bash
# Check health
curl http://localhost:8002/api/control/health

# Check stats
curl http://localhost:8002/api/control/stats
```

### Step 6: Serve Dashboard

**Option A: Python (Quick)**
```bash
cd /root/agentic-ecommerce/dashboard
nohup python3 -m http.server 9000 > /dev/null 2>&1 &

# Access: http://mail.mercadabra.com:9000
```

**Option B: Nginx (Production)**
```bash
# Create config
cat > /etc/nginx/sites-available/agent-control << 'EOF'
server {
    listen 80;
    server_name mail.mercadabra.com;
    
    location /control {
        alias /root/agentic-ecommerce/dashboard;
        index index.html;
    }
    
    location /api/control {
        proxy_pass http://localhost:8002/api/control;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
    }
}
EOF

# Enable
ln -s /etc/nginx/sites-available/agent-control /etc/nginx/sites-enabled/
nginx -t && nginx -s reload
```

### Step 7: Access Dashboard
```
http://mail.mercadabra.com/control
```

---

## Full Deployment Script

```bash
#!/bin/bash

set -e

echo "=== Agent Control Center Deployment ==="
echo ""

# Step 1: Pull code
echo "📥 Pulling latest code..."
cd /root/agentic-ecommerce
git pull origin main

# Step 2: Install deps
echo "📦 Installing dependencies..."
npm install

# Step 3: Build
echo "🔨 Building TypeScript..."
npm run build

# Step 4: Stop old container
echo "🛑 Stopping old container..."
docker stop agentic-ecommerce || true
docker rm agentic-ecommerce || true

# Step 5: Build image
echo "🐳 Building Docker image..."
docker build -t agentic-ecommerce-app .

# Step 6: Run container
echo "🚀 Starting new container..."
docker run -d \
  --name agentic-ecommerce \
  -p 8002:8002 \
  -e ELASTICSEARCH_HOST=elasticsearch \
  -e ELASTICSEARCH_PORT=9200 \
  -e OLLAMA_BASE_URL=http://ollama:11434 \
  -e PRODUCTS_INDEX=gurrex_products \
  --network agentic-ecommerce_agentic-network \
  agentic-ecommerce-app

# Step 7: Verify
echo "✅ Checking deployment..."
sleep 3
curl -s http://localhost:8002/api/control/health | jq '.status'

# Step 8: Serve dashboard
echo "📡 Setting up dashboard..."
cd /root/agentic-ecommerce/dashboard
nohup python3 -m http.server 9000 > /dev/null 2>&1 &

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Dashboard: http://mail.mercadabra.com/control"
echo "API: http://localhost:8002/api/control"
echo "Health: curl http://localhost:8002/api/control/health"
```

Save as `/root/deploy-control-center.sh` and run:
```bash
chmod +x /root/deploy-control-center.sh
bash /root/deploy-control-center.sh
```

---

## Features Ready to Use

### 1. System Monitoring
- ✅ Ollama status
- ✅ Elasticsearch status
- ✅ Cache statistics
- ✅ Overall health indicator

### 2. Agent Control
- ✅ Manual trigger buttons
- ✅ Real-time execution logs
- ✅ Status updates via SSE

### 3. Scheduling
- ✅ Create cron schedules
- ✅ Manage existing schedules
- ✅ Track execution history
- ✅ Edit/delete schedules

### 4. Approvals
- ✅ Request tracking
- ✅ Approve/reject interface
- ✅ History
- ✅ Real-time notifications

### 5. Dashboard
- ✅ Beautiful terminal-style UI
- ✅ Real-time metrics
- ✅ Color-coded logs
- ✅ Responsive design

---

## API Endpoints (Already Implemented)

```bash
# Health check
GET /api/control/health

# Statistics
GET /api/control/stats

# Real-time events (SSE)
GET /api/control/events

# Approvals
GET /api/control/approvals
GET /api/control/approvals/pending
POST /api/control/approvals/:id/approve
POST /api/control/approvals/:id/reject

# Schedules
GET /api/control/schedules
POST /api/control/schedules
DELETE /api/control/schedules/:agent
```

---

## Testing

After deployment, test each endpoint:

```bash
# 1. Health
curl http://localhost:8002/api/control/health

# 2. Stats
curl http://localhost:8002/api/control/stats

# 3. Pending approvals
curl http://localhost:8002/api/control/approvals/pending

# 4. Schedules
curl http://localhost:8002/api/control/schedules

# 5. Dashboard (browser)
http://mail.mercadabra.com/control
```

---

## Next Steps (Optional)

### 1. Set Up Default Schedules
```bash
# Create pricing check at 8 AM daily
curl -X POST http://localhost:8002/api/control/schedules \
  -H "Content-Type: application/json" \
  -d '{ "agent": "pricing", "cron": "0 8 * * *" }'

# Create inventory check every 6 hours
curl -X POST http://localhost:8002/api/control/schedules \
  -H "Content-Type: application/json" \
  -d '{ "agent": "inventory", "cron": "0 */6 * * *" }'
```

### 2. Configure Nginx (Production)
Already included in setup above

### 3. Add Authentication (Optional)
```typescript
// Add to control.ts routes
const validateApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== process.env.CONTROL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.use(validateApiKey);
```

### 4. Enable HTTPS (Production)
```bash
# Use Let's Encrypt
certbot certonly --nginx -d mail.mercadabra.com
```

---

## Troubleshooting

### Dashboard not loading?
```bash
# Check Python server
ps aux | grep http.server

# Or kill and restart
pkill -f "http.server 9000"
cd /root/agentic-ecommerce/dashboard
python3 -m http.server 9000 &
```

### API not responding?
```bash
# Check container status
docker ps | grep agentic

# Check logs
docker logs agentic-ecommerce

# Test endpoint
curl http://localhost:8002/api/control/health
```

### SSE not connecting?
```bash
# Verify endpoint
curl -i -N http://localhost:8002/api/control/events

# Check CORS headers
curl -i http://localhost:8002/api/control/events
```

---

## Files Deployed

```
/root/agentic-ecommerce/
├── dashboard/
│   └── index.html              ← Web interface
├── src/
│   ├── api/routes/
│   │   └── control.ts          ← API endpoints
│   └── services/
│       ├── approvals.ts        ← Approval workflow
│       └── scheduler.ts        ← Task scheduling
├── scripts/
│   └── setup-schedules.sh      ← Schedule setup helper
└── AGENT_CONTROL_CENTER.md     ← Full documentation
```

---

## Verification Checklist

After deployment, verify:

- [ ] Container is running: `docker ps | grep agentic`
- [ ] Health endpoint responds: `curl http://localhost:8002/api/control/health`
- [ ] Stats endpoint works: `curl http://localhost:8002/api/control/stats`
- [ ] Dashboard loads: Browse to `http://mail.mercadabra.com/control`
- [ ] Real-time metrics appear
- [ ] Manual agent buttons work
- [ ] Activity log updates

---

## Support

For issues or questions:
1. Check logs: `docker logs agentic-ecommerce`
2. Verify endpoints: `curl http://localhost:8002/api/control/health`
3. Review docs: `/root/agentic-ecommerce/AGENT_CONTROL_CENTER.md`
4. Check GitHub: Latest code at `sinmerca1/agentic-ecommerce`

---

**Status**: Ready to Deploy ✅  
**Estimated Deployment Time**: 10 minutes  
**Rollback**: Just pull previous commit and redeploy  

