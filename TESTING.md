# Testing Guide

## Quick Validation

After starting the application, run these commands to verify everything is working:

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Create a test product
PRODUCT_RESPONSE=$(curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "description": "Ergonomic wireless mouse",
    "price": 29.99,
    "stock": 100,
    "sku": "MOUSE-001",
    "category": "Electronics"
  }')
echo "$PRODUCT_RESPONSE"

# 3. Search for the product
curl "http://localhost:3000/api/products/search?query=mouse"

# 4. Test pricing agent
curl -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the price of a wireless mouse?"
  }'

# 5. Test support agent
curl -X POST http://localhost:3000/api/agents/support \
  -H "Content-Type: application/json" \
  -d '{
    "query": "My order hasn'\''t arrived yet. Can you help?",
    "context": {
      "customerId": "test-customer-123",
      "customerEmail": "test@example.com"
    }
  }'

# 6. Check support tickets
curl http://localhost:3000/api/support/tickets

# 7. Check sent emails (MailHog)
curl http://localhost:8025/api/v1/messages
```

## Comprehensive Test Suite

### 1. Service Health Checks

```bash
#!/bin/bash

echo "=== Service Health Checks ==="

# API Server
echo "API Server..."
curl -s http://localhost:3000/health | jq .

# Elasticsearch
echo "Elasticsearch..."
curl -s http://localhost:9200/_cluster/health | jq .

# Ollama
echo "Ollama..."
curl -s http://localhost:11434/api/tags | jq '.models[].name'

# MailHog
echo "MailHog..."
curl -s http://localhost:8025/api/v1/stats
```

### 2. Agent Functionality Tests

```bash
#!/bin/bash

echo "=== Agent Functionality Tests ==="

# Test 1: Create multiple products
echo "Creating test products..."
for i in {1..3}; do
  curl -s -X POST http://localhost:3000/api/products \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Product $i\",
      \"description\": \"Description for product $i\",
      \"price\": $((i * 10)),
      \"stock\": $((i * 50)),
      \"sku\": \"SKU-00$i\",
      \"category\": \"Category$i\"
    }" | jq '.product.id'
done

# Test 2: Pricing agent with context
echo "Testing pricing agent..."
curl -s -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me all available products",
    "context": {
      "customerEmail": "buyer@test.com",
      "customerId": "cust-001"
    }
  }' | jq .

# Test 3: Inventory agent
echo "Testing inventory agent..."
curl -s -X POST http://localhost:3000/api/agents/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Which products are in stock?",
    "context": {
      "lowStockThreshold": 25,
      "managerEmail": "manager@test.com"
    }
  }' | jq .

# Test 4: Support agent (creates ticket)
echo "Testing support agent..."
curl -s -X POST http://localhost:3000/api/agents/support \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I have a problem with my recent purchase",
    "context": {
      "customerEmail": "customer@test.com",
      "customerId": "cust-001"
    }
  }' | jq .

# Test 5: Auto-routing
echo "Testing auto-routing..."
curl -s -X POST http://localhost:3000/api/agents/process \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How much does product 1 cost?"
  }' | jq '.agentType'

echo "=== Tests Complete ==="
```

### 3. Error Handling Tests

```bash
#!/bin/bash

echo "=== Error Handling Tests ==="

# Missing required fields
echo "Test 1: Missing required field"
curl -s -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.error'

# Invalid price
echo "Test 2: Invalid price"
curl -s -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bad Product",
    "description": "Bad price",
    "price": -10,
    "stock": 100,
    "sku": "BAD-001",
    "category": "Electronics"
  }' | jq '.error'

# Non-existent product
echo "Test 3: Non-existent product"
curl -s http://localhost:3000/api/products/nonexistent-id | jq '.error'

# Non-existent ticket
echo "Test 4: Non-existent ticket"
curl -s http://localhost:3000/api/support/tickets/nonexistent-id | jq '.error'
```

### 4. Elasticsearch Tests

```bash
#!/bin/bash

echo "=== Elasticsearch Tests ==="

# Index status
echo "Products index:"
curl -s http://localhost:9200/products | jq '.mappings.properties | keys'

echo "Tickets index:"
curl -s http://localhost:9200/tickets | jq '.mappings.properties | keys'

# Count documents
echo "Product count:"
curl -s -X GET http://localhost:9200/products/_count | jq '.count'

echo "Ticket count:"
curl -s -X GET http://localhost:9200/tickets/_count | jq '.count'

# Search query
echo "Search for products:"
curl -s -X POST http://localhost:9200/products/_search \
  -H "Content-Type: application/json" \
  -d '{"query": {"match_all": {}}, "size": 5}' | jq '.hits.hits[] | {id: ._id, name: ._source.name, price: ._source.price}'

# Search tickets by status
echo "Open tickets:"
curl -s -X POST http://localhost:9200/tickets/_search \
  -H "Content-Type: application/json" \
  -d '{"query": {"term": {"status": "open"}}}' | jq '.hits.total.value'
```

### 5. Email Notification Tests

```bash
#!/bin/bash

echo "=== Email Notification Tests ==="

# Create product (for email notification)
echo "Creating product with email..."
curl -s -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is available?",
    "context": {
      "customerEmail": "test@example.com"
    }
  }'

# Check MailHog
echo "Emails sent:"
curl -s http://localhost:8025/api/v1/messages | jq '.items | length'

