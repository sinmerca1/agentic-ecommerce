# Deployment Guide

## Pre-Deployment Checklist

- [ ] Environment variables configured in `.env`
- [ ] All dependencies installed (`npm install`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] Docker images build successfully
- [ ] External services configured (Elasticsearch, Ollama, SMTP)

## Docker Compose Deployment

### Quick Start (Single Command)
```bash
docker-compose up --build
```

### Step-by-Step Deployment

1. **Build images**
```bash
docker-compose build
```

2. **Start services**
```bash
docker-compose up -d
```

3. **Verify health**
```bash
docker-compose ps
curl http://localhost:3000/health
```

4. **View logs**
```bash
docker-compose logs -f app
```

5. **Stop services**
```bash
docker-compose down
```

## Production Deployment

### Environment Configuration

Create `.env.production`:
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

ELASTICSEARCH_HOST=elasticsearch.example.com
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=secure_password

OLLAMA_BASE_URL=http://ollama.internal:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_EMBED_MODEL=nomic-embed-text

SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USERNAME=noreply@example.com
SMTP_PASSWORD=secure_password
SMTP_TLS=true
SMTP_FROM=noreply@example.com
```

### Docker Build for Production

```bash
# Build production image
docker build -t agentic-ecommerce:1.0.0 .

# Tag for registry
docker tag agentic-ecommerce:1.0.0 registry.example.com/agentic-ecommerce:1.0.0

# Push to registry
docker push registry.example.com/agentic-ecommerce:1.0.0
```

### Kubernetes Deployment

#### Namespace and ConfigMap
```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: ecommerce

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: agentic-config
  namespace: ecommerce
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"
  ELASTICSEARCH_HOST: "elasticsearch"
  ELASTICSEARCH_PORT: "9200"
  OLLAMA_BASE_URL: "http://ollama:11434"
  OLLAMA_MODEL: "llama3.2:3b"
  OLLAMA_EMBED_MODEL: "nomic-embed-text"
  SMTP_HOST: "mail.example.com"
  SMTP_PORT: "587"
```

#### Deployment
```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agentic-ecommerce
  namespace: ecommerce
  labels:
    app: agentic-ecommerce
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agentic-ecommerce
  template:
    metadata:
      labels:
        app: agentic-ecommerce
    spec:
      containers:
      - name: api
        image: registry.example.com/agentic-ecommerce:1.0.0
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: agentic-config
        env:
        - name: ELASTICSEARCH_PASSWORD
          valueFrom:
            secretKeyRef:
              name: elasticsearch-secret
              key: password
        - name: SMTP_PASSWORD
          valueFrom:
            secretKeyRef:
              name: smtp-secret
              key: password
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi

---
apiVersion: v1
kind: Service
metadata:
  name: agentic-ecommerce
  namespace: ecommerce
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: agentic-ecommerce

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agentic-ecommerce
  namespace: ecommerce
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: agentic-ecommerce
            port:
              number: 80
```

### AWS ECS Deployment

#### Task Definition
```json
{
  "family": "agentic-ecommerce",
  "containerDefinitions": [
    {
      "name": "agentic-ecommerce",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/agentic-ecommerce:1.0.0",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "LOG_LEVEL",
          "value": "info"
        }
      ],
      "secrets": [
        {
          "name": "ELASTICSEARCH_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:elasticsearch-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/agentic-ecommerce",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "256",
  "memory": "512"
}
```

## Reverse Proxy Setup (Nginx)

```nginx
upstream agentic_api {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=200 nodelay;

    # Proxy configuration
    location / {
        proxy_pass http://agentic_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://agentic_api;
        access_log off;
    }
}
```

## Monitoring & Logging

### Application Logs

View logs in Docker:
```bash
docker-compose logs -f app
```

View logs in Kubernetes:
```bash
kubectl logs -f deployment/agentic-ecommerce -n ecommerce
```

### Elasticsearch Monitoring

```bash
# Check cluster health
curl http://localhost:9200/_cluster/health

# View indices
curl http://localhost:9200/_cat/indices

# Check indices size
curl http://localhost:9200/_cat/indices?v
```

### Ollama Monitoring

```bash
# Check available models
curl http://localhost:11434/api/tags

# Check model status
curl http://localhost:11434/api/show -d '{"name":"llama3.2:3b"}'
```

## Backup & Recovery

### Elasticsearch Backup

```bash
# Create snapshot repository
curl -X PUT "http://localhost:9200/_snapshot/backup" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/backup"
    }
  }'

