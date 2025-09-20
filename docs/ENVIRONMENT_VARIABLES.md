# Environment Variables Documentation

## Overview

Restaurant OS v6.0.5 uses environment variables for configuration. This document describes all required and optional variables for both development and production environments.

## Required Variables

### Core Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `development`, `production`, `test` |
| `PORT` | Yes | Server port | `3001` |
| `FRONTEND_URL` | Yes | Frontend application URL | `http://localhost:5173` |

### Database & Supabase

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes (server) | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | `eyJhbGc...` |
| `SUPABASE_SERVICE_KEY` | Yes (server) | Supabase service role key | `eyJhbGc...` |
| `SUPABASE_JWT_SECRET` | Yes (server) | JWT verification secret | `your-jwt-secret` |

### Authentication & Security

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `KIOSK_JWT_SECRET` | Yes | Secret for kiosk/demo mode tokens | `32-char-hex-string` |
| `STATION_TOKEN_SECRET` | Yes | Secret for kitchen/expo station auth | `32-char-hex-string` |
| `PIN_PEPPER` | Yes | Additional security for PIN hashing | `random-pepper-string` |
| `DEVICE_FINGERPRINT_SALT` | Yes | Salt for device binding | `random-salt-string` |

### Restaurant Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DEFAULT_RESTAURANT_ID` | Yes | Default restaurant UUID | `11111111-1111-1111-1111-111111111111` |

### AI Services

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Conditional* | OpenAI API key for voice ordering | `sk-proj-...` |
| `OPENAI_REALTIME_MODEL` | No | OpenAI model for real-time voice | `gpt-4o-realtime-preview-2025-06-03` |
| `AI_DEGRADED_MODE` | No | Disable AI features if no key | `true` or `false` |

*Required unless `AI_DEGRADED_MODE=true`

### Payment Processing

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SQUARE_ACCESS_TOKEN` | Yes | Square API access token | `EAAAAE...` or `demo` |
| `SQUARE_ENVIRONMENT` | Yes | Square environment | `sandbox` or `production` |
| `SQUARE_LOCATION_ID` | Yes | Square location ID | `L0CATI0N1D` or `demo` |

## Client-Side Variables (Vite)

All client-side variables must be prefixed with `VITE_`:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | Backend API URL | `http://localhost:3001` |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | `eyJhbGc...` |
| `VITE_DEFAULT_RESTAURANT_ID` | Yes | Default restaurant UUID | `11111111-1111-1111-1111-111111111111` |
| `VITE_SQUARE_APP_ID` | Yes | Square application ID | `sq0idp-...` or `demo` |
| `VITE_SQUARE_LOCATION_ID` | Yes | Square location ID | `L0CATI0N1D` or `demo` |
| `VITE_SQUARE_ENVIRONMENT` | Yes | Square environment | `sandbox` or `production` |
| `VITE_USE_MOCK_DATA` | No | Use mock data (dev only) | `true` or `false` |
| `VITE_USE_REALTIME_VOICE` | No | Enable real-time voice | `true` or `false` |

## Optional Variables

### Performance & Monitoring

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging verbosity | `info` |
| `LOG_FORMAT` | Log output format | `json` |
| `CACHE_TTL_SECONDS` | Cache time-to-live | `300` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Environment Setup

### Development (.env)

```bash
# Core
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/restaurant_os
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Authentication
KIOSK_JWT_SECRET=development-kiosk-secret
STATION_TOKEN_SECRET=development-station-secret
PIN_PEPPER=development-pepper
DEVICE_FINGERPRINT_SALT=development-salt

# Restaurant
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# AI (optional in dev)
OPENAI_API_KEY=sk-proj-...
AI_DEGRADED_MODE=false

# Payments (demo mode)
SQUARE_ACCESS_TOKEN=demo
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=demo

# Client variables
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_SQUARE_APP_ID=demo
VITE_SQUARE_LOCATION_ID=demo
VITE_SQUARE_ENVIRONMENT=sandbox
```

### Production

```bash
# Core
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.com

# Database (use connection pooling)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require&pgbouncer=true

# All other required variables with production values...
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for all `_SECRET` and `_KEY` variables
3. **Rotate secrets regularly** in production
4. **Use different values** for development and production
5. **Store production secrets** in a secure vault (e.g., AWS Secrets Manager)
6. **Limit access** to production environment variables

## Generating Secure Secrets

```bash
# Generate a secure random secret (32 bytes hex)
openssl rand -hex 32

# Generate a JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Generate a UUID for restaurant IDs
node -e "console.log(require('crypto').randomUUID())"
```

## Validation

The application validates required environment variables on startup. If any required variables are missing, the server will:

1. Log detailed error messages
2. List all missing variables
3. Exit with code 1

To validate your configuration:

```bash
# Server validation
npm run validate:env

# Check current configuration
npm run config:show
```

## Multi-Tenancy Configuration

For multi-tenant deployments, each tenant requires:

1. Unique `DEFAULT_RESTAURANT_ID`
2. Separate database schema or connection
3. Isolated Supabase RLS policies
4. Per-tenant Square location IDs

## Troubleshooting

### Common Issues

**Missing environment variables:**
- Check `.env` file exists in project root
- Verify variable names match exactly (case-sensitive)
- Ensure no trailing spaces in values

**Authentication failures:**
- Verify `SUPABASE_JWT_SECRET` matches Supabase dashboard
- Check `KIOSK_JWT_SECRET` is set for demo mode
- Ensure `PIN_PEPPER` hasn't changed (will invalidate existing PINs)

**Connection errors:**
- Verify `DATABASE_URL` includes SSL mode for production
- Check `FRONTEND_URL` matches actual frontend deployment
- Ensure `SUPABASE_URL` doesn't have trailing slash

**Payment issues:**
- Set `SQUARE_ACCESS_TOKEN=demo` for testing without Square
- Verify Square credentials match environment (sandbox vs production)

## Migration from v6.0.4

When upgrading from v6.0.4, add these new required variables:

```bash
STATION_TOKEN_SECRET=<generate-new-secret>
```

All other variables remain compatible.