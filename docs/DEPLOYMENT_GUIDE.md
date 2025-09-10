# Deployment Guide

## Overview

**⚠️ IMPORTANT**: This guide is for future reference. Restaurant OS v6.0.4 is **NOT production ready** due to:
- Test suite failures (timeout issues)
- 560 TypeScript errors
- Missing split payment UI
- Performance issues need resolution

This guide covers deploying Restaurant OS 6.0 to production environments once stabilization is complete.

## Prerequisites

**Before attempting deployment, ensure:**
- All tests pass (`npm test` - currently failing)
- TypeScript errors resolved (<100 from current 560)
- Split payment UI implemented
- Performance benchmarks met
- Node.js 18+ installed
- Git repository access
- Environment variables configured
- SSL certificates (for production)

## Environment Configuration

### Required Environment Variables

```bash
# Database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Authentication
JWT_SECRET=your-jwt-secret
KIOSK_JWT_SECRET=your-kiosk-secret

# API Configuration
VITE_API_BASE_URL=https://api.your-domain.com
PORT=3001

# OpenAI (for voice ordering)
OPENAI_API_KEY=your-openai-key

# Square (for payments)
SQUARE_ACCESS_TOKEN=your-square-token
SQUARE_APPLICATION_ID=your-square-app-id
SQUARE_LOCATION_ID=your-square-location

# Restaurant Configuration
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# Optional
REDIS_URL=redis://your-redis-url
SENTRY_DSN=your-sentry-dsn
NODE_ENV=production
```

### Environment Files

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

## Deployment Platforms

### 1. Vercel (Frontend)

#### Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Initialize project
vercel
```

#### Configuration

```json
// vercel.json
{
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Deploy

```bash
# Production deployment
vercel --prod

# Preview deployment
vercel
```

### 2. Railway (Backend)

#### Setup

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init
```

#### Configuration

```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 300
```

#### Deploy

```bash
# Deploy to production
railway up

# Check logs
railway logs
```

### 3. Docker Deployment

#### Dockerfile

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --production

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["npm", "run", "start:prod"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3001:3001'
      - '5173:5173'
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

#### Deploy with Docker

```bash
# Build image
docker build -t restaurant-os .

# Run container
docker run -d \
  --name restaurant-os \
  -p 3001:3001 \
  -p 5173:5173 \
  --env-file .env.production \
  restaurant-os

# Using docker-compose
docker-compose up -d
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

  deploy-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        uses: berviantoleo/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

## Database Migrations

### Setup

```bash
# Install migration tool
npm install -g knex

# Initialize migrations
knex init
```

### Migration Files

```javascript
// migrations/001_create_orders_table.js
exports.up = function (knex) {
  return knex.schema.createTable('orders', table => {
    table.uuid('id').primary()
    table.uuid('restaurant_id').notNullable()
    table.string('order_number').notNullable()
    table.string('status').notNullable()
    table.json('items').notNullable()
    table.decimal('total', 10, 2).notNullable()
    table.timestamps(true, true)

    table.index('restaurant_id')
    table.index('status')
    table.index('created_at')
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('orders')
}
```

### Run Migrations

```bash
# Run pending migrations
knex migrate:latest

# Rollback last batch
knex migrate:rollback

# Check migration status
knex migrate:status
```

## SSL Configuration

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/restaurant-os
server {
    listen 80;
    server_name app.restaurant-os.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.restaurant-os.com;

    ssl_certificate /etc/letsencrypt/live/app.restaurant-os.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.restaurant-os.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Let's Encrypt SSL

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d app.restaurant-os.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Performance Optimization

### CDN Setup (Cloudflare)

1. Add site to Cloudflare
2. Update DNS records
3. Configure caching rules:

```javascript
// Cloudflare Page Rules
*.js → Cache Level: Aggressive, TTL: 1 month
*.css → Cache Level: Aggressive, TTL: 1 month
*.png|jpg|gif → Cache Level: Standard, TTL: 1 week
/api/* → Cache Level: Bypass
/ws/* → Cache Level: Bypass
```

### Redis Caching

```javascript
// server/src/cache/redis.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

// Cache menu data
export async function cacheMenu(restaurantId: string, menu: any) {
  await redis.setex(
    `menu:${restaurantId}`,
    3600, // 1 hour TTL
    JSON.stringify(menu)
  )
}
```

## Monitoring

### Health Checks

```javascript
// server/src/routes/health.ts
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      websocket: checkWebSocket(),
    },
  }

  const isHealthy = Object.values(health.checks).every(v => v)

  res.status(isHealthy ? 200 : 503).json(health)
})
```

### Logging

```javascript
// Use structured logging
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'combined.log',
    }),
  ],
})
```

## Rollback Procedures

### Quick Rollback

```bash
# Vercel
vercel rollback

# Railway
railway rollback

# Docker
docker tag restaurant-os:latest restaurant-os:backup
docker run restaurant-os:previous-version
```

### Database Rollback

```bash
# Rollback last migration
knex migrate:rollback

# Restore from backup
pg_restore -d restaurant_os backup.sql
```

## Production Checklist

### Pre-deployment (⚠️ Currently Failing)

- [ ] **CRITICAL**: All tests passing (currently timeout)
- [ ] **CRITICAL**: TypeScript errors <100 (currently 560)
- [ ] **CRITICAL**: Split payment UI implemented
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Memory usage optimized (<4GB builds)
- [ ] Bundle size under target (<100KB main chunk)

### Post-deployment

- [ ] Health checks passing
- [ ] WebSocket connections working
- [ ] Payment processing functional
- [ ] Order flow tested end-to-end
- [ ] Performance metrics acceptable
- [ ] Error rates normal
- [ ] Rollback plan ready

## Scaling Strategy

### Horizontal Scaling

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: restaurant-os
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

### Database Scaling

```sql
-- Read replicas for reporting
CREATE PUBLICATION restaurant_os_pub FOR ALL TABLES;
CREATE SUBSCRIPTION restaurant_os_sub
  CONNECTION 'host=replica.db.com dbname=restaurant_os'
  PUBLICATION restaurant_os_pub;
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Check firewall rules
   - Verify nginx proxy configuration
   - Ensure sticky sessions for load balancing

2. **Memory Issues**

   ```bash
   # Increase Node.js memory
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

3. **Database Connection Pool**
   ```javascript
   // Increase pool size
   const pool = new Pool({
     max: 20,
     idleTimeoutMillis: 30000,
   })
   ```

## Security Considerations

### Production Security

```bash
# Disable source maps
GENERATE_SOURCEMAP=false npm run build

# Set security headers
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  }
})

# Rate limiting
rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})
```

## Support

For deployment issues:

- Check logs: `railway logs` or `vercel logs`
- Monitor health endpoint: `/health`
- Review error tracking in Sentry
- Contact DevOps team
