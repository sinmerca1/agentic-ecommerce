# Quick Start Guide

## Option 1: Docker Compose (Recommended)

### Start Everything
```bash
docker-compose up --build
```

This starts:
- **API Server**: http://localhost:3000
- **Elasticsearch**: http://localhost:9200
- **Ollama**: http://localhost:11434 (with model downloads)
- **MailHog**: http://localhost:8025 (email testing UI)

### First Time Setup
The first run will download Ollama models (~5-10GB). This takes 5-15 minutes depending on your internet speed.

### Test the API
```bash
# Check health
curl http://localhost:3000/health

# Create a product
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

# Ask the pricing agent
curl -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the price of a wireless mouse?",
    "context": {
      "customerEmail": "test@example.com"
    }
  }'

# Check support tickets
curl http://localhost:3000/api/support/tickets
```

## Option 2: Local Development

### Prerequisites
- Node.js 20+
- Elasticsearch running on localhost:9200
- Ollama running on localhost:11434 with models installed
- Optional: Local SMTP or MailHog for email

### Setup
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev
```

## Agent Types

### 1. Pricing Agent
Ask questions about product prices, bulk pricing, or get price recommendations.

**Example:**
```bash
curl -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How much does a wireless mouse cost?",
    "context": {
      "customerEmail": "customer@example.com",
      "customerId": "cust-123"
    }
  }'
```

### 2. Inventory Agent
Check stock levels, get availability updates, and receive low-stock alerts.

**Example:**
```bash
curl -X POST http://localhost:3000/api/agents/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Is the wireless mouse in stock?",
    "context": {
      "lowStockThreshold": 5,
      "managerEmail": "manager@example.com"
    }
  }'
```

### 3. Support Agent
Create support tickets and get help with issues.

**Example:**
```bash
curl -X POST http://localhost:3000/api/agents/support \
  -H "Content-Type: application/json" \
  -d '{
    "query": "My order hasn'\''t arrived yet. Can you help?",
    "context": {
      "customerEmail": "customer@example.com",
      "customerId": "cust-123",
      "orderId": "order-456"
    }
  }'
```

## Smart Routing

The system automatically routes queries to the appropriate agent. Just use the generic `/process` endpoint:

```bash
curl -X POST http://localhost:3000/api/agents/process \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What'\''s the price of wireless mice in bulk?",
    "context": {
      "customerEmail": "bulk-buyer@example.com"
    }
  }'
```

## Database Management

### View Elasticsearch Data
```bash
# All products
curl http://localhost:9200/products/_search

# All support tickets
curl http://localhost:9200/tickets/_search

# Search for a specific product
curl -X POST http://localhost:9200/products/_search \
  -H "Content-Type: application/json" \
  -d '{"query": {"match": {"name": "mouse"}}}'
```

## Email Testing

Check sent emails in MailHog UI: http://localhost:8025

Or via API:
```bash
curl http://localhost:8025/api/v1/messages
```

## Troubleshooting

### Ollama Models Stuck
If Ollama seems stuck downloading models, check logs:
```bash
docker-compose logs ollama
```

### Elasticsearch Connection Error
Ensure Elasticsearch is running and healthy:
```bash
curl http://localhost:9200/_cluster/health
```

### API Not Responding
Check API logs:
```bash
docker-compose logs app
```

## Next Steps

1. **Customize Agents**: Edit files in `src/agents/` to add agent-specific logic
2. **Add More Products**: Use the products API to seed your database
3. **Configure Email**: Update SMTP settings for production
4. **Add Authentication**: Implement auth middleware in `src/api/middleware/`
5. **Extend Models**: Add more Ollama models for specialized tasks

## Commands Reference

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Compile TypeScript
npm run lint             # Check code style

# Docker
docker-compose up        # Start services
docker-compose down      # Stop services
docker-compose logs -f   # Follow logs
docker-compose ps        # Show running services

# Production
npm start                 # Run compiled app
npm run docker:build      # Build production image
```

## Documentation

- Full API documentation: See README.md
- Agent implementation: See src/agents/
- Type definitions: See src/types/index.ts
- Configuration: See .env.example
