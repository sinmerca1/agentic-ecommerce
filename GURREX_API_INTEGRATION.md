# Gurrex Frontend - Agentic E-Commerce API Integration

**Status**: ✅ **Deployed and Operational**
**Date**: 2026-04-01
**VPS Deployment**: mail.mercadabra.com

## Overview

The Gurrex e-commerce frontend (running on port 3001) now includes a Next.js API proxy that routes requests to the agentic-ecommerce backend (port 8002). This enables the frontend to access AI agents for intelligent product recommendations, pricing, inventory, and support.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Gurrex Frontend (Next.js)                   :3001              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Component                                               │  │
│  │  - Uses fetch('/api/agents/pricing')                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /api/agents/[agent]/route.js (API Proxy)               │  │
│  │  - POST /api/agents/pricing                              │  │
│  │  - POST /api/agents/inventory                            │  │
│  │  - POST /api/agents/support                              │  │
│  │  - Validates agent type                                  │  │
│  │  - Forwards to backend                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
              HTTP (localhost:8002)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agentic E-Commerce Backend                  :8002              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /api/agents/{agent}                                     │  │
│  │  - Pricing Agent (searches products, returns prices)    │  │
│  │  - Inventory Agent (checks stock levels)                │  │
│  │  - Support Agent (creates tickets)                      │  │
│  │  - Response Caching (5 min TTL)                         │  │
│  │  - Ollama LLM Integration                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Elasticsearch (gurrex_products index)                  │  │
│  │  - 46 real Gurrex pet products                          │  │
│  │  - Full-text search with fuzzy matching                 │  │
│  │  - Fast product lookup (<50ms)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Ollama (llama3.2:3b)                                    │  │
│  │  - LLM inference for intelligent responses              │  │
│  │  - Response generation with product context             │  │
│  │  - Temperature: 0.3 (for fast convergence)              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### Gurrex Frontend (VPS: /var/www/gurrex)

**New File**: `/app/api/agents/[agent]/route.js`
- Dynamic route handler for agent API proxy
- Validates agent type (pricing, inventory, support, process, route)
- Forwards POST requests to backend at localhost:8002
- Handles errors and response formatting
- GET endpoint for health checks

**New File**: `/app/api/agents/USAGE.md`
- Comprehensive usage guide
- React component examples
- curl command examples
- Response format documentation

### Agentic E-Commerce Backend

**Services**: Already deployed with caching and optimizations
- Response Cache (5-minute TTL)
- Temperature optimization (0.3 for fast responses)
- Ollama timeout at 60 seconds
- Only top 1 product used per query
- Description truncation to 200 chars

## Integration Steps

### 1. Frontend Component Integration

```typescript
// Example: PricingQuery.tsx
import { useState } from 'react';

export function PricingQuery() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const data = await res.json();
      if (data.success) {
        setResponse(data.response);
      } else {
        setResponse(`Error: ${data.error}`);
      }
    } catch (error) {
      setResponse(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about pricing..."
        disabled={loading}
      />
      <button onClick={handleQuery} disabled={loading}>
        {loading ? 'Loading...' : 'Ask Agent'}
      </button>
      {response && <p>{response}</p>}
    </div>
  );
}
```

### 2. API Usage Examples

**Pricing Agent**:
```bash
POST /api/agents/pricing
{
  "query": "How much is the 6-in-1 dog leash?"
}

Response:
{
  "success": true,
  "agent": "pricing",
  "response": "The 6-in-1 Retractable Dog Leash with LED Light costs $12.09"
}
```

**Inventory Agent**:
```bash
POST /api/agents/inventory
{
  "query": "Do you have dog toys in stock?"
}

Response:
{
  "success": true,
  "agent": "inventory",
  "response": "We have several dog toys in stock with various quantities available"
}
```

## Performance Metrics

### Response Times (VPS Deployment)

| Scenario | Time | Notes |
|----------|------|-------|
| First request (cache miss) | 5-10s | Ollama inference + Elasticsearch search |
| Cached request | <50ms | In-memory cache lookup |
| Elasticsearch search | <50ms | 46 products indexed |
| Backend error timeout | 60s | Ollama timeout limit |

### Cache Statistics

- **TTL**: 5 minutes
- **Key**: MD5 hash of query + context
- **Hit Rate**: High for repeat queries
- **Savings**: ~9.95 seconds per cached query

## Testing

### Quick Test via Frontend Proxy

```bash
# Test pricing agent through frontend proxy
curl -X POST http://localhost:3001/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{"query": "dog leash price"}'

# Test inventory agent
curl -X POST http://localhost:3001/api/agents/inventory \
  -H "Content-Type: application/json" \
  -d '{"query": "pet toys stock"}'
```

### Backend Direct Test

```bash
# Direct backend test (bypass frontend)
curl -X POST http://localhost:8002/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{"query": "dog leash price"}'
```

## Troubleshooting

### Proxy Not Working

1. Check Next.js is running:
   ```bash
   netstat -tlnp | grep 3001
   ```

2. Check backend is running:
   ```bash
   netstat -tlnp | grep 8002
   ```

3. Check logs:
   ```bash
   tail -f /tmp/gurrex.log
   ```

### Slow Responses

1. First request will be 5-10 seconds (normal - LLM inference)
2. Subsequent identical requests should be <50ms (cached)
3. If all requests are slow, Ollama may be overloaded

### Agent Returns Query Instead of Response

1. Backend Ollama is timing out
2. Check Ollama status:
   ```bash
   curl http://localhost:11434/api/tags
   ```
3. Restart Ollama if needed:
   ```bash
   docker restart ollama-agentic
   ```

## Deployment Notes

### VPS Configuration

- **Gurrex Frontend**: `/var/www/gurrex` → port 3001
- **Agentic Backend**: `/root/agentic-ecommerce` → port 8002
- **Elasticsearch**: Internal docker network
- **Ollama**: Internal docker network + port 11434

### Environment Variables

**Frontend (Gurrex)**: No new env vars needed - uses localhost:8002

**Backend**: Already configured in docker-compose.vps.yml
```
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
```

## Future Enhancements

1. **Request Queuing**: Handle concurrent requests better
2. **Authentication**: Add API key validation
3. **Rate Limiting**: Prevent abuse of agent services
4. **Analytics**: Track agent usage and performance
5. **Streaming**: Use Server-Sent Events for real-time responses
6. **Advanced Caching**: Redis-based distributed cache
7. **Load Balancing**: Multiple backend instances
8. **Fallback Agents**: Alternative responses if Ollama unavailable

## Support

For issues or questions:
1. Check logs in `/tmp/gurrex.log`
2. Verify backend connectivity to localhost:8002
3. Test Ollama availability on port 11434
4. Check Elasticsearch is accessible

---

**Maintained By**: Claude AI  
**Status**: Production Ready ✅  
**Last Updated**: 2026-04-01  
**VPS**: mail.mercadabra.com
