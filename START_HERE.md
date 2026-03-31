# 🚀 START HERE - Agentic E-Commerce Platform

Welcome! This is a **production-ready multi-agent e-commerce system** powered by local LLMs.

## ⚡ Quick Start (2 minutes)

### Option A: Docker (Recommended)
```bash
docker-compose up --build
```
That's it! Everything starts automatically.

### Option B: Local Development
```bash
npm install
npm run dev
```

## 🎯 What Just Started?

| Service | URL | Purpose |
|---------|-----|---------|
| **API Server** | http://localhost:3000 | Your e-commerce agent system |
| **MailHog** | http://localhost:8025 | View test emails |
| **Elasticsearch** | http://localhost:9200 | Data storage |
| **Ollama** | http://localhost:11434 | LLM inference |

## 📝 First Thing: Test It

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "description": "Ergonomic wireless mouse",
    "price": 29.99,
    "stock": 100,
    "sku": "MOUSE-001",
    "category": "Electronics"
  }'

# 3. Ask the AI agents
curl -X POST http://localhost:3000/api/agents/process \
  -H "Content-Type: application/json" \
  -d '{"query": "What wireless mice do you have?"}'
```

## 📚 Documentation (Choose Your Path)

### 🏃 I Want to Get Started NOW
→ Read **QUICKSTART.md** (5 min read)
- Copy-paste examples
- Test all features
- Email testing with MailHog

### 📖 I Want to Understand the System
→ Read **README.md** (15 min read)
- Full feature list
- Complete API documentation
- Troubleshooting guide

### 🏗️ I Want to Understand How It Works
→ Read **ARCHITECTURE.md** (20 min read)
- System design
- Data flows
- Component descriptions
- Scaling notes

### 🚢 I Want to Deploy to Production
→ Read **DEPLOYMENT.md** (30 min read)
- Kubernetes setup
- AWS ECS
- Docker deployment
- Security hardening

### 🧪 I Want to Test Everything
→ Read **TESTING.md** (20 min read)
- Integration tests
- Stress testing
- Performance benchmarks
- CI/CD examples

### 📋 I Want a High-Level Overview
→ Read **PROJECT_SUMMARY.md** (10 min read)
- Quick feature list
- Tech stack
- Architecture overview
- Statistics

## 🤖 Three Specialized AI Agents

### 1. **Pricing Agent** 💰
Handles: Product pricing, bulk quotes, budget recommendations
```bash
curl -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{"query": "What are your prices?"}'
```

### 2. **Inventory Agent** 📦
Handles: Stock checks, low-stock alerts, availability
```bash
curl -X POST http://localhost:3000/api/agents/inventory \
  -H "Content-Type: application/json" \
  -d '{"query": "What'\''s in stock?"}'
```

### 3. **Support Agent** 🎟️
Handles: Customer support, ticket creation, escalation
```bash
curl -X POST http://localhost:3000/api/agents/support \
  -H "Content-Type: application/json" \
  -d '{"query": "My order hasn'\''t arrived"}'
```

## 🔧 Technology Stack

```
Frontend ──→ Express.js (API Server)
              ↓
         Agent Router
         (Auto-detects which agent to use)
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
  Pricing  Inventory  Support
   Agent    Agent     Agent
    ↓         ↓         ↓
    └─────────┼─────────┘
              ↓
          Ollama LLM
       (llama3.2:3b)
              ↓
    ┌─────────┼──────────┬──────────┐
    ↓         ↓          ↓          ↓
Elasticsearch Email   Logging   Validation
  (Data)   (Emails)  (Tracing)   (Types)