# Create snapshot
curl -X PUT "http://localhost:9200/_snapshot/backup/snapshot_1"

# Restore snapshot
curl -X POST "http://localhost:9200/_snapshot/backup/snapshot_1/_restore"
```

### Database Backup Strategy

1. **Daily snapshots**: Automated Elasticsearch snapshots
2. **Point-in-time recovery**: Maintain transaction logs
3. **Cross-region replication**: For disaster recovery

## Scaling Strategies

### Horizontal Scaling

1. **Load Balancer**: Use Nginx/HAProxy
2. **Multiple instances**: Run multiple containers
3. **Session storage**: Use Redis for distributed state

```bash
# Scale with Docker Compose
docker-compose up -d --scale app=3
```

### Vertical Scaling

1. **Increase CPU/Memory**: Update deployment specs
2. **Optimize queries**: Add Elasticsearch indices
3. **Cache responses**: Implement Redis caching

## Performance Tuning

### Elasticsearch Optimization
```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "index.refresh_interval": "30s",
    "index.translog.flush_interval": "5s"
  }
}
```

### Ollama Optimization
- Use GPU if available
- Batch requests
- Implement response caching
- Monitor memory usage

### Node.js Optimization
- Enable compression: `npm install compression`
- Use clustering for multi-core
- Implement connection pooling
- Monitor memory leaks

## Rollback Procedure

### Docker Deployment
```bash
# Keep previous versions tagged
docker tag agentic-ecommerce:1.0.0 agentic-ecommerce:1.0.0-backup

# Rollback to previous version
docker-compose up -d agentic-ecommerce:0.9.0
```

### Kubernetes Rollback
```bash
# View rollout history
kubectl rollout history deployment/agentic-ecommerce -n ecommerce

# Rollback to previous version
kubectl rollout undo deployment/agentic-ecommerce -n ecommerce

# Rollback to specific revision
kubectl rollout undo deployment/agentic-ecommerce -n ecommerce --to-revision=2
```

## Disaster Recovery

### RTO (Recovery Time Objective): < 30 minutes
### RPO (Recovery Point Objective): < 1 hour

1. **Automated backups** every hour
2. **Multi-region setup** for redundancy
3. **Health checks** to detect failures
4. **Automated failover** mechanisms

## Security Hardening

### Pre-Deployment Checklist
- [ ] Remove debug logging
- [ ] Enable HTTPS/TLS
- [ ] Implement authentication
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Sanitize error messages
- [ ] Secure secrets management
- [ ] Add request size limits
- [ ] Implement WAF rules

### Secrets Management

Use AWS Secrets Manager, HashiCorp Vault, or similar:
```bash
# Example: AWS Secrets Manager
aws secretsmanager create-secret \
  --name agentic/elasticsearch/password \
  --secret-string "secure_password"
```

## Cost Optimization

1. **Right-sizing resources**: Monitor actual usage
2. **Reserved instances**: For predictable workloads
3. **Auto-scaling**: Scale down during low usage
4. **CDN**: Cache static responses
5. **Database optimization**: Proper indexing

## Troubleshooting Deployment

### Container Won't Start
```bash
docker-compose logs app
docker-compose exec app npm run build
```

### Elasticsearch Connection Error
```bash
docker-compose exec elasticsearch curl localhost:9200
```

### Ollama Models Missing
```bash
docker-compose exec ollama ollama pull llama3.2:3b
docker-compose exec ollama ollama pull nomic-embed-text
```

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

## Contact & Support

For deployment issues:
1. Check application logs
2. Verify service health
3. Review configuration
4. Check external service connectivity
5. Consult ARCHITECTURE.md for system design
