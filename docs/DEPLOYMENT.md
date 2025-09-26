# Deployment Guide

This guide covers deploying Restaurant OS to production environments.

## Quick Deploy

### Frontend (Vercel)
```bash
# Deploy to Vercel
npm run deploy
```

### Backend (Render)
```bash
# Deploy to Render
git push origin main
```

## Environment Variables

### Frontend (Vercel)
Required environment variables for the client:

```bash
VITE_API_BASE_URL=https://your-backend-url.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_SQUARE_APPLICATION_ID=your-square-app-id
VITE_SQUARE_LOCATION_ID=your-square-location-id
```

### Backend (Render)
Required environment variables for the server:

```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=your-openai-key
SQUARE_ACCESS_TOKEN=your-square-token
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-key
```

## Production Deployment

### Prerequisites
- Node.js 20.x
- npm 10.7.0+
- Vercel CLI installed
- Render account configured
- Supabase project setup

### Step-by-Step Deployment

#### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure production environment variables
# See ENVIRONMENT.md for complete variable reference
```

#### 2. Build Verification
```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run tests
npm test

# Build both client and server
npm run build:full
```

#### 3. Database Setup
```bash
# Apply database migrations
npm run db:push

# Seed initial data (if needed)
npm run db:seed
```

#### 4. Frontend Deployment (Vercel)
```bash
# Link to Vercel project
npm run vercel:link

# Deploy to production
npm run deploy
```

#### 5. Backend Deployment (Render)
```bash
# Push to main branch (triggers auto-deploy)
git push origin main

# Monitor deployment in Render dashboard
```

## Deployment Checklist

### Pre-deployment
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build successful locally (`npm run build:full`)
- [ ] Security audit passed
- [ ] Performance benchmarks met

### Post-deployment
- [ ] Health check endpoints responding
- [ ] Database connectivity verified
- [ ] WebSocket connections working
- [ ] Payment processing functional
- [ ] Voice ordering operational
- [ ] Kitchen display systems active
- [ ] Authentication flows working

## Verification Steps

### Health Checks
```bash
# Frontend health
curl https://your-app.vercel.app/

# Backend health
curl https://your-api.onrender.com/api/health

# Voice system health
curl https://your-api.onrender.com/api/v1/ai/voice/handshake
```

### Functional Testing
- Test complete order flow
- Verify payment processing
- Check real-time updates
- Validate voice ordering
- Confirm multi-tenant isolation

## Troubleshooting

### Common Issues

**Build Failures**
- Check Node.js version (requires 20.x)
- Verify all dependencies installed (`npm install`)
- Check for TypeScript errors (`npm run typecheck`)
- Review memory limits (increase if needed)

**Runtime Errors**
- Verify environment variables are set
- Check database connection string
- Review application logs in Render/Vercel dashboards
- Validate JWT secret configuration

**Performance Issues**
- Monitor memory usage (should be <4GB)
- Check database query performance
- Review WebSocket connection counts
- Verify bundle size (<100KB main chunk)

**Voice Ordering Issues**
- Verify OpenAI API key is valid
- Check WebRTC connection setup
- Validate microphone permissions
- Review voice service logs

## Rollback Procedure

If deployment issues occur:

### 1. Immediate Rollback
```bash
# Vercel - rollback frontend
vercel rollback

# Render - use dashboard to rollback to previous deployment
# Or redeploy previous commit:
git revert HEAD
git push origin main
```

### 2. Database Rollback (if needed)
```bash
# Rollback database migrations
supabase db reset --linked
```

### 3. Verification After Rollback
- Test critical user flows
- Verify all systems operational
- Monitor error rates and performance

## CI/CD Pipeline

The deployment process is automated through GitHub Actions:

1. **Pull Request**: 
   - Runs tests and type checking
   - Builds client and server
   - Runs security scans
   - Performs bundle analysis

2. **Merge to Main**: 
   - Automatically deploys to production
   - Runs smoke tests
   - Updates deployment status

3. **Health Checks**: 
   - Verifies deployment success
   - Monitors key metrics
   - Alerts on failures

### Manual Deployment Override

If automated deployment fails:

```bash
# Frontend manual deploy
vercel --prod

# Backend manual deploy
git push render main

# Force rebuild
render deploy --service-id your-service-id
```

## Monitoring & Observability

### Health Endpoints
- Frontend: `https://your-app.vercel.app/`
- Backend API: `https://your-api.onrender.com/api/health`
- Voice Service: `https://your-api.onrender.com/api/v1/ai/voice/handshake`
- WebSocket: `wss://your-api.onrender.com/ws`

### Key Metrics to Monitor
- Response times (<200ms API, <2s page load)
- Error rates (<1% for critical flows)
- Memory usage (<4GB server)
- WebSocket connections
- Database query performance
- Voice ordering success rate

### Logging
- Vercel: Function logs in dashboard
- Render: Service logs in dashboard  
- Application: Structured JSON logging with Winston
- Database: Supabase logs and metrics

### Alerting
- Set up alerts for:
  - High error rates
  - Slow response times
  - Memory usage spikes
  - Database connection issues
  - Payment processing failures

## Security Considerations

### Production Security Checklist
- [ ] All secrets stored in environment variables
- [ ] HTTPS enforced on all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] JWT secrets rotated regularly
- [ ] Database RLS policies active
- [ ] Input validation on all endpoints
- [ ] Security headers configured

### Regular Maintenance
- Update dependencies monthly
- Rotate secrets quarterly
- Review access logs weekly
- Monitor security advisories
- Perform security audits

---

**Last Updated**: September 26, 2025  
**Version**: 6.0.6
