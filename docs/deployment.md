# Deployment Guide

## Overview

This guide covers deploying the Rebuild 6.0 Restaurant OS to production environments. The application uses a unified backend architecture with a React frontend and Express.js backend.

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14+ or Supabase project
- **OpenAI service** deployed and accessible (REQUIRED for AI features)
- Domain with SSL certificate
- Server with at least 2GB RAM

## Environment Variables

### Backend (Required)

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Security
JWT_SECRET=your-jwt-secret-min-32-chars
CORS_ORIGIN=https://your-domain.com

# OpenAI Integration (REQUIRED for AI features)
USE_OPENAI=true
OPENAI_URL=https://buildpanel.your-domain.com

# Logging
LOG_LEVEL=info
```

### Frontend (Build Time)

```bash
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Build Process

### 1. Clone and Install

```bash
git clone https://github.com/your-org/rebuild-6.0.git
cd rebuild-6.0
npm install
```

### 2. Build Frontend

```bash
cd client
npm run build
# Output in client/dist/
```

### 3. Build Backend

```bash
cd ../server
npm run build
# Output in server/dist/
```

## Deployment Options

### Option 1: Traditional VPS (Recommended)

#### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
cd server
pm2 start dist/index.js --name "restaurant-os"

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        root /var/www/restaurant-os/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # OpenAI Service (if hosted locally)
    location /buildpanel {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 2: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server
RUN npm ci --production

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Option 3: Platform-as-a-Service

#### Heroku

```json
// package.json (root)
{
  "scripts": {
    "heroku-postbuild": "npm run build",
    "start": "cd server && node dist/index.js"
  }
}
```

#### Railway/Render

1. Connect GitHub repository
2. Set environment variables
3. Set build command: `npm run build`
4. Set start command: `cd server && node dist/index.js`

## Health Checks

### API Health Endpoint

```bash
GET /api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T00:00:00Z",
  "services": {
    "database": "connected",
    "buildpanel": "connected",
    "websocket": "active"
  }
}
```

### Monitoring Script

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="https://api.your-domain.com/api/v1/health"
SLACK_WEBHOOK="your-slack-webhook-url"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"⚠️ Restaurant OS is down!"}' \
    $SLACK_WEBHOOK
fi
```

## Database Migrations

```bash
# Run migrations before deployment
cd server
npm run migrate:latest

# Rollback if needed
npm run migrate:rollback
```

## Security Checklist

- [ ] Environment variables set and not committed
- [ ] HTTPS enabled with valid certificate
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection headers set
- [ ] Dependencies updated (`npm audit`)
- [ ] Secrets rotated regularly

## Performance Optimization

### 1. Enable Compression

```javascript
// server/src/index.js
import compression from 'compression';
app.use(compression());
```

### 2. Static Asset Caching

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Database Optimization

- Add indexes for frequently queried columns
- Use connection pooling
- Enable query result caching

## Rollback Procedure

1. **Quick Rollback** (< 5 minutes)
   ```bash
   pm2 restart restaurant-os --update-env
   pm2 reset restaurant-os
   ```

2. **Full Rollback**
   ```bash
   # Tag current version
   git tag -a v1.0.1-rollback -m "Pre-deployment backup"
   
   # Revert to previous version
   git checkout v1.0.0
   npm install
   npm run build
   pm2 restart restaurant-os
   ```

## Monitoring & Alerts

### Recommended Services

1. **Application Monitoring**: Sentry or Rollbar
2. **Uptime Monitoring**: UptimeRobot or Pingdom
3. **Log Management**: Loggly or Papertrail
4. **Performance**: New Relic or Datadog

### Key Metrics to Monitor

- Response time (p50, p95, p99)
- Error rate
- Active WebSocket connections
- Database query time
- Memory usage
- CPU usage

## Backup Strategy

### Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
rm backup_$DATE.sql
```

### Application Backups

- Git tags for each release
- Configuration in version control

## Troubleshooting

### Common Issues

1. **Port 3001 already in use**
   ```bash
   lsof -i :3001
   kill -9 <PID>
   ```

2. **WebSocket connection fails**
   - Check Nginx proxy headers
   - Verify CORS settings
   - Check firewall rules

3. **Database connection timeout**
   - Verify DATABASE_URL
   - Check SSL requirements
   - Confirm IP whitelist

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=production LOG_LEVEL=debug pm2 restart restaurant-os
```

## Post-Deployment Checklist

- [ ] Health check passes
- [ ] **OpenAI service connectivity verified**
- [ ] WebSocket connections work
- [ ] Voice ordering functional (requires OpenAI)
- [ ] Orders flow to kitchen display
- [ ] No console errors in browser
- [ ] Performance acceptable (< 3s load time)
- [ ] Monitoring alerts configured
- [ ] Backup job scheduled
- [ ] Team notified of deployment

---

*Last updated: January 2025 | Deployment Guide v1.0*