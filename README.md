# Agentic E-Commerce

A Node.js e-commerce platform powered by LLM agents orchestrated with LangGraph, using Elasticsearch for data storage and Ollama for local LLM inference.

## Features

- **Multi-Agent System**: Specialized agents for pricing, inventory, and customer support
- **Elasticsearch Integration**: Full-text search and data persistence
- **Local LLM**: Uses Ollama with llama3.2:3b for natural language processing
- **Email Notifications**: Local SMTP integration with MailHog for testing
- **Type-Safe**: Built with TypeScript and Zod for runtime validation
- **Docker Ready**: Complete Docker Compose setup with all dependencies
- **RESTful API**: Express.js server with comprehensive agent endpoints

## Architecture

```
Express API Server
    ↓
Agent Orchestrator (Router)
    ├─ Pricing Agent → Elasticsearch (Products)
    ├─ Inventory Agent → Elasticsearch (Stock)
    └─ Support Agent → Elasticsearch (Tickets)
         ↓
    Ollama LLM Service
         ↓
    Email Service (SMTP)
```

## Prerequisites

### Local Development
- Node.js 20+
- npm
- Elasticsearch 8.0+ (running on localhost:9200)
- Ollama (running on localhost:11434)
- Models installed: `llama3.2:3b` and `nomic-embed-text`
- Local SMTP server (optional, or use MailHog)

### Docker Setup
- Docker & Docker Compose (recommended)

## Installation & Setup

### Local Development

1. **Clone and install dependencies**
```bash
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start Elasticsearch**
```bash
docker run -d \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  -p 9200:9200 \
  docker.elastic.co/elasticsearch/elasticsearch:8.10.0
```

4. **Start Ollama and pull models**
```bash
ollama serve &
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

5. **Start development server**
```bash
npm run dev
```

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up --build

# Services will be available at:
# - API: http://localhost:3000
# - Elasticsearch: http://localhost:9200
# - Ollama: http://localhost:11434
# - MailHog UI: http://localhost:8025
```

**Note**: On first run, Ollama will download the models (~5-10GB). This may take a while.

## Development

### Build
```bash
npm run build
```

### Run in development
```bash
npm run dev
```

### Run in production
```bash
npm start
```

### Lint
```bash
npm run lint
```

### Test
```bash
npm test
```

## API Endpoints

### Agents
- **POST** `/api/agents/process` - Route and process any request through appropriate agent
- **POST** `/api/agents/route` - Determine which agent should handle a query
- **POST** `/api/agents/pricing` - Direct pricing inquiry
- **POST** `/api/agents/inventory` - Direct inventory inquiry
- **POST** `/api/agents/support` - Direct support inquiry

### Products
- **GET** `/api/products/search?query=...` - Search products
- **GET** `/api/products/:id` - Get product details
- **POST** `/api/products` - Create new product

### Support
- **GET** `/api/support/tickets` - List support tickets (with filters)
- **GET** `/api/support/tickets/:id` - Get ticket details
- **PATCH** `/api/support/tickets/:id` - Update ticket status/priority

### Health
- **GET** `/health` - Health check

## Example Requests

### Process a Query
```bash
curl -X POST http://localhost:3000/api/agents/process \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the price of product X?",
    "context": {
      "customerEmail": "customer@example.com"
    }
  }'
```

### Create a Product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "stock": 50,
    "sku": "LAP-001",
    "category": "Electronics"
  }'
```

### Search Products
```bash
curl "http://localhost:3000/api/products/search?query=laptop&limit=10"
```

### Get Support Tickets
```bash
curl "http://localhost:3000/api/support/tickets?customerId=cust-123&status=open"
```

## Agent Types

### Pricing Agent
Handles price inquiries, bulk pricing, comparisons, and budget-based recommendations.

### Inventory Agent
Manages stock inquiries, low-stock alerts, restock recommendations, and availability checks.

### Support Agent
Creates and manages support tickets, prioritizes issues, and tracks resolutions.

## Email Templates

Supported email templates:
- `support_ticket_created` - Sent when a new ticket is created
- `support_ticket_resolved` - Sent when a ticket is resolved
- `pricing_inquiry` - Sent with pricing information
- `inventory_alert` - Sent for low stock alerts

## Docker Compose Services

| Service | Port | Purpose |
|---------|------|---------|
| app | 3000 | Express API |
| elasticsearch | 9200 | Data storage & search |
| ollama | 11434 | LLM inference |
| mailhog | 1025 (SMTP), 8025 (UI) | Email testing |

## Configuration

All configuration is managed through environment variables in `.env`:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_EMBED_MODEL=nomic-embed-text
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@agentic-ecommerce.local
```

## Project Structure

```
src/
├── api/              # Express routes and middleware
├── agents/           # Agent implementations
├── config/           # Configuration
├── orchestrator/     # Agent orchestration logic
├── services/         # External service integrations
├── types/            # TypeScript type definitions
├── utils/            # Utilities (logger, errors)
└── index.ts          # Application entry point
```

## Debugging

### View Logs
```bash
npm run dev  # Development logs with pretty formatting
```

### Elasticsearch Queries
```bash
curl http://localhost:9200/products/_search
curl http://localhost:9200/tickets/_search
```

### MailHog Email UI
Open http://localhost:8025 to view sent emails

### Ollama Models
```bash
curl http://localhost:11434/api/tags
```

## Troubleshooting

### Ollama Models Not Found
```bash
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

### Elasticsearch Connection Failed
Ensure Elasticsearch is running and accessible at the configured host/port.

### Email Not Sending
Check SMTP configuration and verify the email service is initialized.

## License

MIT
