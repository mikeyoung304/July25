# Deployment Guide - MACON Restaurant AI

## Project Structure
- **Monorepo** with 3 workspaces: `client`, `server`, `shared`
- **Client**: Vite + React SPA (deployed to Vercel)
- **Server**: Node.js API (deployed to Render)
- **Shared**: TypeScript types/utilities (not directly deployed)

## Vercel Deployment (Frontend)

### Configuration
The project uses `vercel.json` for deployment configuration:
- **Build Command**: `cd client && npm install && npm run build`
- **Output Directory**: `client/dist`
- **Framework**: Vite
- **Rewrites**: SPA routing enabled

### Environment Variables Required
```env
VITE_API_BASE_URL=https://july25.onrender.com
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.com
VITE_SUPABASE_ANON_KEY=<your-key>
VITE_USE_MOCK_DATA=false
VITE_DEBUG_VOICE=false
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

### Deploy Commands

#### Via CLI
```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# Update environment variables
vercel env add VARIABLE_NAME production
```

#### Automatic Deployments
- Push to `main` branch triggers production deployment
- Pull requests create preview deployments

### Troubleshooting

#### Blank Page Issues
1. Check browser console for errors (F12)
2. View debug info at `window.__DEBUG__.getErrors()`
3. Common causes:
   - API server down
   - Missing environment variables
   - Third-party script blocking
   - CORS issues

#### Build Failures
1. Check build logs: `vercel logs <deployment-url>`
2. Verify Node version: Should be 20.x
3. Clear cache: `vercel --force`

## Local Development

### Setup
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Start development
npm run dev
```

### Testing Production Build Locally
```bash
cd client
npm run build
npm run preview
# Open http://localhost:4173
```

## CI/CD Pipeline

### Pre-deployment Checks
```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Deployment Script
```bash
#!/bin/bash
# deploy.sh

# 1. Run tests
npm test || exit 1

# 2. Build locally to verify
cd client && npm run build || exit 1

# 3. Deploy to Vercel
cd .. && vercel --prod --yes
```

## Monitoring

### Health Checks
- Frontend: `https://july25-client.vercel.app`
- API: `https://july25.onrender.com/health`

### Debug Mode
Debug script is automatically included in production to catch initialization errors.
Access debug info via browser console: `window.__DEBUG__`

## Rollback Procedure
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>

# Or use Vercel dashboard for instant rollback
```

## Security Notes
- All environment variables are encrypted in Vercel
- CSP headers configured for XSS protection
- Sensitive keys should never be committed to git
- Use `.env.local` for local development only

## Contact
For deployment issues, check:
1. Vercel Dashboard: https://vercel.com/dashboard
2. Build logs: `vercel logs`
3. GitHub Issues: https://github.com/your-repo/issues