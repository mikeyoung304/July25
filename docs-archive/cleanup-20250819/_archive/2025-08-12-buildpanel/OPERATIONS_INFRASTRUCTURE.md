# Operations & Infrastructure Guide

> Comprehensive guide for development setup, deployment, monitoring, and infrastructure management for Rebuild 6.0

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Build & Deployment](#build--deployment)
3. [Environment Configuration](#environment-configuration)
4. [Monitoring & Observability](#monitoring--observability)
5. [Security Measures](#security-measures)
6. [Performance Optimization](#performance-optimization)
7. [Infrastructure Requirements](#infrastructure-requirements)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Operational Runbooks](#operational-runbooks)

---

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For version control
- **Supabase Account**: For cloud database access
- **OpenAI API Key**: For AI/voice features

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd rebuild-6.0
   ```

2. **Install Dependencies**
   ```bash
   # Install all dependencies (root, client, and server)
   npm run install:all
   
   # Alternative: manual installation
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the **root directory** (not in client/ or server/):
   ```env
   # Backend Configuration
   PORT=3001
   NODE_ENV=development
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   OPENAI_API_KEY=your_openai_api_key
   DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
   
   # Frontend Configuration (VITE_ prefix required)
   VITE_API_BASE_URL=http://localhost:3001
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SQUARE_APP_ID=sandbox-sq0idb-xxxxx
   VITE_SQUARE_LOCATION_ID=L1234567890
   VITE_ENABLE_PERF=false  # Set to 'true' for performance monitoring
   
   # Database Configuration (for direct connection)
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   
   # Logging Configuration
   LOG_LEVEL=debug
   LOG_FORMAT=json
   
   # Security Configuration
   FRONTEND_URL=http://localhost:5173
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # BuildPanel AI Service Configuration
   USE_BUILDPANEL=true
   BUILDPANEL_URL=http://localhost:3003
   ```

4. **Database Setup**
   ```bash
   # Pull schema from cloud Supabase
   npx supabase db pull
   
   # Seed initial data (optional)
   cd server
   npm run seed:tables
   npm run seed:menu
   ```

5. **Upload Menu for Voice Ordering**
   ```bash
   cd server
   npm run upload:menu
   ```

### Starting Development

```bash
# Start both frontend and backend
npm run dev

# Alternative: Start with Supabase sync
npm run dev:supabase

# Individual services
npm run dev:client  # Frontend only (port 5173)
npm run dev:server  # Backend only (port 3001)
```

### Port Configuration

- **Frontend**: http://localhost:5173 (strict port enforcement)
- **Backend API**: http://localhost:3001
- **Frontend Preview**: http://localhost:4173 (for production builds)

**Note**: Ports are strictly enforced. If a port is in use:
```bash
# Kill process on specific port
lsof -ti:5173 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Or use the clean start command
cd client && npm run dev:clean
```

---

## Build & Deployment

### Production Build

1. **Full Build Process**
   ```bash
   # Build both client and server
   npm run build
   
   # Individual builds
   npm run build:client
   npm run build:server
   ```

2. **Build Output**
   - Client: `client/dist/` - Static files ready for CDN
   - Server: `server/dist/` - Compiled TypeScript to JavaScript

### Build Configuration

**Client Build (Vite)**:
- Target: ES2020 for modern browsers
- Chunk splitting: Vendor libraries separated
- Source maps: Enabled for debugging
- CSS: Code splitting enabled
- Assets: Inlined if <4KB

**Server Build (TypeScript)**:
- Target: ES2022
- Module: CommonJS
- Source maps: Enabled
- Incremental compilation: Enabled

### Deployment Process

#### 1. Pre-deployment Checks

```bash
# Run all quality gates
npm run lint:fix
npm run typecheck
npm test

# Verify no forbidden ports
npm run verify:ports

# Check integration
npm run check:integration
```

#### 2. Environment Variables

Production environment variables:
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com

# Use production Supabase instance
SUPABASE_URL=https://production-ref.supabase.co
SUPABASE_SERVICE_KEY=production_service_key

# BuildPanel AI Service (Production)
USE_BUILDPANEL=true
BUILDPANEL_URL=https://buildpanel.your-domain.com

# Security headers
FORCE_HTTPS=true
SECURE_COOKIES=true
```

#### 3. Deployment Steps

```bash
# 1. Build assets
npm run build

# 2. Copy server files
cp -r server/dist/* /path/to/deployment/
cp server/package.json /path/to/deployment/
cp server/package-lock.json /path/to/deployment/

# 3. Copy client files to CDN or static hosting
cp -r client/dist/* /path/to/static-hosting/

# 4. Install production dependencies
cd /path/to/deployment
npm ci --production

# 5. Start server
npm start
```

#### 4. Cloud Deployment Options

**Node.js Hosting**:
- Heroku, Railway, Render
- AWS EC2, ECS, or Lambda
- Google Cloud Run
- Azure App Service

**Static Hosting (Frontend)**:
- Vercel
- Netlify
- CloudFlare Pages
- AWS S3 + CloudFront

**Example: Railway Deployment**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy
railway up
```

---

## Environment Configuration

### Configuration Hierarchy

1. **Root `.env`** - Single source of truth
2. **Process environment** - Overrides .env values
3. **Default values** - Fallbacks in code

### Environment-Specific Settings

#### Development
```env
NODE_ENV=development
LOG_LEVEL=debug
CACHE_TTL_SECONDS=0  # Disable caching
RATE_LIMIT_MAX_REQUESTS=1000  # Higher limits
```

#### Staging
```env
NODE_ENV=staging
LOG_LEVEL=info
CACHE_TTL_SECONDS=300
RATE_LIMIT_MAX_REQUESTS=200
```

#### Production
```env
NODE_ENV=production
LOG_LEVEL=warn
CACHE_TTL_SECONDS=300
RATE_LIMIT_MAX_REQUESTS=100
FORCE_HTTPS=true
```

### Security Best Practices

1. **Never commit `.env` files**
2. **Use different keys for each environment**
3. **Rotate keys regularly**
4. **Use secrets management in production**:
   - AWS Secrets Manager
   - Google Secret Manager
   - Azure Key Vault
   - HashiCorp Vault

---

## Monitoring & Observability

### Client-Side Monitoring

#### Performance Monitoring

Enabled with `VITE_ENABLE_PERF=true`:

```typescript
// Automatic tracking of:
- Component render times
- API call performance
- Memory usage
- Web Vitals (CLS, FID, FCP, LCP, TTFB)
```

#### Error Tracking

```typescript
// Client-side logger captures:
- JavaScript errors
- API failures
- User context
- Error breadcrumbs
```

### Server-Side Monitoring

#### Prometheus Metrics

Available at `/metrics` endpoint:

```typescript
// HTTP metrics
- Request rate
- Response times
- Error rates
- Status code distribution

// Custom metrics
- Voice chunks processed
- Active WebSocket connections
- Cache hit rates
```

#### Health Checks

```bash
# Basic health check
GET /health

# Detailed system status
GET /health/status
```

Response includes:
- System uptime
- Database connectivity
- BuildPanel service connectivity
- Cache statistics
- Memory usage
- Version information

#### BuildPanel Service Monitoring

BuildPanel is an external AI service running on port 3003 that handles voice processing and AI-powered chat functionality.

**Health Check Endpoint**: `/health/status`

**BuildPanel Status Fields**:
```json
{
  "services": {
    "buildpanel": {
      "status": "connected|disconnected|error",
      "url": "http://localhost:3003",
      "error": "error message if applicable"
    }
  }
}
```

**Health Status Logic**:
- `healthy`: Database connected AND BuildPanel connected
- `degraded`: Database connected BUT BuildPanel disconnected OR high latency
- `unhealthy`: Database disconnected OR BuildPanel error

#### Structured Logging

Winston logger configuration:
```json
{
  "level": "info",
  "format": "json",
  "transports": ["console", "file"],
  "metadata": {
    "service": "rebuild-backend",
    "environment": "production"
  }
}
```

### Monitoring Setup

#### 1. Local Development

```bash
# View logs
npm run dev 2>&1 | tee dev.log

# Monitor performance
curl http://localhost:3001/metrics

# Check health
curl http://localhost:3001/health
```

#### 2. Production Monitoring Stack

**Recommended Tools**:
- **Metrics**: Prometheus + Grafana
- **Logs**: ELK Stack or CloudWatch
- **APM**: New Relic or DataDog
- **Uptime**: Pingdom or UptimeRobot

**Example Prometheus Config**:
```yaml
scrape_configs:
  - job_name: 'rebuild-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Alert Configuration

#### Critical Alerts
- Service completely down > 2 minutes
- Database connection failures
- BuildPanel service unreachable > 5 minutes
- Error rate > 5% for 5 minutes
- Memory usage > 90%
- Disk space < 5%

#### Warning Alerts
- Response time > 1s for 10 minutes
- BuildPanel health check failures (intermittent)
- Memory usage > 80%
- Disk space < 10%
- Error rate > 1% for 5 minutes

#### BuildPanel-Specific Alerts
- **Critical**: BuildPanel service down > 5 minutes (AI features unavailable)
- **Warning**: BuildPanel response time > 30s (voice processing slow)
- **Info**: BuildPanel health check failed once (network hiccup)

---

## Security Measures

### Authentication & Authorization

1. **JWT-based Authentication**
   - Supabase manages JWT tokens
   - Tokens include restaurant_id claim
   - 1-hour expiration with refresh tokens

2. **Multi-tenancy Security**
   - Row Level Security (RLS) in database
   - Restaurant ID validation in middleware
   - Tenant isolation at all layers

### API Security

#### Rate Limiting
```typescript
// Configuration per endpoint type
General API: 100 req/min
AI endpoints: 30 req/min
Voice upload: 10 req/min
```

#### Request Validation
- Joi schema validation
- Input sanitization
- File type verification
- Size limits enforcement

#### CORS Configuration
```typescript
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Restaurant-ID']
})
```

### OpenAI Security Boundary

**Critical Rule**: OpenAI API keys are **NEVER** exposed to the frontend.

#### Implementation
1. No OpenAI imports in client code
2. No VITE_OPENAI_API_KEY (would expose to browser)
3. All AI operations through authenticated backend endpoints
4. Pre-commit hooks enforce security

#### Security Checks
```bash
# Run security audit
./scripts/check-buildpanel-security.sh

# Pre-commit hook automatically checks
git commit  # Runs security checks
```

### Infrastructure Security

1. **HTTPS Enforcement**
   - SSL/TLS certificates required
   - HSTS headers enabled
   - Secure cookie flags

2. **Security Headers**
   ```typescript
   helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         scriptSrc: ["'self'", "'unsafe-inline'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         imgSrc: ["'self'", "data:", "https:"],
       }
     }
   })
   ```

3. **Secrets Management**
   - Environment variables for local dev
   - Cloud provider secrets for production
   - Regular key rotation
   - Audit logging

---

## Performance Optimization

### Frontend Optimization

#### Build Optimization
- **Code Splitting**: Vendor chunks separated
- **Tree Shaking**: Unused code eliminated
- **Minification**: Terser for smaller bundles
- **Compression**: Gzip/Brotli for assets

#### Runtime Optimization
```typescript
// Lazy loading
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

// Memoization
const ExpensiveComponent = memo(({ data }) => {
  // Component logic
})

// Virtualization for long lists
import { FixedSizeList } from 'react-window'
```

#### Asset Optimization
- Images: WebP format, responsive sizes
- Fonts: Subset, preload critical fonts
- CSS: Critical CSS inlined, rest async

### Backend Optimization

#### Caching Strategy
```typescript
// Menu cache: 5 minutes
menuCache.set(key, data, 300)

// Database query caching
const cached = await cache.get(`orders:${restaurantId}`)
if (cached) return cached
```

#### Database Optimization
- Connection pooling
- Prepared statements
- Indexed queries
- Batch operations

#### API Optimization
- Response compression
- Field filtering
- Pagination
- ETags for caching

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.8s | Lighthouse |
| Time to Interactive | < 3.9s | Lighthouse |
| API Response Time (cached) | < 100ms | Server metrics |
| API Response Time (uncached) | < 500ms | Server metrics |
| WebSocket Latency | < 50ms | Client metrics |

### Performance Monitoring

```bash
# Analyze bundle size
cd client && npm run analyze

# Run Lighthouse audit
npx lighthouse http://localhost:5173

# Monitor server metrics
curl http://localhost:3001/metrics | grep http_request_duration
```

---

## Infrastructure Requirements

### Minimum Requirements

#### Development Environment
- CPU: 2 cores
- RAM: 4GB
- Disk: 10GB free space
- Network: Stable internet for Supabase

#### Production Server
- CPU: 4 cores (8 recommended)
- RAM: 8GB (16GB recommended)
- Disk: 50GB SSD
- Network: 100Mbps+ bandwidth

### Scaling Considerations

#### Horizontal Scaling
```yaml
# Load balancer configuration
upstream backend {
  server backend1:3001;
  server backend2:3001;
  server backend3:3001;
}

# Sticky sessions for WebSocket
ip_hash;
```

#### Vertical Scaling Triggers
- CPU usage > 80% sustained
- Memory usage > 80%
- Response time degradation
- Queue depth increasing

### Database Requirements

**Supabase Cloud**:
- Automatic backups
- Point-in-time recovery
- Read replicas for scaling
- Connection pooling

**Recommended Tier**:
- Development: Free tier
- Production: Pro tier minimum
- High volume: Custom enterprise

### CDN Requirements

**Static Assets**:
- Global distribution
- Auto-compression
- Cache invalidation API
- SSL included

**Recommended Providers**:
- CloudFlare (integrated with security)
- AWS CloudFront
- Fastly

---

## Troubleshooting Guide

### Common Issues

#### 1. Port Already in Use
```bash
# Error: EADDRINUSE: address already in use :::3001

# Solution:
lsof -ti:3001 | xargs kill -9
# Or find the process
lsof -i :3001
kill -9 <PID>
```

#### 2. Database Connection Failed
```bash
# Check environment variables
echo $DATABASE_URL
echo $SUPABASE_URL

# Test connection
npx supabase db remote list

# Common fixes:
- Verify Supabase project is active
- Check network connectivity
- Validate credentials
- Review RLS policies
```

#### 3. BuildPanel Service Issues
```bash
# Error: BuildPanel service unreachable
# Solution:
1. Check if BuildPanel is running: curl http://localhost:3003/health
2. Verify BUILDPANEL_URL environment variable
3. Check network connectivity between services
4. Review BuildPanel service logs
5. Restart BuildPanel service if needed

# Error: BuildPanel timeouts
# Solution:
1. Check BuildPanel service load
2. Increase timeout in buildpanel.service.ts
3. Monitor BuildPanel response times
4. Scale BuildPanel service if needed
```

#### 4. Voice Ordering Not Working
```bash
# Checklist:
1. Verify BuildPanel service is running: curl http://localhost:3003/health
2. Check USE_BUILDPANEL=true and BUILDPANEL_URL are set
3. Test BuildPanel connectivity: curl http://localhost:3001/health/status
4. Test microphone permissions
5. Review console for errors
6. Check BuildPanel service logs
```

#### 5. Build Failures
```bash
# TypeScript errors
npm run typecheck

# Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build

# Check for circular dependencies
npx madge --circular src/
```

#### 6. Performance Issues
```bash
# Frontend profiling
1. Open Chrome DevTools
2. Performance tab > Record
3. Identify long tasks

# Backend profiling
NODE_ENV=development node --inspect server/dist/server.js
# Open chrome://inspect
```

### Debugging Tools

```bash
# API Testing
curl -X GET http://localhost:3001/health
curl -X GET http://localhost:3001/api/v1/menu \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"

# WebSocket Testing
wscat -c ws://localhost:3001

# Database Queries
npx supabase db reset  # Reset to clean state
npx supabase db seed   # Re-seed data
```

### Log Analysis

```bash
# View server logs
tail -f logs/combined.log | jq '.'

# Filter errors
grep ERROR logs/combined.log | jq '.message'

# Search for specific request
grep "req_id" logs/combined.log | jq '. | select(.req_id == "xxx")'
```

---

## Operational Runbooks

### Daily Operations

#### Morning Checklist
1. Check overnight alerts
2. Review error logs
3. Verify all services healthy
4. Check disk space
5. Review performance metrics

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

echo "🏥 Running Health Checks..."

# API Health
API_HEALTH=$(curl -s http://localhost:3001/health | jq -r '.status')
echo "API Status: $API_HEALTH"

# Database Health
DB_HEALTH=$(curl -s http://localhost:3001/health/status | jq -r '.services.database.status')
echo "Database Status: $DB_HEALTH"

# BuildPanel Health
BP_HEALTH=$(curl -s http://localhost:3001/health/status | jq -r '.services.buildpanel.status')
echo "BuildPanel Status: $BP_HEALTH"

# Disk Space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
echo "Disk Usage: $DISK_USAGE"

# Memory Usage
MEM_USAGE=$(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')
echo "Memory Usage: $MEM_USAGE"
```

### Deployment Runbook

#### Pre-deployment
```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Run tests
npm test

# 3. Check integration
npm run check:integration

# 4. Tag release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

#### Deployment Steps
```bash
# 1. Build application
npm run build

# 2. Deploy backend
scp -r server/dist/* user@server:/app/
ssh user@server "cd /app && npm install --production"

# 3. Deploy frontend
aws s3 sync client/dist/ s3://your-bucket/
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"

# 4. Restart services
ssh user@server "pm2 restart rebuild-backend"

# 5. Verify deployment
./scripts/verify-deployment.sh
```

#### Rollback Procedure
```bash
# 1. Switch to previous version
cd /app
git checkout previous-tag

# 2. Rebuild and restart
npm install --production
pm2 restart rebuild-backend

# 3. Clear CDN cache
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"

# 4. Restore database if needed
psql $DATABASE_URL < backup_20240101.sql
```

### Incident Response

#### P1 - Service Down
1. Check service status
2. Review recent deployments
3. Check error logs
4. Restart service if needed
5. Rollback if deployment-related
6. Update status page

#### P2 - Performance Degradation
1. Check metrics dashboard
2. Identify bottleneck
3. Scale resources if needed
4. Clear caches
5. Review slow queries
6. Apply fixes

#### P3 - Minor Issues
1. Log incident
2. Create fix ticket
3. Schedule maintenance
4. Communicate timeline

### Maintenance Tasks

#### Weekly
- Review and rotate logs
- Update dependencies (security patches)
- Database vacuum/analyze
- Cache cleanup
- Backup verification

#### Monthly
- Full system backup
- Security audit
- Performance review
- Capacity planning
- Documentation update

#### Quarterly
- Disaster recovery test
- Load testing
- Security penetration test
- Architecture review

### Monitoring Commands

```bash
# Real-time metrics
watch -n 1 'curl -s localhost:3001/metrics | grep -E "(http_request|voice_|memory)"'

# Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Active WebSocket connections
curl -s localhost:3001/metrics | grep voice_active_connections

# Error rate
tail -f logs/error.log | grep -c ERROR

# API response times
grep "http_request_duration" logs/combined.log | jq -r '.duration' | awk '{sum+=$1; count++} END {print sum/count}'
```

---

## Automation Scripts

### Integration Check
Location: `scripts/integration-check.ts`
- Validates environment configuration
- Tests API health
- Checks database connectivity

### OpenAI Security Check
Location: `scripts/check-buildpanel-security.sh`
- Prevents client-side AI key exposure
- Enforces security boundary
- Runs on pre-commit

### Development Helper
Location: `scripts/dev-with-supabase.sh`
- Checks Supabase authentication
- Syncs database schema
- Starts development environment

---

## Support & Resources

### Documentation
- [Architecture Overview](../ARCHITECTURE.md)
- [API Reference](./API.md)
- [Security Guide](./SECURITY_BUILDPANEL.md)
- [Voice Ordering Guide](./VOICE_ORDERING_GUIDE.md)

### Monitoring Dashboards
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- Application Metrics: http://localhost:3001/metrics

### Common Commands Reference
```bash
# Development
npm run dev                 # Start everything
npm run dev:clean          # Clean start
npm test                   # Run tests
npm run lint:fix           # Fix linting

# Build & Deploy
npm run build              # Build all
npm run typecheck          # Type checking
npm run verify:ports       # Port validation

# Database
npx supabase db pull       # Sync schema
npm run seed:menu          # Seed menu data
npm run upload:menu        # Upload to AI

# Monitoring
npm run check:integration  # System health
curl localhost:3001/health # Quick health check
```

---

**Last Updated**: January 2025  
**Maintained By**: DevOps Team  
**Version**: 1.0.0