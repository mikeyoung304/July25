# Environment Variables Guide

**Last Updated**: 2025-09-25

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

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_BASE_URL | Backend API URL | http://localhost:3001 (dev) / https://july25.onrender.com (prod) |
| VITE_SUPABASE_URL | Supabase project URL | https://[project].supabase.co |
| VITE_SUPABASE_ANON_KEY | Supabase anonymous key | eyJ... |
| VITE_DEFAULT_RESTAURANT_ID | Default restaurant UUID | 11111111-1111-1111-1111-111111111111 |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| VITE_DEBUG_VOICE | Enable voice debug mode | false |
| VITE_USE_MOCK_DATA | Use mock data (dev only) | false |
| VITE_DEMO_PANEL | Show demo auth panel | 0 |
| VITE_SQUARE_APPLICATION_ID | Square application ID | - |
| VITE_SQUARE_LOCATION_ID | Square location ID | - |

## Backend Variables (Server)

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 3001 |
| NODE_ENV | Environment | development/production |
| DATABASE_URL | PostgreSQL connection | postgresql://... |
| SUPABASE_URL | Supabase project URL | https://[project].supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | Service role key (admin) | eyJ... |
| JWT_SECRET | JWT signing secret | [random string] |

### AI & Integrations
| Variable | Description | Required |
|----------|-------------|----------|
| OPENAI_API_KEY | OpenAI API key | Yes |
| DEEPGRAM_API_KEY | Deepgram API key | For voice |
| ELEVENLABS_API_KEY | ElevenLabs API key | For voice |
| ELEVENLABS_VOICE_ID | Voice ID | For voice |

### Payments
| Variable | Description | Required |
|----------|-------------|----------|
| SQUARE_ACCESS_TOKEN | Square API token | For payments |
| SQUARE_LOCATION_ID | Square location | For payments |
| SQUARE_APPLICATION_ID | Square app ID | For payments |
| SQUARE_WEBHOOK_SIGNATURE_KEY | Webhook verification | For payments |

### Optional Backend
| Variable | Description | Default |
|----------|-------------|---------|
| REDIS_URL | Redis connection | - |
| SENTRY_DSN | Error tracking | - |
| LOG_LEVEL | Logging level | info |
| ENABLE_CORS | Enable CORS | true |
| ALLOWED_ORIGINS | CORS origins | * |

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

## Support

For environment-specific issues:
- **Vercel**: Check [VERCEL.md](VERCEL.md)
- **Render**: Check deployment logs
- **Supabase**: Check connection settings
- **Local**: Verify `.env` file exists