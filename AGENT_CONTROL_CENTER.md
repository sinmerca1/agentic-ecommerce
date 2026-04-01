# Agent Control Center - Complete Setup Guide

**Status**: Ready for Implementation  
**Date**: 2026-04-01  
**Features**: Automation, Scheduling, Approvals, Real-time Monitoring

---

## Overview

The Agent Control Center is a web-based dashboard that allows you to:

✅ **Monitor** - Real-time system health (Ollama, Elasticsearch, Cache)  
✅ **Control** - Manually trigger any agent on-demand  
✅ **Schedule** - Automate agents with cron expressions  
✅ **Approve** - Review and approve/reject agent actions  
✅ **Log** - Real-time activity stream with 500-entry history

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Browser Dashboard                          │
│                  (dashboard/index.html)                     │
│  - Real-time stats via SSE                                 │
│  - Manual agent controls                                   │
│  - Schedule management                                     │
│  - Approval workflow                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
        ┌───────────────────────────────────────┐
        │  /api/control (Control Routes)        │
        ├───────────────────────────────────────┤
        │ GET /health        - System health    │
        │ GET /stats         - Dashboard stats  │
        │ GET /events        - SSE stream       │
        │ GET /approvals     - All approvals    │
        │ POST /approvals/:id/approve           │
        │ POST /approvals/:id/reject            │
        │ GET/POST /schedules                   │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │     Core Services (Backend)           │
        ├───────────────────────────────────────┤
        │ ApprovalService (src/services)        │
        │ - Request, approve, reject            │
        │ - EventEmitter for SSE                │
        │                                       │
        │ Scheduler (src/services)              │
        │ - Cron scheduling (node-cron)         │
        │ - Track executions                    │
        │                                       │
        │ Cache, Elasticsearch, Ollama          │
        │ - Product data                        │
        │ - LLM inference                       │
        └───────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Add Dependencies

```bash
cd /root/agentic-ecommerce
npm install node-cron
```

### Step 2: Build and Deploy

```bash
# Build the application
npm run build

# Stop and remove old container
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

### Step 3: Serve Dashboard

**Option 1: Python Simple Server (Quick)**
```bash
cd /root/agentic-ecommerce/dashboard
nohup python3 -m http.server 9000 > /dev/null 2>&1 &
```

**Option 2: Nginx (Production)**
```bash
# Create nginx config
cat > /etc/nginx/sites-available/agent-control << 'EOF'
server {
    listen 80;
    server_name mail.mercadabra.com;
    
    location /control {
        alias /root/agentic-ecommerce/dashboard;
        index index.html;
        try_files $uri /index.html;
    }
    
    location /api/control {
        proxy_pass http://localhost:8002/api/control;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # SSE settings
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
    }
}
EOF

# Enable and reload
ln -s /etc/nginx/sites-available/agent-control /etc/nginx/sites-enabled/
nginx -t && nginx -s reload
```

### Step 4: Access Dashboard

```
http://mail.mercadabra.com/control
```

---

## Features

### 1. System Status

**Display**:
- ✅ Ollama connection status
- ✅ Elasticsearch connection status
- ✅ Cache entries count
- ✅ Scheduled tasks count
- ✅ Pending approvals count
- ✅ Overall system health

**Updates**: Every 10 seconds

### 2. Manual Agent Controls

**Available Agents**:
- 💰 Pricing Agent
- 📦 Inventory Agent
- 💬 Support Agent
- ⚙️ Process Agent

**Action**: Click button → Agent runs immediately → Log shows result

### 3. Schedule Management

**Create Schedule**:
```
Agent: [pricing, inventory, support]
Cron: [e.g., "0 8 * * *" = Daily at 8 AM]
```

**Cron Format**:
```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6) (0 = Sunday)
│ │ │ │ │
│ │ │ │ │
* * * * *

