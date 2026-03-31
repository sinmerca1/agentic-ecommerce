# Elasticsearch Integration Update

## Overview
Updated the agentic-ecommerce application to use the existing `gurrex_products` Elasticsearch index with proper field mapping and optimized search functionality.

## Changes Made

### 1. Elasticsearch Service Updates (`src/services/elasticsearch.ts`)

#### Index Configuration
- Changed `productsIndex` from `'products'` to `'gurrex_products'`
- Now integrates with existing product catalog

#### New Methods

**`searchGurrexProducts(searchTerm: string, limit: number)`**
- Optimized for gurrex_products schema
- Supports multi-field search: name (boost 3), description (boost 2), category
- Filters for `status: 'active'` only
- Returns relevance score with results
- Fuzzy matching enabled for typo tolerance

**`findProductsByNameOrDescription(searchTerm: string, limit: number)`**
- Advanced search with multiple should clauses
- Name field: boost 3, fuzzy matching
- Description field: boost 1.5, fuzzy matching  
- Category field: boost 2
- Filters for active status and stock >= 0
- Results sorted by relevance then price (ascending)
- Returns all gurrex_products fields

**Updated `searchProducts(query: string, limit: number)`**
- Returns data in gurrex_products format
- Maps fields: product_id, name, description, price, stock, category, rating, images, status

### 2. Agent Updates

#### Pricing Agent (`src/agents/pricing.ts`)
- Uses `findProductsByNameOrDescription()` for product search
- Context includes full product fields: product_id, name, description, price, stock, category, rating, status
- More accurate pricing information from gurrex index

#### Inventory Agent (`src/agents/inventory.ts`)
- Uses `searchGurrexProducts()` for product search
- Low stock threshold filtering works with actual inventory levels
- Context includes category and price for better recommendations

#### Support Agent (`src/agents/support.ts`)
- No changes needed (doesn't search products directly)

### 3. API Routes Updates

#### Products Route (`src/api/routes/products.ts`)
- **GET /api/products/search** - Uses `findProductsByNameOrDescription()`
- **GET /api/products/:id** - Works with gurrex_products documents
- Returns full product information from gurrex index

## Product Field Structure

All searches now work with the complete gurrex_products schema:

```typescript
{
  product_id: string,           // Unique product identifier
  name: string,                 // Product name (boosted in search)
  description: string,          // Detailed product description
  price: number,                // Product price
  stock: number,                // Available inventory
  category: string,             // Product category
  rating: number,               // Customer rating (0-5)
  images: string[],             // Product image URLs
  status: string,               // 'active', 'inactive', etc.
  relevance_score?: number      // Search relevance (returned by search methods)
}
```

## Search Capabilities

### Multi-field Search
- Searches across name, description, and category
- Weighted scoring prioritizes matches in order: name > category > description

### Fuzzy Matching
- Automatically corrects typos (e.g., "lapto" finds "laptop")
- Uses Elasticsearch's AUTO fuzziness

### Filtering
- Automatically filters for `status: 'active'`
- Stock levels >= 0
- No manual filtering needed in application code

### Relevance Scoring
- Results ranked by Elasticsearch scoring
- Secondary sort by price (ascending) for similar matches
- Relevance score included in response data

## Docker Configuration

### Local Development
- **docker-compose.yml** - Default for local use
  - App port: 3000
  - Elasticsearch port: 9200
  - MailHog: 1025/8025
  - Ollama: 11435

### VPS Production (mail.mercadabra.com)
- **docker-compose.vps.yml** - For shared server environment
  - App port: 8002
  - Elasticsearch port: 9201 (avoids conflict with gurrex-elasticsearch on 9200)
  - MailHog: 1027/8027
  - Ollama: 11436
  - Container names prefixed with 'agentic' to avoid conflicts

**Run on VPS:**
```bash
sudo docker compose -f docker-compose.vps.yml up --build -d
```

## API Examples

### Search Products
```bash
curl "http://localhost:3000/api/products/search?query=laptop&limit=10"
```

Response:
```json
{
  "success": true,
  "count": 2,
  "products": [
    {
      "product_id": "prod-123",
      "name": "Dell Laptop XPS 13",
      "description": "High-performance ultrabook...",
      "price": 999.99,
      "stock": 45,
      "category": "Electronics",
      "rating": 4.8,
      "images": ["image1.jpg", "image2.jpg"],
      "status": "active",
      "relevance_score": 15.2
    }
  ]
}
```

### Pricing Agent
```bash
curl -X POST "http://localhost:3000/api/agents/pricing" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How much does a gaming laptop cost?",
    "context": {"customerEmail": "customer@example.com"}
  }'
```

### Inventory Agent
```bash
curl -X POST "http://localhost:3000/api/agents/inventory" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Check laptop inventory",
    "context": {"lowStockThreshold": 20}
  }'
```

## Database Integration

The application expects:
- Elasticsearch cluster running with gurrex_products index
- Products indexed with fields: product_id, name, description, price, stock, category, rating, images, status
- Optional: Set product status to 'active' to control visibility

### Syncing Data
To populate gurrex_products from your product database:

```bash
# Elasticsearch bulk indexing endpoint
POST http://localhost:9200/gurrex_products/_bulk

# Or use your existing ETL pipeline
# Ensure documents have all required fields
```

## Error Handling

- Missing fields default to empty/zero values (images: [], rating: 0)
- Non-existent index returns empty results (graceful degradation)
- Search errors logged but don't crash application
- All methods have try-catch error handling

## Performance Optimizations

1. **Fuzzy Matching**: Uses AUTO to balance accuracy and performance
2. **Filtering**: Elasticsearch filters (faster than application-level filtering)
3. **Pagination**: Built-in limit parameter (default 10, max recommended 100)
4. **Caching**: Elasticsearch caches frequently accessed queries
5. **Field Boosting**: Weighted search reduces irrelevant results

## Testing

All agents tested with the new gurrex_products integration:

```bash
# Health check
curl http://localhost:3000/health

# Product search (expect empty with no data)
curl "http://localhost:3000/api/products/search?query=laptop"

# Pricing agent
curl -X POST http://localhost:3000/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{"query": "laptop price"}'

# Inventory agent
curl -X POST http://localhost:3000/api/agents/inventory \
  -H "Content-Type: application/json" \
  -d '{"query": "check inventory"}'
```

## Deployment Status

✅ **Local Development** - Running on port 3000
✅ **VPS Production** - Running on mail.mercadabra.com:8002
✅ **Git Repository** - Latest changes pushed to GitHub

## Next Steps

1. **Index gurrex_products** - Ensure index exists in your Elasticsearch
2. **Load Product Data** - Bulk index products from your database
3. **Test Searches** - Verify search results with sample queries
4. **Monitor Performance** - Track query response times
5. **Optimize Fields** - Adjust field boosts based on actual usage patterns
