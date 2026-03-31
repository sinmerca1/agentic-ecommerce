# System Architecture

## Overview

The Agentic E-Commerce system is a multi-agent orchestration platform built with Node.js, TypeScript, and LangGraph.js. It provides intelligent e-commerce operations through specialized agents that handle pricing, inventory, and customer support.

```
┌─────────────────────────────────────────────────────────────┐
│                     Express.js API Server                    │
│                       (Port 3000)                            │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │ Agent Routing  │
         │   & Handling   │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐  ┌────▼────┐  ┌───▼────┐
│Pricing│  │Inventory│  │Support │
│Agent  │  │Agent    │  │Agent   │
└───┬───┘  └────┬────┘  └───┬────┘
    │           │           │
    └───────────┼───────────┘
                │
        ┌───────▼────────┐
        │ Ollama LLM     │
        │ llama3.2:3b    │
        │ Embeddings     │
        └───────┬────────┘
                │
    ┌───────────┼──────────────────┬──────────────┐
    │           │                  │              │
┌───▼──────┐ ┌─▼─────┐ ┌──────────▼┐  ┌────────▼─┐
│Elasticsh.│ │Email  │ │Message    │  │Errors &  │
│(Products,│ │SMTP   │ │Logging    │  │Validation│
│Tickets)  │ │Service│ │& Tracing  │  │(Zod)     │
└──────────┘ └───────┘ └───────────┘  └──────────┘
```

## Component Layers

### 1. API Layer (`src/api/`)
Entry point for all client requests.

**Files:**
- `index.ts` - Express app setup, middleware configuration
- `routes/agents.ts` - Agent processing endpoints
- `routes/products.ts` - Product management
- `routes/support.ts` - Support ticket management
- `middleware/errorHandler.ts` - Error handling & request logging

**Key Features:**
- Request validation with Zod
- Unified error handling
- Request/response logging
- Health check endpoint

### 2. Agent Orchestration (`src/orchestrator/`)
Intelligent request routing and agent coordination.

**Files:**
- `graph.ts` - AgentOrchestrator class

**Key Features:**
- Query classification and routing
- Agent selection logic
- Execution history tracking
- Multi-agent workflow support

### 3. Agent Implementations (`src/agents/`)
Specialized agents for different business domains.

**Files:**
- `base.ts` - BaseAgent abstract class with common functionality
- `pricing.ts` - Pricing inquiries and product recommendations
- `inventory.ts` - Stock management and availability
- `support.ts` - Customer support and ticket creation

**Agent Responsibilities:**

| Agent | Capabilities |
|-------|--------------|
| **Pricing Agent** | Price lookups, bulk pricing, budget recommendations, promotional info |
| **Inventory Agent** | Stock checks, low-stock alerts, restock suggestions, alternatives |
| **Support Agent** | Ticket creation, issue tracking, priority assessment, escalation |

### 4. Services Layer (`src/services/`)
Integration with external systems.

**Files:**
- `elasticsearch.ts` - Data storage, search, and indexing
- `ollama.ts` - LLM inference and embeddings
- `email.ts` - SMTP integration and templates

**Service Responsibilities:**

| Service | Purpose |
|---------|---------|
| **Elasticsearch** | Full-text search, document indexing, query operations |
| **Ollama** | Text generation, embeddings, LLM inference |
| **Email** | SMTP operations, template rendering, notifications |

### 5. Utilities (`src/utils/`)
Common utilities and helpers.

**Files:**
- `logger.ts` - Structured logging with Pino
- `errors.ts` - Custom error classes with status codes

### 6. Configuration (`src/config/`, `.env`)
Environment management with Zod validation.

**Features:**
- Runtime validation of environment variables
- Type-safe configuration object
- Defaults for all settings

### 7. Type System (`src/types/`)
Zod-based type definitions with runtime validation.

**Key Types:**
- `AgentState` - Agent execution state and messages
- `Message` - Conversation messages
- `Product` - Product data structure
- `SupportTicket` - Support request tracking
- `AgentRequest/Response` - API communication

## Data Flow

### Request Processing Flow

```
HTTP Request
    │
    ├─ Validation (Zod schema)
    │
    ├─ Agent Routing
    │   └─ Route query to appropriate agent
    │
    ├─ Agent Processing
    │   ├─ Retrieve context (Elasticsearch)
    │   ├─ Generate response (Ollama LLM)
    │   ├─ Update state (Elasticsearch)
    │   └─ Send notifications (Email)
    │
    └─ Response Formatting
        └─ HTTP Response with messages & context
```

### Pricing Agent Flow
```
User Query: "What's the price of wireless mice?"
    │
    ├─ Route to Pricing Agent
    │
    ├─ Search Elasticsearch for products
    │   └─ Query: multi_match on [name, description, category]
    │
    ├─ Format results with product info
    │
    ├─ Generate response using Ollama
    │   └─ System prompt: Pricing specialist instructions
    │
    ├─ Send email (if email provided)
    │   └─ Template: pricing_inquiry
    │
    └─ Return response + messages
```