Examples:
- "0 8 * * *"      = Daily at 8 AM
- "0 */6 * * *"    = Every 6 hours
- "*/30 * * * *"   = Every 30 minutes
- "0 0 1 * *"      = First day of month
```

**View Schedules**: Displays in real-time with last execution time

### 4. Approval Workflow

**When Approval Needed**:
- High-impact agent actions (bulk updates, deletions)
- Configuration changes
- System-wide operations

**Approval Request Shows**:
- Agent name
- Action description
- Details (truncated JSON)
- Timestamp
- Two buttons: ✅ Approve / ❌ Reject

**After Decision**:
- Status updated instantly
- Log entry created
- SSE notification to all connected clients

### 5. Real-time Activity Log

**Entries Include**:
- [HH:MM:SS] Agent triggered
- [HH:MM:SS] Agent completed
- [HH:MM:SS] Approval requested
- [HH:MM:SS] Status updates

**Features**:
- 500-entry buffer (older entries removed)
- Color-coded by type (info, warning, error, approval)
- Auto-scroll to latest
- Clear button for cleanup
- Timestamps in local time

---

## API Endpoints

### Control Center API (`/api/control`)

#### Health Check
```bash
GET /api/control/health

Response:
{
  "status": "healthy" | "degraded",
  "checks": {
    "elasticsearch": { "status": "connected" },
    "ollama": { "status": "connected" },
    "cache": { "status": "active", "entries": 15 }
  }
}
```

#### Dashboard Stats
```bash
GET /api/control/stats

Response:
{
  "approvals": {
    "total": 5,
    "pending": 1,
    "approved": 3,
    "rejected": 1
  },
  "cache": {
    "entries": 42,
    "ttl": 300000
  },
  "schedules": 3
}
```

#### Real-time Events (SSE)
```bash
GET /api/control/events

Events:
- heartbeat: System alive (every 30 seconds)
- approval: New approval requested
- approval-updated: Approval status changed
- connect: Initial connection
```

#### Approvals Management
```bash
# Get pending approvals
GET /api/control/approvals/pending

# Get all approvals
GET /api/control/approvals

# Approve request
POST /api/control/approvals/:id/approve
Body: { "approvedBy": "username" }

# Reject request
POST /api/control/approvals/:id/reject
Body: { "rejectedBy": "username" }
```

#### Schedule Management
```bash
# List schedules
GET /api/control/schedules

Response:
[
  {
    "agent": "pricing",
    "cronExpression": "0 8 * * *",
    "nextRun": "2026-04-02T08:00:00Z",
    "lastRun": "2026-04-01T08:00:00Z",
    "executions": 5
  }
]

# Create schedule
POST /api/control/schedules
Body: {
  "agent": "pricing",
  "cron": "0 8 * * *"
}

# Delete schedule
DELETE /api/control/schedules/:agent
```

---

## Usage Examples

### 1. Set Up Daily Price Check

```bash
curl -X POST http://localhost:8002/api/control/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "pricing",
    "cron": "0 8 * * *"
  }'
```

### 2. Check Pending Approvals

```bash
curl http://localhost:8002/api/control/approvals/pending | jq .
```

### 3. Approve Request

```bash
curl -X POST http://localhost:8002/api/control/approvals/abc123/approve \
  -H "Content-Type: application/json" \
  -d '{ "approvedBy": "admin" }'
