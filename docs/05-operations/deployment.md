# Deployment Guide

## Overview

Restaurant OS uses a modern cloud deployment strategy with separate hosting for frontend and backend services.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel CDN    │────▶│  React Frontend │────▶│     Users       │
│  (Edge Network) │     │   (Port 5173)   │     │   (Browsers)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Render      │────▶│ Express Backend │────▶│    Supabase     │
│   (Container)   │     │   (Port 3001)   │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository connected

### Configuration

1. **Connect Repository**
   ```bash
   vercel link
   ```

2. **Environment Variables**
   Set in Vercel Dashboard:
   ```
   VITE_API_BASE_URL=https://api.your-domain.com
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Build Settings**
   ```json
   {
     "buildCommand": "cd client && npm run build",
     "outputDirectory": "client/dist",
     "installCommand": "npm install"
   }
   ```

### Deploy Commands

```bash
# Production deployment
vercel --prod

# Preview deployment
vercel

# Deploy specific branch
vercel --prod --scope=your-team
```

### Vercel Configuration File

Create `vercel.json` in project root:
```json
{
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

## Backend Deployment (Render)

### Prerequisites
- Render account
- GitHub repository connected

### Configuration

1. **Create Web Service**
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`
   - Port: 3001

2. **Environment Variables**
   Set in Render Dashboard:
   ```
   NODE_ENV=production
   PORT=3001
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   OPENAI_API_KEY=sk-...
   SQUARE_ACCESS_TOKEN=your-token
   SQUARE_ENVIRONMENT=production
   ```

3. **Health Check**
   - Path: `/api/v1/health`
   - Expected: 200 OK

### Deploy Script

Create `render.yaml`:
```yaml
services:
  - type: web
    name: restaurant-os-api
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
    healthCheckPath: /api/v1/health
```

## Database Setup (Supabase)

### Initial Setup

1. **Create Project**
   ```bash
   npx supabase init
   npx supabase link --project-ref your-project-ref
   ```

2. **Run Migrations**
   ```bash
   npx supabase db push
   ```

3. **Configure RLS**
   ```sql
   -- Enable Row Level Security
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
   
   -- Create policies
   CREATE POLICY "Restaurant isolation" ON orders
   FOR ALL USING (restaurant_id = current_setting('app.restaurant_id')::uuid);
   ```

### Backup Strategy

```bash
# Create backup
npx supabase db dump -f backup.sql

# Restore backup
npx supabase db restore -f backup.sql
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run typecheck

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

## SSL/HTTPS Configuration

### Frontend (Vercel)
- Automatic SSL provisioning
- Force HTTPS redirect enabled by default

### Backend (Render)
- Automatic SSL certificate
- Configure CORS for production domain:
  ```typescript
  app.use(cors({
    origin: 'https://your-frontend.vercel.app',
    credentials: true
  }));
  ```

## Environment Management

### Development
```env
NODE_ENV=development
API_BASE_URL=http://localhost:3001
```

### Staging
```env
NODE_ENV=staging
API_BASE_URL=https://staging-api.your-domain.com
```

### Production
```env
NODE_ENV=production
API_BASE_URL=https://api.your-domain.com
```

## Monitoring

### Health Checks

1. **Frontend Health**
   ```bash
   curl https://your-app.vercel.app/health
   ```

2. **Backend Health**
   ```bash
   curl https://api.your-domain.com/api/v1/health
   ```

3. **Database Health**
   ```bash
   curl https://your-project.supabase.co/rest/v1/
   ```

### Logging

- **Frontend**: Vercel Functions logs
- **Backend**: Render logs dashboard
- **Database**: Supabase logs explorer

### Alerts

Configure alerts for:
- Response time > 2 seconds
- Error rate > 1%
- Memory usage > 80%
- Failed health checks

## Rollback Procedures

### Frontend Rollback
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Backend Rollback
- Use Render dashboard to redeploy previous commit
- Or trigger via API:
  ```bash
  curl -X POST https://api.render.com/v1/services/{service-id}/deploys \
    -H "Authorization: Bearer {api-key}" \
    -d '{"commitId": "previous-commit-hash"}'
  ```

### Database Rollback
```bash
# Restore from backup
npx supabase db restore -f backup.sql
```

## Scaling

### Horizontal Scaling
- **Frontend**: Automatic via Vercel Edge Network
- **Backend**: Upgrade Render plan for multiple instances
- **Database**: Supabase auto-scaling

### Vertical Scaling
- **Backend**: Adjust Render instance size
- **Database**: Upgrade Supabase plan

## Security Checklist

- [ ] All environment variables set
- [ ] HTTPS enabled on all services
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Database RLS policies active
- [ ] API keys rotated regularly
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented

## Cost Optimization

### Estimated Monthly Costs
- **Vercel**: $0-20 (Free tier usually sufficient)
- **Render**: $7-25 (Starter plan)
- **Supabase**: $0-25 (Free tier for development)
- **Total**: $7-70/month

### Cost Saving Tips
1. Use Vercel's free tier for frontend
2. Start with Render's starter plan
3. Use Supabase free tier for development
4. Enable caching where possible
5. Optimize bundle sizes