```

## 📊 Key Features

✅ **Multi-Agent System** - 3 specialized AI agents
✅ **Type Safe** - Full TypeScript + Zod validation
✅ **Local LLM** - Ollama with llama3.2:3b
✅ **Smart Routing** - Automatically picks the right agent
✅ **Email Notifications** - Integrated email system
✅ **Full Text Search** - Elasticsearch for products
✅ **Docker Ready** - One command deployment
✅ **Production Ready** - Error handling, logging, monitoring
✅ **Well Documented** - 5 comprehensive guides

## 🔌 API Endpoints at a Glance

**Agent Processing:**
- `POST /api/agents/process` - Let AI pick the right agent
- `POST /api/agents/pricing` - Ask pricing agent
- `POST /api/agents/inventory` - Ask inventory agent
- `POST /api/agents/support` - Ask support agent

**Product Management:**
- `GET /api/products/search?query=...` - Search products
- `POST /api/products` - Add new product

**Support Tickets:**
- `GET /api/support/tickets` - View all tickets
- `PATCH /api/support/tickets/:id` - Update ticket status

**System:**
- `GET /health` - Health check

## 🎓 Learning Path

1. **Day 1** - Get it running
   - Start with Docker Compose
   - Read QUICKSTART.md
   - Test with curl examples
   - Check MailHog for emails

2. **Day 2** - Understand the system
   - Read ARCHITECTURE.md
   - Look at agent code in `src/agents/`
   - Review API routes in `src/api/routes/`
   - Test different queries

3. **Day 3** - Customize for your needs
   - Modify agent system prompts
   - Add new email templates
   - Create custom agents
   - Add authentication

4. **Day 4** - Deploy to production
   - Follow DEPLOYMENT.md
   - Choose your platform (Docker/K8s/AWS)
   - Configure environment variables
   - Set up monitoring

## 🐛 Troubleshooting

### Services won't start?
```bash
docker-compose logs
docker-compose down -v  # Reset volumes
docker-compose up --build
```

### Can't connect to API?
```bash
curl http://localhost:3000/health
docker-compose ps
```

### Models not loading?
```bash
docker-compose exec ollama ollama pull llama3.2:3b
docker-compose exec ollama ollama pull nomic-embed-text
```

### Email not working?
- Check MailHog UI: http://localhost:8025
- Look at logs: `docker-compose logs app`

**Still stuck?** See "Troubleshooting" section in README.md

## 📂 What's Inside

```
agentic-ecommerce/
├── src/                    # TypeScript source
│   ├── agents/            # AI agents (pricing, inventory, support)
│   ├── api/               # Express API routes
│   ├── services/          # Elasticsearch, Ollama, Email
│   ├── config/            # Configuration
│   └── types/             # Type definitions
├── docker-compose.yml     # Start everything
├── package.json           # Dependencies
├── README.md              # Complete docs
├── QUICKSTART.md          # Fast start
├── ARCHITECTURE.md        # How it works
├── DEPLOYMENT.md          # Production setup
├── TESTING.md             # Test guide
└── PROJECT_SUMMARY.md     # Overview
```

## 🚀 Common Tasks

### Add a new product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Product",
    "description": "Description",
    "price": 99.99,
    "stock": 50,
    "sku": "NEW-001",
    "category": "Electronics"
  }'
```

### Search products
```bash
curl "http://localhost:3000/api/products/search?query=mouse&limit=10"
```

### Create support ticket
```bash
curl -X POST http://localhost:3000/api/agents/support \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I need help with my order",
    "context": {
      "customerId": "cust-123",
      "customerEmail": "customer@example.com"
    }
  }'
```

### View support tickets
```bash
curl http://localhost:3000/api/support/tickets
```

### Update ticket status
```bash
curl -X PATCH http://localhost:3000/api/support/tickets/TICKET_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved", "priority": "high"}'
```

## 💡 Pro Tips

1. **Use curl for testing**: All examples provided
2. **Check MailHog for emails**: http://localhost:8025
3. **Query Elasticsearch directly**: http://localhost:9200
4. **View logs**: `docker-compose logs -f app`
5. **Scale with Docker**: `docker-compose up -d --scale app=3`

## 🎯 Next Steps

1. ✅ Start the system: `docker-compose up --build`
2. ✅ Test it: Use curl examples from QUICKSTART.md
3. ✅ Read docs: Choose from the path above
4. ✅ Customize: Modify agents and prompts
5. ✅ Deploy: Follow DEPLOYMENT.md when ready

## 📞 Quick Reference

| Need | File | Time |
|------|------|------|
| Get started now | QUICKSTART.md | 5 min |
| Full API docs | README.md | 15 min |
| How it works | ARCHITECTURE.md | 20 min |
| Deploy to prod | DEPLOYMENT.md | 30 min |
| Test everything | TESTING.md | 20 min |
| High-level view | PROJECT_SUMMARY.md | 10 min |

---

**Status**: ✅ Ready to use
**Version**: 1.0.0
**Last Updated**: 2026-03-31

**Start with Docker:** `docker-compose up --build` 🚀

Questions? Check the appropriate documentation file above!