### Inventory Agent Flow
```
User Query: "What's in stock?"
    │
    ├─ Route to Inventory Agent
    │
    ├─ Search Elasticsearch for products
    │
    ├─ Check stock levels
    │   └─ Mark items < threshold as low stock
    │
    ├─ Generate response using Ollama
    │   └─ System prompt: Inventory specialist instructions
    │
    ├─ Send alerts for low stock items
    │   └─ Template: inventory_alert
    │
    └─ Return response + inventory status
```

### Support Agent Flow
```
User Query: "My order hasn't arrived"
    │
    ├─ Route to Support Agent
    │
    ├─ Create Support Ticket
    │   └─ Assign: ID, priority, status
    │
    ├─ Index ticket in Elasticsearch
    │
    ├─ Generate response using Ollama
    │   └─ System prompt: Support specialist instructions
    │
    ├─ Send confirmation email
    │   └─ Template: support_ticket_created
    │
    └─ Return response + ticket ID
```

## Elasticsearch Schema

### Products Index
```json
{
  "mappings": {
    "properties": {
      "id": "keyword",
      "name": "text",
      "description": "text",
      "price": "float",
      "stock": "integer",
      "sku": "keyword",
      "category": "keyword",
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
}
```

### Support Tickets Index
```json
{
  "mappings": {
    "properties": {
      "id": "keyword",
      "customerId": "keyword",
      "subject": "text",
      "description": "text",
      "status": "keyword",
      "priority": "keyword",
      "createdAt": "date",
      "updatedAt": "date",
      "resolvedAt": "date"
    }
  }
}
```

### Messages Index
```json
{
  "mappings": {
    "properties": {
      "id": "keyword",
      "role": "keyword",
      "content": "text",
      "timestamp": "date",
      "metadata": "object"
    }
  }
}
```

## Ollama Integration

### Models
- **llama3.2:3b**: General-purpose text generation (3B parameters)
- **nomic-embed-text**: Text embeddings for similarity search

### API Endpoints Used
- `POST /api/generate` - Text generation
- `POST /api/embeddings` - Generate embeddings
- `POST /api/chat` - Multi-turn conversation
- `GET /api/tags` - List available models

## Email System

### SMTP Configuration
- Host: localhost (configurable)
- Port: 1025 (MailHog default)
- No authentication (local development)
- HTML email support

### Email Templates
1. **support_ticket_created** - New ticket notification
2. **support_ticket_resolved** - Resolution notification
3. **pricing_inquiry** - Pricing information
4. **inventory_alert** - Low stock warning

## Error Handling

Custom error hierarchy:
```
Error
├─ AgentError
│  ├─ ValidationError (400)
│  ├─ NotFoundError (404)
│  ├─ ElasticsearchError (500)
│  ├─ OllamaError (503)
│  └─ EmailError (500)
```

Each error includes:
- `message` - Human-readable error message
- `code` - Machine-readable error code
- `statusCode` - HTTP status code

## Logging

Structured logging with Pino:
- Production: JSON logs to stdout
- Development: Pretty-printed logs with colors
- Log levels: debug, info, warn, error
- Request/response timing
- Agent execution tracing

## Type Safety

Runtime validation with Zod for:
- All API request bodies
- Environment variables
- Database documents
- Response payloads

## Docker Architecture

### Services
1. **app** - Express server (depends on others)
2. **elasticsearch** - Data persistence (single-node)
3. **ollama** - LLM inference
4. **mailhog** - SMTP and email UI

### Networks
- Single bridge network for inter-service communication
- All services accessible by hostname within container network

### Volumes
- Ollama models persistent storage
- No volume for Elasticsearch (development mode)

## Security Considerations

### Current Implementation
- Zod runtime validation
- Environment variable masking
- Error message sanitization
- No default authentication

### Production Recommendations
- Add JWT authentication
- Implement rate limiting
- Use TLS/HTTPS
- Enable Elasticsearch security
- Validate SMTP credentials
- Add CORS configuration
- Implement request size limits
- Add SQL injection prevention (via Zod)

## Scalability Notes

### Current Design
- Single-instance Elasticsearch
- Single Ollama model per query
- In-memory execution history

### Scaling Recommendations
- Multi-node Elasticsearch cluster
- Ollama model caching/batching
- Redis for execution history
- Message queue (RabbitMQ/Redis) for async processing
- Horizontal scaling with load balancer
- API Gateway for rate limiting

## Monitoring & Observability

### Current
- Structured logging
- Request timing
- Error tracking
- Agent state history

### Enhancement Opportunities
- Prometheus metrics
- Distributed tracing (Jaeger)
- Health check probes
- Performance dashboards
- Agent success/failure rates
