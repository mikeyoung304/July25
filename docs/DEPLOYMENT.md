# Deployment Guide

**Last Updated**: 2025-09-25

## Quick Start

### Deploy Frontend (Vercel)
```bash
npm run deploy
```

### Deploy Backend (Render)
Push to `main` branch - auto-deploys via GitHub integration.

## Architecture Overview

- **Frontend**: React SPA deployed to Vercel
- **Backend**: Node.js API deployed to Render
- **Database**: Supabase (managed service)
- **Monorepo**: Uses npm workspaces (client, server, shared)

## Environment Variables

### Frontend (Vercel)
Set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Production Value | Description |
|----------|-----------------|-------------|
| VITE_API_BASE_URL | https://july25.onrender.com | Backend API URL |
| VITE_SUPABASE_URL | [Your Supabase URL] | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | [Your Supabase Key] | Supabase anonymous key |
| VITE_DEFAULT_RESTAURANT_ID | 11111111-1111-1111-1111-111111111111 | Default restaurant |
| VITE_DEMO_PANEL | 1 | Enable demo panel (optional) |

### Backend (Render)
Set in Render Dashboard → Environment:

| Variable | Description |
|----------|-------------|
| PORT | 3001 (set by Render) |
| NODE_ENV | production |
| DATABASE_URL | PostgreSQL connection string |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Service role key (admin access) |
| JWT_SECRET | JWT signing secret |
| OPENAI_API_KEY | OpenAI API key |
| SQUARE_ACCESS_TOKEN | Square payment token |
| SQUARE_LOCATION_ID | Square location ID |
| SQUARE_APPLICATION_ID | Square application ID |

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing: `npm test`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No linting errors: `npm run lint`
- [ ] Environment variables configured
- [ ] Database migrations ready

### Frontend Deployment (Vercel)
1. **Verify Setup**
   ```bash
   npm run vercel:check
   ```

2. **Deploy**
   ```bash
   npm run deploy
   ```

3. **Verify**
   - Visit https://july25-client.vercel.app
   - Check browser console for errors
   - Test API connectivity

### Backend Deployment (Render)
1. **Push to Main**
   ```bash
   git push origin main
   ```

2. **Monitor**
   - Check Render dashboard for build status
   - View logs for any errors
   - Test endpoints at https://july25.onrender.com

### Post-Deployment
- [ ] Smoke test critical paths
- [ ] Check error monitoring (Sentry)
- [ ] Verify API endpoints
- [ ] Test authentication flow
- [ ] Confirm payments work

## Troubleshooting

### Vercel Issues

**Build fails with Rollup error**
- Already handled by ROLLUP_NO_NATIVE=1 in build command

**Blank page after deployment**
1. Check browser console for errors
2. Verify environment variables in Vercel dashboard
3. Ensure backend is running

**Wrong project linked**
```bash
rm -rf .vercel
vercel link --project july25-client --yes
```

### Render Issues

**Build timeout**
- Increase build timeout in Render settings
- Check for memory-intensive operations

**Database connection failed**
- Verify DATABASE_URL is correct
- Check Supabase connection pooling settings
- Ensure SSL mode is enabled

**Port binding error**
- Render sets PORT automatically
- Don't hardcode port in server code

## Rollback Procedures

### Vercel Rollback
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Render Rollback
1. Go to Render dashboard
2. Select the service
3. Click "Deploys" tab
4. Find previous successful deploy
5. Click "Rollback to this deploy"

## CI/CD Pipeline

### GitHub Actions
- **On PR**: Runs tests, linting, type checking
- **On main push**: Triggers Render deployment
- **Vercel**: Auto-deploys on push (preview for PRs, production for main)

### Local Testing
```bash
# Test production build locally
npm run build
npm run preview
# Visit http://localhost:4173
```

## Security Considerations

- Never commit `.env` files
- Use environment-specific variables
- Rotate secrets regularly
- Enable 2FA on all services
- Use service role keys only on backend
- Implement rate limiting
- Enable CORS properly

## Monitoring

### Health Checks
- Frontend: https://july25-client.vercel.app
- Backend: https://july25.onrender.com/health
- API Status: https://july25.onrender.com/api/status

### Logs
- **Vercel**: `vercel logs [deployment-url]`
- **Render**: View in dashboard or use Render CLI
- **Application**: Check Sentry for errors

## Contact & Support

- **Vercel Issues**: Check [docs/VERCEL.md](VERCEL.md)
- **Database Issues**: Check Supabase dashboard
- **Build Issues**: Review build logs in respective dashboards
- **Emergency**: Follow escalation procedures in team documentation