# Get email details
echo "Latest email:"
curl -s http://localhost:8025/api/v1/messages | jq '.items[0] | {
  From: .From,
  To: .To,
  Subject: .Subject
}'

# View email HTML
echo "Email content:"
curl -s http://localhost:8025/api/v1/messages | jq '.items[0].Content.Headers'
```

### 6. Load Testing

```bash
#!/bin/bash

echo "=== Load Testing ==="

# Create 10 requests in parallel
echo "Sending 10 concurrent requests..."
for i in {1..10}; do
  {
    curl -s -X POST http://localhost:3000/api/agents/process \
      -H "Content-Type: application/json" \
      -d "{
        \"query\": \"Test query $i\"
      }" > /dev/null
    echo "Request $i completed"
  } &
done
wait

echo "All requests completed"

# Measure response time
echo "Measuring response time..."
time curl -s -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What'\''s the price?"
  }' > /dev/null
```

### 7. Integration Test Script

```bash
#!/bin/bash

# Save as: test-integration.sh
# Run: bash test-integration.sh

set -e

API="http://localhost:3000"

echo "🚀 Starting Integration Tests"

# 1. Health Check
echo "✓ Checking health..."
curl -s $API/health | jq .

# 2. Create Products
echo "✓ Creating products..."
PRODUCT_IDS=()
for i in {1..3}; do
  ID=$(curl -s -X POST $API/api/products \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Product $i\",
      \"description\": \"Description $i\",
      \"price\": $((i * 10)).99,
      \"stock\": $((i * 25)),
      \"sku\": \"TEST-00$i\",
      \"category\": \"TestCat\"
    }" | jq -r '.product.id')
  PRODUCT_IDS+=($ID)
  echo "  Created: $ID"
done

# 3. Search Products
echo "✓ Searching products..."
curl -s "$API/api/products/search?query=Test&limit=5" | jq '.count'

# 4. Test Pricing Agent
echo "✓ Testing pricing agent..."
PRICE_RESPONSE=$(curl -s -X POST $API/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show test products",
    "context": {
      "customerEmail": "integration@test.com"
    }
  }')
echo $PRICE_RESPONSE | jq '.status'

# 5. Test Inventory Agent
echo "✓ Testing inventory agent..."
INV_RESPONSE=$(curl -s -X POST $API/api/agents/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What test products are available?"
  }')
echo $INV_RESPONSE | jq '.status'

# 6. Test Support Agent
echo "✓ Testing support agent..."
SUPPORT_RESPONSE=$(curl -s -X POST $API/api/agents/support \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I have an issue with my order",
    "context": {
      "customerId": "test-123",
      "customerEmail": "support@test.com"
    }
  }')
TICKET_ID=$(echo $SUPPORT_RESPONSE | jq -r '.ticketId')
echo "  Created ticket: $TICKET_ID"

# 7. Get Ticket
echo "✓ Retrieving ticket..."
curl -s "$API/api/support/tickets/$TICKET_ID" | jq '.ticket.status'

# 8. Update Ticket
echo "✓ Updating ticket..."
curl -s -X PATCH "$API/api/support/tickets/$TICKET_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "high"
  }' | jq '.ticket.status'

# 9. Check Emails
echo "✓ Checking emails..."
EMAILS=$(curl -s http://localhost:8025/api/v1/messages | jq '.items | length')
echo "  Emails sent: $EMAILS"

echo "✅ All integration tests passed!"
```

## Performance Benchmarks

Expected response times (approximate):

| Operation | Time |
|-----------|------|
| Health check | < 10ms |
| Product search | < 100ms |
| LLM generation | 2-10s |
| Support ticket creation | < 500ms |
| Email send | < 1s |
| Elasticsearch query | < 50ms |

## Stress Testing

```bash
#!/bin/bash

# Simple stress test
echo "Running stress test (100 requests)..."
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/api/agents/process \
    -H "Content-Type: application/json" \
    -d '{"query":"Test query '$i'"}' > /dev/null &
  
  if [ $((i % 10)) -eq 0 ]; then
    echo "Sent $i requests"
    wait
  fi
done
wait

echo "Stress test complete"
```

## Debugging

### Enable Debug Logging
```bash
# In .env
LOG_LEVEL=debug

# Or via environment
LOG_LEVEL=debug npm run dev
```

### View Service Logs
```bash
# API logs
docker-compose logs -f app

# Elasticsearch logs
docker-compose logs -f elasticsearch

# Ollama logs
docker-compose logs -f ollama

# MailHog logs
docker-compose logs -f mailhog
```

### Database Inspection
```bash
# Elasticsearch query
curl -s http://localhost:9200/products/_search?pretty | less

# Show indices
curl -s http://localhost:9200/_cat/indices?v

# Show Ollama models
curl -s http://localhost:11434/api/tags | jq '.models'
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      elasticsearch:
        image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
        env:
          discovery.type: single-node
          xpack.security.enabled: false
      
      ollama:
        image: ollama/ollama:latest
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - run: npm install
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

## Test Checklist

- [ ] Health endpoint returns 200
- [ ] Can create products
- [ ] Can search products
- [ ] Pricing agent responds
- [ ] Inventory agent responds
- [ ] Support agent creates tickets
- [ ] Auto-routing works
- [ ] Elasticsearch indices created
- [ ] Ollama models available
- [ ] Emails sent to MailHog
- [ ] Error handling works
- [ ] Graceful shutdown works
