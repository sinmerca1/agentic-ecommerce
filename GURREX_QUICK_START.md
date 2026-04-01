# Gurrex Frontend - AI Agents Quick Start

## ✅ Setup Complete

The Gurrex frontend on port 3001 (VPS) now has direct access to AI agents on port 8002.

## Quick API Reference

### Frontend Endpoint

All agent requests go through:
```
POST /api/agents/{agentType}
Content-Type: application/json
```

### Available Agents

| Agent | Purpose | Example |
|-------|---------|---------|
| `pricing` | Product pricing | "How much is the dog leash?" |
| `inventory` | Stock levels | "Do you have toys?" |
| `support` | Support tickets | "I have a complaint" |
| `process` | Generic routing | "Process this request" |
| `route` | Auto-detect agent | "Help me find products" |

## Example Frontend Code

### Simple JavaScript

```javascript
const response = await fetch('/api/agents/pricing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'dog leash price' })
});

const data = await response.json();
console.log(data.response); // Agent response with prices
```

### React Hook

```javascript
import { useState } from 'react';

function useAgent(agentType) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');

  const ask = async (query) => {
    setLoading(true);
    const res = await fetch(`/api/agents/${agentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    setResponse(data.response);
    setLoading(false);
  };

  return { ask, response, loading };
}

// Usage:
const { ask, response, loading } = useAgent('pricing');
await ask('How much does the dog leash cost?');
```

### Next.js Server Action

```typescript
'use server'

export async function queryAgent(agentType: string, query: string) {
  const response = await fetch('http://localhost:3001/api/agents/' + agentType, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return response.json();
}

// In component:
const result = await queryAgent('pricing', 'dog leash price');
```

## Curl Testing

### Test Pricing
```bash
curl -X POST http://localhost:3001/api/agents/pricing \
  -H "Content-Type: application/json" \
  -d '{"query": "dog leash price"}'
```

### Test Inventory
```bash
curl -X POST http://localhost:3001/api/agents/inventory \
  -H "Content-Type: application/json" \
  -d '{"query": "pet toys in stock"}'
```

## Response Format

### Success
```json
{
  "success": true,
  "agent": "pricing",
  "agentType": "pricing",
  "status": "completed",
  "response": "The 6-in-1 dog leash costs $12.09",
  "requestId": "uuid"
}
```

### Cached Response (Instant)
Same format, but returned in <50ms from cache

### Error
```json
{
  "success": false,
  "error": "Backend timeout or error message",
  "agent": "pricing"
}
```

## Performance

| Scenario | Time |
|----------|------|
| First request | 5-10 seconds |
| Cached request | <50ms |
| Elasticsearch search | <50ms |

## Where to Add

### 1. Product Pages
```javascript
<PricingAgent productQuery={productName} />
```

### 2. Search Results
```javascript
{results.map(product => (
  <AgentRecommendation product={product} />
))}
```

### 3. Cart/Checkout
```javascript
<SupportAgent showIfProblems={true} />
```

### 4. Product Recommendations
```javascript
<InventoryAgent queryProducts={category} />
```

## Files to Reference

1. **Frontend Proxy**: `/var/www/gurrex/app/api/agents/[agent]/route.js`
2. **Backend**: `/root/agentic-ecommerce` (docker containers)
3. **Full Guide**: `/root/agentic-ecommerce/GURREX_API_INTEGRATION.md`

## Troubleshooting

**Q: Getting 500 errors?**
- Check backend is running: `curl http://localhost:8002/api/health`
- Restart backend: `docker-compose -f docker-compose.vps.yml restart agentic-ecommerce`

**Q: Responses are slow?**
- First request is always 5-10s (normal)
- Subsequent same queries should be <50ms
- If all slow: Ollama may be overloaded

**Q: Getting "pet toy pricing" back (echo response)?**
- Backend Ollama is timing out
- This means the response cache is being checked but no inference happening
- Wait a moment and try again

**Q: Agent type invalid error?**
- Only these agents work: pricing, inventory, support, process, route
- Check spelling

## Next Steps

1. **Add to Product Page**: Show pricing info via agent
2. **Add to Search**: Suggest matching products
3. **Add to Cart**: Warn if stock low via inventory agent
4. **Add Support Widget**: Quick support ticket creation
5. **Add Recommendations**: Use agent routing to suggest products

## Support

- **Backend logs**: SSH into VPS, check `/tmp/gurrex.log`
- **Backend health**: `curl http://localhost:8002/api/health`
- **Proxy status**: Check if Next.js is running on port 3001
- **GitHub**: Full code and docs at sinmerca1/agentic-ecommerce

---

**Ready to Use** ✅  
All integration complete and tested!
