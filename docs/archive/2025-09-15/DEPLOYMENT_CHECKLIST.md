# Deployment Checklist

## Pre-Deployment Checks

### Code Quality ✅
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] ESLint checks passing (`npm run lint:fix`)
- [ ] Code coverage meets requirements (60% statements, 50% branches)
- [ ] Bundle size within targets (main chunk <100KB)
- [ ] Memory usage optimized (<4GB build)

### Security Audit ✅
- [ ] Dependency vulnerability scan (`npm audit`)
- [ ] No hardcoded secrets or API keys
- [ ] CORS configuration reviewed
- [ ] Authentication scopes validated
- [ ] Rate limiting configured
- [ ] CSRF protection enabled

### Performance Validation ✅
- [ ] Bundle analysis completed (`npm run analyze`)
- [ ] Lighthouse audit passed (>90 performance score)
- [ ] Memory leak tests passed (`npm run test:memory`)
- [ ] Database query performance validated
- [ ] WebSocket connection stability tested

### Business Logic Verification ✅
- [ ] All 7 order statuses handled in KDS
- [ ] Payment processing tested with all methods
- [ ] Voice ordering WebRTC functionality validated
- [ ] Multi-tenancy restaurant_id context verified
- [ ] UnifiedCartContext integration complete

## Environment Configuration

### Production Environment Variables

```bash
# Application
NODE_ENV=production
APP_VERSION=6.0.3
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication (v6.0.4 - NO DEFAULTS ALLOWED)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret  # From Supabase dashboard
PIN_PEPPER=generate-64-char-random-string      # Required for PIN auth
STATION_TOKEN_SECRET=generate-64-char-random   # Required for station auth
DEVICE_FINGERPRINT_SALT=generate-64-char-random # Required for device auth
KIOSK_JWT_SECRET=generate-64-char-random       # Required for kiosk auth

# External Services
OPENAI_API_KEY=your-openai-api-key
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook

# Redis (for caching/sessions)
REDIS_URL=redis://username:password@host:port

# Email Service
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password

# File Storage (if using external storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket
```

### Environment Variable Validation

```typescript
// server/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  APP_VERSION: z.string(),
  FRONTEND_URL: z.string().url(),
  BACKEND_URL: z.string().url(),
  
  // Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_KEY: z.string(),
  DATABASE_URL: z.string().url(),
  
  // Authentication (v6.0.4)
  SUPABASE_JWT_SECRET: z.string().min(32),
  PIN_PEPPER: z.string().min(64),
  STATION_TOKEN_SECRET: z.string().min(64),
  DEVICE_FINGERPRINT_SALT: z.string().min(64),
  KIOSK_JWT_SECRET: z.string().min(64),
  
  // External Services
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  
  // Redis
  REDIS_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

### SSL/TLS Certificate Setup

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Migration Steps

### Pre-Migration Backup

```bash
# Create full database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
pg_restore --list backup_$(date +%Y%m%d_%H%M%S).sql
```

### Migration Execution

```bash
# Run pending migrations
npm run db:migrate

# Verify migration status
npm run db:migrate:status

# Seed initial data if needed
npm run db:seed:production
```

### Post-Migration Validation

```sql
-- Verify critical tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
AND n_distinct > 100 
ORDER BY n_distinct DESC;

-- Validate foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f';
```

## Build & Deployment Process

### Automated Build Pipeline

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Starting deployment process..."

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci --production

# 3. Run quality checks
npm run typecheck
npm run lint:check
npm test -- --coverage

# 4. Build optimized production bundle
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 5. Run post-build validations
npm run validate:build

# 6. Deploy to production
npm run deploy:production

echo "✅ Deployment completed successfully!"
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build the app
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3001
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: restaurant-os
  labels:
    app: restaurant-os
spec:
  replicas: 3
  selector:
    matchLabels:
      app: restaurant-os
  template:
    metadata:
      labels:
        app: restaurant-os
    spec:
      containers:
      - name: app
        image: restaurant-os:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Post-Deployment Verification

### Health Check Validation

```bash
# Basic health check
curl -f https://api.your-domain.com/health || exit 1

# Detailed health verification
curl -s https://api.your-domain.com/health | jq '.checks' | grep -q '"database":true'
curl -s https://api.your-domain.com/health | jq '.checks' | grep -q '"websocket":true'
```

### Functional Testing

```bash
#!/bin/bash
# scripts/post-deploy-tests.sh

API_BASE="https://api.your-domain.com"
FRONTEND_BASE="https://your-domain.com"

