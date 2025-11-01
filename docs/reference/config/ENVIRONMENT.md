# Environment Variables Guide


**Last Updated:** 2025-11-01

**Last Updated**: 2025-10-31

## Overview

This project uses environment variables for configuration across different environments (development, staging, production). Variables are prefixed by service:
- `VITE_*` - Frontend (Vite/React)
- No prefix - Backend (Node.js)

## Quick Setup

### Development (.env)
```bash
# Copy example and configure
cp .env.example .env
# Edit .env with your values
```

### Production
- **Frontend**: Set in Vercel Dashboard
- **Backend**: Set in Render Dashboard

## Frontend Variables (Client)

All client-side variables **MUST** have the `VITE_` prefix to be accessible in the browser. Vite only exposes variables with this prefix for security.

### Required
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| VITE_API_BASE_URL | url | ✅ Yes | - | Backend API URL (http://localhost:3001 for dev) |
| VITE_SUPABASE_URL | url | ✅ Yes | - | Supabase project URL (https://[project].supabase.co) |
| VITE_SUPABASE_ANON_KEY | string | ✅ Yes | - | Supabase anonymous/public key for client-side auth |
| VITE_DEFAULT_RESTAURANT_ID | uuid | ✅ Yes | 11111111-1111-1111-1111-111111111111 | Default restaurant UUID |
| VITE_ENVIRONMENT | string | ✅ Yes | development | Environment mode (development/production) |

### Square Payment Integration
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| VITE_SQUARE_APP_ID | string | ✅ Yes (for payments) | - | Square application ID (Web SDK) |
| VITE_SQUARE_LOCATION_ID | string | ✅ Yes (for payments) | - | Square location ID for web payments |
| VITE_SQUARE_ENVIRONMENT | string | ✅ Yes (for payments) | sandbox | Square environment ('sandbox' or 'production') - must match server |

### AI & Voice Features
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| VITE_OPENAI_API_KEY | string | ❌ No | - | OpenAI API key for client-side voice WebRTC features |
| VITE_USE_REALTIME_VOICE | boolean | ❌ No | false | Enable real-time voice assistant features |

### Development & Debugging
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| VITE_DEBUG_VOICE | boolean | ❌ No | false | Enable voice/menu debugging logs |
| VITE_USE_MOCK_DATA | boolean | ❌ No | false | Use mock data instead of real API calls (dev only) |
| VITE_ENABLE_PERF | boolean | ❌ No | false | Enable performance monitoring and metrics |
| VITE_DEMO_PANEL | string | ❌ No | 0 | Enable demo authentication panel ('1' to enable, '0' to disable) |

## Backend Variables (Server)

### Required
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| PORT | number | ✅ Yes | 3001 | Server port number |
| NODE_ENV | string | ✅ Yes | development | Environment mode (development/production) |
| DATABASE_URL | string | ✅ Yes | - | PostgreSQL connection string |
| SUPABASE_URL | string | ✅ Yes | - | Supabase project URL (https://[project].supabase.co) |
| SUPABASE_ANON_KEY | string | ✅ Yes | - | Supabase anonymous/public key for client-side auth |
| SUPABASE_SERVICE_KEY | string | ✅ Yes | - | Supabase service role key (admin privileges, server-side only) |
| SUPABASE_JWT_SECRET | string | ✅ Yes | - | JWT secret for validating Supabase tokens (~88 chars, base64) |
| DEFAULT_RESTAURANT_ID | uuid | ✅ Yes | 11111111-1111-1111-1111-111111111111 | Default restaurant UUID for single-tenant operations |

### AI & Integrations
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| OPENAI_API_KEY | string | ✅ Yes | - | OpenAI API key for AI features and voice assistant |

### Payments
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| SQUARE_ACCESS_TOKEN | string | ✅ Yes (for payments) | - | Square API access token (sandbox: SB*, production: EAAA*) |
| SQUARE_LOCATION_ID | string | ✅ Yes (for payments) | - | Square location ID for payment processing |
| SQUARE_ENVIRONMENT | string | ✅ Yes | sandbox | Square environment ('sandbox' or 'production') |
| SQUARE_WEBHOOK_SIGNATURE_KEY | string | ❌ No | - | Square webhook signature verification key |

### Security & Authentication
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| PIN_PEPPER | string | ✅ Yes | - | Secret pepper for PIN hashing (generate random string) |
| DEVICE_FINGERPRINT_SALT | string | ✅ Yes | - | Salt for device fingerprinting in station auth |
| FRONTEND_URL | url | ✅ Yes | http://localhost:5173 | Frontend application URL for CORS configuration |
| AUTH_DUAL_AUTH_ENABLE | boolean | ❌ No | true | Enable dual auth (Supabase + localStorage sessions) for demo/PIN/station auth |
| AUTH_ACCEPT_KIOSK_DEMO_ALIAS | boolean | ❌ No | true | Accept 'kiosk_demo' role as 'customer' for backwards compatibility |

### Performance & Monitoring
| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| CACHE_TTL_SECONDS | number | ❌ No | 300 | Cache time-to-live in seconds (5 minutes) |
| RATE_LIMIT_WINDOW_MS | number | ❌ No | 60000 | Rate limit time window in milliseconds (1 minute) |
| RATE_LIMIT_MAX_REQUESTS | number | ❌ No | 100 | Maximum requests per rate limit window |
| LOG_LEVEL | string | ❌ No | info | Logging level (debug/info/warn/error) |
| LOG_FORMAT | string | ❌ No | json | Log output format ('json' or 'simple') |
| ALLOWED_ORIGINS | string | ❌ No | http://localhost:5173 | Comma-separated list of additional CORS origins (auto-detects Vercel/Render URLs) |
| SENTRY_DSN | string | ❌ No | - | Sentry DSN for error tracking and monitoring |

## Environment Files

### File Structure
```
.env                    # Local development (gitignored)
.env.example           # Template with all variables
.env.production       # Production values (gitignored)
.env.test             # Test environment
```

### Loading Priority
1. Process environment variables (highest)
2. .env.[NODE_ENV].local
3. .env.[NODE_ENV]
4. .env.local
5. .env (lowest)

## Security Best Practices

### DO
- ✅ Use `.env.example` as template
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use different values per environment
- ✅ Rotate secrets regularly
- ✅ Use strong, random secrets
- ✅ Store production secrets in platform dashboards

### DON'T
- ❌ Commit `.env` files
- ❌ Share secrets in chat/email
- ❌ Use production secrets in development
- ❌ Log sensitive variables
- ❌ Expose service role keys to frontend

## Platform-Specific Setup

### Vercel (Frontend)
1. Go to project settings
2. Navigate to "Environment Variables"
3. Add each `VITE_*` variable
4. Select environments (Production/Preview/Development)
5. Save and redeploy

### Render (Backend)
1. Go to service settings
2. Navigate to "Environment"
3. Add each backend variable
4. Save (triggers redeploy)

### Local Development
```bash
# Check current environment
npm run env:check

# Validate required variables
npm run env:validate
```

## Troubleshooting

### Variable Not Loading
1. Check variable name and prefix
2. Verify `.env` file location (project root)
3. Restart development server
4. Check for typos

### Production Issues
1. Verify in platform dashboard
2. Check build logs for warnings
3. Ensure no spaces/quotes in values
4. Redeploy after changes

### Common Mistakes
- Using `REACT_APP_` instead of `VITE_`
- Forgetting to restart after changes
- Quotes in `.env` files (usually not needed)
- Wrong environment selected in dashboard

## Variable Reference

### Generate Secrets
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate random UUID
uuidgen

# Generate secure password
openssl rand -base64 16
```

### Validate Setup
```bash
# Check frontend variables
cd client && npm run build

# Check backend variables
cd server && npm run start

# Test full stack
npm run dev
```

## Migration from v6.0.x

If upgrading from earlier versions:
1. Rename `REACT_APP_*` to `VITE_*`
2. Update `NEXT_PUBLIC_*` to `VITE_*`
3. Move server variables to root `.env`
4. Update platform dashboards

## Vercel Deployment Environment Setup

### Vercel Environment Variables Configuration

When deploying to Vercel, environment variables must be configured in the Vercel dashboard:

1. **Access Vercel Dashboard**
   - Go to your project in Vercel dashboard
   - Navigate to Settings → Environment Variables

2. **Required Variables for Production**
   ```bash
   VITE_API_BASE_URL=https://your-backend.onrender.com
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
   VITE_ENVIRONMENT=production
   VITE_SQUARE_APP_ID=your-square-app-id
   VITE_SQUARE_LOCATION_ID=your-square-location-id
   VITE_SQUARE_ENVIRONMENT=production
   ```

3. **Environment Targeting**
   - Set variables for "Production" environment
   - Optionally set different values for "Preview" and "Development"

### Common Vercel Issues

**Configuration Required Error**
- Ensure `VITE_API_BASE_URL` is set in Vercel production environment
- Use `vercel env ls production` to verify all required variables
- Redeploy after adding missing environment variables

**Build Failures**
- Verify all environment variables are set in Vercel dashboard
- Check build logs for missing dependencies
- Ensure Node.js version matches (20.x)

**Runtime Environment Issues**
- Variables must be prefixed with `VITE_` for client-side access
- Restart deployment after changing environment variables
- Check browser console for undefined environment variables

## Support

For environment-specific issues:
- **Vercel**: Use `vercel env ls production` to check variables
- **Render**: Check deployment logs
- **Supabase**: Check connection settings
- **Local**: Verify `.env` file exists

---

**Last Updated**: October 31, 2025
**Version**: 6.0.14