```

### 4. Monitor System Health

```bash
curl http://localhost:8002/api/control/health | jq .
```

---

## Workflow: Automatic Scheduling

### Example: Daily Inventory Check

1. **Setup Phase** (Done once):
   ```bash
   # Dashboard → Schedule Management → Select "inventory" agent → Enter "0 6 * * *" → Set Schedule
   ```

2. **Automatic Phase** (Daily at 6 AM):
   - Scheduler triggers inventory agent
   - Agent searches products, checks stock
   - Results logged in database
   - Report email sent
   - Dashboard shows execution in Activity Log

3. **Approval Phase** (If needed):
   - Agent requires approval for bulk actions
   - Approval request created
   - Dashboard shows pending approval
   - Admin reviews and approves/rejects
   - Agent continues or stops based on decision

4. **Monitoring**:
   - Dashboard shows real-time status
   - Activity Log records all events
   - SSE stream updates all connected clients

---

## Workflow: Manual Control

### Example: Emergency Pricing Update

1. **Trigger**:
   ```
   Dashboard → Agent Controls → Click "💰 Pricing Agent"
   ```

2. **Execution**:
   - Agent runs immediately
   - Searches all products
   - Updates pricing data
   - Returns results

3. **Approval** (if configured):
   - If changes exceed threshold
   - Approval request shown
   - Admin must approve before changes apply

4. **Result**:
   - Activity Log shows status
   - Dashboard updates automatically
   - Real-time via SSE

---

## Default Schedules (Optional Setup)

Run this script to set up default schedules:

```bash
bash /root/agentic-ecommerce/scripts/setup-schedules.sh
```

**Default Configuration**:
- **Pricing**: Daily at 8 AM (0 8 * * *)
- **Inventory**: Every 6 hours (0 */6 * * *)
- **Support**: Every 30 minutes (*/30 * * * *)

---

## Monitoring

### Real-time Dashboard Metrics

- **Cache Hits/Misses**: Monitor caching effectiveness
- **Agent Executions**: Track automation runs
- **Approval Queue**: Monitor pending decisions
- **System Health**: Ollama, Elasticsearch, Cache status
- **Scheduled Tasks**: Next run times, last execution

### Activity Log Analysis

Filter by entry type:
- 🟢 **Info**: Normal operations
- 🟡 **Warning**: Potential issues
- 🔴 **Error**: Failed operations
- 🔵 **Approval**: Decision needed

---

## Troubleshooting

### Dashboard Not Loading

```bash
# Check if backend is running
curl http://localhost:8002/api/control/health

# Check nginx config
nginx -t

# Check Python server
ps aux | grep http.server
```

### SSE Not Connecting

```bash
# Check if endpoint is accessible
curl -N http://localhost:8002/api/control/events

# Check CORS headers
curl -i http://localhost:8002/api/control/events
```

### Schedules Not Running

```bash
# Check scheduled tasks
curl http://localhost:8002/api/control/schedules

# Check logs
docker logs agentic-ecommerce | grep "Running scheduled"

# Verify cron expression
# Use online cron validators: https://crontab.guru/
```

### Approvals Not Appearing

```bash
# Check pending approvals API
curl http://localhost:8002/api/control/approvals/pending

# Check if approvals service is initialized
# Verify in application logs
docker logs agentic-ecommerce | grep "approval"
```

---

## Security Considerations

### For Production:

1. **Authentication**: Add API key validation
   ```typescript
   // Middleware to check API key
   const validateApiKey = (req, res, next) => {
     const key = req.headers['x-api-key'];
     if (key !== process.env.CONTROL_API_KEY) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     next();
   };
   ```

2. **Rate Limiting**: Prevent abuse
   ```bash
   npm install express-rate-limit
   ```

3. **HTTPS**: Always use HTTPS in production
   ```bash
   # Nginx SSL configuration
   ssl_certificate /path/to/cert.pem;
   ssl_certificate_key /path/to/key.pem;
   ```

4. **Access Control**: Restrict dashboard to internal IPs
   ```bash
   # Allow only VPC IPs
   allow 10.0.0.0/8;
   deny all;
   ```

---

## Future Enhancements

- [ ] User authentication and roles
- [ ] Webhook notifications (Slack, Discord)
- [ ] Custom approval rules based on agent/action
- [ ] Dashboard persistence (store settings)
- [ ] Advanced filtering/search in activity log
- [ ] Export reports (CSV, PDF)
- [ ] Metrics dashboard (Prometheus integration)
- [ ] Rollback capability for agent actions
- [ ] Multi-user approval chain
- [ ] Agent performance analytics

---

## Summary

The Agent Control Center provides:

✅ **Visibility** - See what agents are doing in real-time  
✅ **Control** - Trigger agents manually or on schedule  
✅ **Governance** - Approve critical actions before execution  
✅ **Automation** - Run agents on cron schedule without manual intervention  
✅ **Monitoring** - Track system health and activity  

**Access**: `http://mail.mercadabra.com/control`  
**API**: `http://localhost:8002/api/control`  
**Implementation Time**: ~15 minutes (build + deploy)

---

**Status**: Ready to Deploy ✅  
**Tested**: Yes (locally)  
**Production Ready**: With security additions (see section above)

