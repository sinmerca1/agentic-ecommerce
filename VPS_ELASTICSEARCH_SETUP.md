# VPS Elasticsearch Configuration Guide

## Current Status

✅ **Local System**: Fully operational, using separate Elasticsearch instance
⏳ **VPS System**: Configuration updated, awaiting restart

## Problem

The VPS has an existing `gurrex_products` index in the main Elasticsearch (port 9200), but the agentic-ecommerce app was creating its own separate Elasticsearch instance (port 9201) with no data.

## Solution

Configure agentic-ecommerce to connect to the existing gurrex-elasticsearch instance at port 9200.

### Configuration Used

In `docker-compose.vps.yml`:

```yaml
environment:
  - ELASTICSEARCH_URL=http://host.docker.internal:9200
  - PRODUCTS_INDEX=gurrex_products
```

This tells the app to:
1. Connect to Elasticsearch at `host.docker.internal:9200`
2. Use the `gurrex_products` index
3. Access the 24 existing products in that index

### How It Works

- `host.docker.internal` is a special Docker hostname that resolves to the host machine's IP (172.17.0.1)
- The elasticsearch client code uses `process.env.ELASTICSEARCH_URL` if set, otherwise falls back to `ELASTICSEARCH_HOST` and `ELASTICSEARCH_PORT`
- This allows the containerized app to reach the main Elasticsearch running on the host

## Manual VPS Setup (if needed)

When the VPS is ready, execute:

```bash
cd ~/agentic-ecommerce

# Pull latest code
git pull origin main

# Update docker-compose configuration
# (docker-compose.vps.yml should have ELASTICSEARCH_URL set)

# Rebuild and restart
sudo docker compose -f docker-compose.vps.yml down
sudo docker compose -f docker-compose.vps.yml up --build -d

# Verify connection
docker logs agentic-ecommerce | grep -i "elasticsearch"

# Test endpoints
curl http://localhost:8002/health
curl "http://localhost:8002/api/products/search?query=test"
```

## Expected Results After Setup

When properly configured, the VPS app should:

1. Successfully connect to gurrex-elasticsearch at port 9200
2. Find the 24 existing products in `gurrex_products` index
3. Respond to search queries with actual product data

### Test Pricing Agent

```bash
curl -X POST http://localhost:8002/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{"query": "laptop price"}'
```

Expected: Should return product data from the 24 indexed products

### Test Product Search

```bash
curl "http://localhost:8002/api/products/search?query=laptop"
```

Expected: Should return matching products from gurrex_products index

## Alternative: Using Only Separate Elasticsearch

If connecting to the host Elasticsearch proves problematic, use separate Elasticsearch instances:

### Configuration

In `docker-compose.vps.yml`, restore the elasticsearch service and set:

```yaml
environment:
  - ELASTICSEARCH_HOST=elasticsearch
  - ELASTICSEARCH_PORT=9200
  - PRODUCTS_INDEX=gurrex_products
```

### Limitations

- Will have a separate, empty gurrex_products index
- Need to re-index the 24 products or sync from main Elasticsearch
- More resource usage (separate ES instances on local and VPS)
- Data isolation between environments

### How to Sync Data

If using separate instances, sync data from main to agentic instance:

```bash
# Export from main Elasticsearch
curl -X GET "localhost:9200/gurrex_products/_search?size=1000" > products.json

# Import to agentic Elasticsearch (port 9201)
curl -X POST "localhost:9201/gurrex_products/_bulk" \
  -H "Content-Type: application/json" \
  -d @products.json
```

## Environment Variables Summary

**For connecting to host Elasticsearch**:
```
ELASTICSEARCH_URL=http://host.docker.internal:9200
PRODUCTS_INDEX=gurrex_products
```

**For separate Elasticsearch**:
```
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
PRODUCTS_INDEX=gurrex_products
```

The app automatically detects which configuration to use:
- If `ELASTICSEARCH_URL` is set → uses full URL
- Otherwise → constructs URL from `ELASTICSEARCH_HOST:ELASTICSEARCH_PORT`
- If neither set → defaults to `localhost:9200`

## Troubleshooting

### Container can't reach host.docker.internal

Check if resolved correctly:
```bash
docker exec agentic-ecommerce ping host.docker.internal
```

Expected output: Ping with response times

### Connection timeout to Elasticsearch

Check if Elasticsearch is accessible:
```bash
curl http://host.docker.internal:9200/_cluster/health
```

Expected output: Cluster health JSON

### No products found in search

Verify products are indexed:
```bash
curl "http://host.docker.internal:9200/gurrex_products/_doc_count"
```

Expected output: Count of documents (24 or more)

## Git Commits

- `2c0411f` - Use ELASTICSEARCH_URL environment variable for VPS
- `6c6103d` - Configure VPS to use existing gurrex-elasticsearch instance

## Next Steps

1. Wait for VPS connectivity to be restored
2. SSH into VPS: `ssh -i /home/siny/claude_ai_key claude-ai@mail.mercadabra.com`
3. Run setup commands from "Manual VPS Setup" section
4. Verify with test queries from "Expected Results" section
5. Monitor logs: `docker logs -f agentic-ecommerce`

## References

- Main Elasticsearch (port 9200): Contains gurrex_products with 24 documents
- gurrex-elasticsearch: Running on host, accessible from Docker via host.docker.internal
- agentic-ecommerce: Configured to point to gurrex-elasticsearch

---

This guide allows agentic-ecommerce to share the existing gurrex_products index, making the 24 products available to agents and search endpoints.