# Test API endpoints
echo "Testing API endpoints..."
curl -f "$API_BASE/api/v1/restaurants" || exit 1
curl -f "$API_BASE/api/v1/menu" || exit 1
curl -f "$API_BASE/api/v1/orders" || exit 1

# Test WebSocket connection
echo "Testing WebSocket connection..."
node scripts/test-websocket.js || exit 1

# Test frontend loading
echo "Testing frontend..."
curl -f "$FRONTEND_BASE" | grep -q "Restaurant OS" || exit 1

# Test voice API
echo "Testing voice functionality..."
curl -f "$API_BASE/api/v1/realtime/session" || exit 1

echo "✅ All post-deployment tests passed!"
```

### Database Connection Verification

```sql
-- Test database connectivity and performance
SELECT 
  current_database(),
  current_user,
  version(),
  now();

-- Verify critical data
SELECT COUNT(*) as restaurant_count FROM restaurants;
SELECT COUNT(*) as menu_items_count FROM menu_items;
SELECT COUNT(*) as orders_today FROM orders 
WHERE created_at >= CURRENT_DATE;

-- Check for any locks or blocking queries
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity 
WHERE state = 'active';
```

### Performance Validation

```bash
# Load testing with Artillery
npx artillery quick --duration 60 --rate 10 https://api.your-domain.com/health

# Frontend performance audit
npx lighthouse https://your-domain.com --output json --output-path lighthouse-report.json

# Bundle size validation
npm run analyze | grep "Main chunk" | awk '{print $3}' | sed 's/KB//' | awk '{if($1 > 100) exit 1}'
```

## Rollback Strategy

### Database Rollback

```bash
# Create rollback script before deployment
pg_dump $DATABASE_URL > pre_deploy_backup.sql

# If rollback needed:
# 1. Stop application
systemctl stop restaurant-os

# 2. Restore database
dropdb restaurant_os_production
createdb restaurant_os_production
psql restaurant_os_production < pre_deploy_backup.sql

# 3. Deploy previous version
git checkout previous-stable-tag
npm run deploy
```

### Application Rollback

```bash
# Blue-green deployment rollback
# Switch load balancer back to previous version
aws elbv2 modify-target-group --target-group-arn $BLUE_TARGET_GROUP

# Docker rollback
docker service update --image restaurant-os:previous-tag restaurant-os-service

# Kubernetes rollback
kubectl rollout undo deployment/restaurant-os
```

## Monitoring Setup Verification

### Sentry Integration Check

```bash
# Test Sentry integration
curl -X POST "$API_BASE/test/sentry" \
  -H "Content-Type: application/json" \
  -d '{"test": "error"}'

# Verify error appears in Sentry dashboard
```

### Alert Configuration Test

```bash
# Trigger test alerts
curl -X POST "$API_BASE/test/alert/critical"
curl -X POST "$API_BASE/test/alert/warning"

# Verify alerts received via Slack/Email
```

## Security Verification

### SSL/TLS Validation

```bash
# Check SSL certificate
curl -vI https://your-domain.com 2>&1 | grep "SSL certificate verify ok"

# Test SSL rating
curl -s "https://api.ssllabs.com/api/v3/analyze?host=your-domain.com&publish=off" | jq '.endpoints[0].grade'
```

### Security Headers Check

```bash
# Verify security headers
curl -I https://your-domain.com | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)"
```

## Final Deployment Checklist

### Critical Systems ✅
- [ ] Application servers healthy
- [ ] Database connections stable  
- [ ] WebSocket connections working
- [ ] Payment processing functional
- [ ] Voice ordering operational
- [ ] Kitchen Display System responsive

### Monitoring & Alerts ✅
- [ ] Sentry error tracking active
- [ ] Health checks returning 200
- [ ] Performance monitoring enabled
- [ ] Critical alerts configured
- [ ] Business metrics tracking

### Business Continuity ✅
- [ ] Order flow end-to-end tested
- [ ] Payment processing verified
- [ ] Multi-tenant functionality confirmed
- [ ] Data backup completed
- [ ] Rollback plan documented

### Documentation ✅
- [ ] Deployment notes updated
- [ ] Environment variables documented
- [ ] Monitoring dashboards configured
- [ ] Incident response procedures ready
- [ ] Team notifications sent

## Emergency Contacts

```
Production Issues: engineering-oncall@company.com
Database Issues: dba-team@company.com
Security Issues: security-team@company.com
Business Critical: management@company.com

Escalation Chain:
1. On-call Engineer
2. Engineering Manager
3. CTO
4. Executive Team
```