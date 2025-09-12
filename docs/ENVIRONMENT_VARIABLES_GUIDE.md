# Environment Variables Configuration Guide

**Version**: 6.0.4  
**Last Updated**: September 12, 2025  
**Security Level**: HIGH - Contains sensitive configuration

## Overview

This guide documents all environment variables required for Restaurant OS v6.0.4. Variables marked as **REQUIRED** will cause application failures if not set.

## Quick Setup

### Development Environment

```bash
# Copy templates
cp client/.env.example client/.env
cp server/.env.example server/.env

# Generate secrets (macOS/Linux)
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 16  # For PIN_PEPPER
openssl rand -hex 16  # For DEVICE_FINGERPRINT_SALT
```

### Production Environment

Use a secure secrets management system (AWS Secrets Manager, Vault, etc.) and never commit production values to git.

---

## Client Environment Variables

Location: `client/.env`

### Database Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ YES | Supabase project URL | `https://xiwfhcikfdoshxwbtjxt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ YES | Supabase anonymous key (public) | `eyJhbGciOiJIUzI1NiIs...` |

### Application Settings

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_DEFAULT_RESTAURANT_ID` | ✅ YES | Default restaurant for development | `11111111-1111-1111-1111-111111111111` |
| `VITE_API_BASE_URL` | NO | Override API base URL | `http://localhost:3001` |
| `VITE_WS_URL` | NO | WebSocket server URL | `ws://localhost:3001` |

### AI/Voice Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_OPENAI_API_KEY` | YES* | OpenAI API key for voice | `sk-...` |
| `VITE_ENABLE_VOICE` | NO | Enable voice features | `true` |

*Required only if voice features are enabled

### Payment Processing (NEW in v6.0.4)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SQUARE_APP_ID` | YES** | Square application ID | `sandbox-sq0idb-...` |
| `VITE_SQUARE_LOCATION_ID` | YES** | Square location ID | `L9ZXKVR6XNHQ1` |
| `VITE_SQUARE_ENVIRONMENT` | NO | Square environment | `sandbox` or `production` |

**Required for payment features

### Feature Flags

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VITE_ENABLE_DEMO_MODE` | NO | Show demo authentication | `true` in dev |
| `VITE_ENABLE_ANALYTICS` | NO | Enable analytics tracking | `false` |
| `VITE_ENABLE_DEBUG` | NO | Enable debug logging | `false` |

---

## Server Environment Variables

Location: `server/.env`

### Database Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ YES | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SUPABASE_URL` | ✅ YES | Supabase project URL | `https://xiwfhcikfdoshxwbtjxt.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ YES | Supabase service role key (secret) | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_JWT_SECRET` | ✅ YES | JWT signing secret (NEW v6.0.4) | 32+ character secret |

### Security Configuration (NEW in v6.0.4)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FRONTEND_URL` | ✅ YES | Frontend URL for CORS | `http://localhost:5173` |
| `PIN_PEPPER` | ✅ YES | Additional PIN hashing secret | `development-pepper-secret` |
| `DEVICE_FINGERPRINT_SALT` | ✅ YES | Salt for device binding | `development-salt` |
| `CSRF_SECRET` | NO | CSRF token secret | Random 32 chars |
| `SESSION_SECRET` | NO | Express session secret | Random 32 chars |

### Server Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `PORT` | NO | Server port | `3001` |
| `NODE_ENV` | ✅ YES | Environment mode | `development` |
| `LOG_LEVEL` | NO | Logging verbosity | `info` |
| `CORS_ORIGINS` | NO | Additional CORS origins | Comma-separated |

### External Services

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | YES* | OpenAI API key | `sk-...` |
| `SQUARE_ACCESS_TOKEN` | YES** | Square API token (NEW) | `EAAAEE...` |
| `SQUARE_WEBHOOK_SECRET` | NO | Square webhook verification | `whs_...` |
| `SENTRY_DSN` | NO | Sentry error tracking | `https://...@sentry.io/...` |
| `REDIS_URL` | NO | Redis connection | `redis://localhost:6379` |

*Required for AI features  
**Required for payment processing

### Email Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SMTP_HOST` | NO | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | NO | SMTP server port | `587` |
| `SMTP_USER` | NO | SMTP username | `noreply@restaurant.com` |
| `SMTP_PASS` | NO | SMTP password | `app-specific-password` |
| `EMAIL_FROM` | NO | Default from address | `Restaurant OS <noreply@restaurant.com>` |

---

## Environment-Specific Configurations

### Development

```bash
# client/.env.development
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...development...
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_SQUARE_APP_ID=sandbox-sq0idb-xxx
VITE_SQUARE_LOCATION_ID=L9ZXKVR6XNHQ1
VITE_ENABLE_DEMO_MODE=true
VITE_ENABLE_DEBUG=true

# server/.env.development
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_dev
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...service...
SUPABASE_JWT_SECRET=development-jwt-secret-min-32-chars
FRONTEND_URL=http://localhost:5173
PIN_PEPPER=development-pepper-secret
DEVICE_FINGERPRINT_SALT=development-salt
LOG_LEVEL=debug
```

### Staging

```bash
# Similar to development but with staging URLs and keys
NODE_ENV=staging
FRONTEND_URL=https://staging.restaurant-os.com
SQUARE_APP_ID=sandbox-sq0idb-xxx  # Still use sandbox for staging
LOG_LEVEL=info
```

### Production

```bash
# Use production services and enhanced security
NODE_ENV=production
FRONTEND_URL=https://restaurant-os.com
SQUARE_APP_ID=sq0idp-xxx  # Production Square app
SQUARE_ENVIRONMENT=production
LOG_LEVEL=error
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## Security Best Practices

### 1. Secret Generation

```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using openssl
openssl rand -hex 32
```

### 2. Secret Storage

- **Never commit** `.env` files to git
- Use `.env.example` files with dummy values
- Store production secrets in:
  - AWS Secrets Manager
  - HashiCorp Vault
  - Azure Key Vault
  - Kubernetes Secrets

### 3. Secret Rotation

Rotate these secrets quarterly:
- `SUPABASE_JWT_SECRET`
- `PIN_PEPPER`
- `DEVICE_FINGERPRINT_SALT`
- `SQUARE_ACCESS_TOKEN`
- Database passwords

### 4. Access Control

- Limit access to production environment variables
- Use different credentials per environment
- Audit access to secrets regularly
- Use read-only credentials where possible

---

## Validation Script

Use this script to validate your environment:

```javascript
// scripts/validate-env.js
const required = {
  client: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_DEFAULT_RESTAURANT_ID',
    'VITE_SQUARE_APP_ID',
    'VITE_SQUARE_LOCATION_ID'
  ],
  server: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_JWT_SECRET',
    'FRONTEND_URL',
    'PIN_PEPPER',
    'DEVICE_FINGERPRINT_SALT'
  ]
};

// Run with: node scripts/validate-env.js
```

---

## Troubleshooting

### Missing Variable Errors

```
Error: SUPABASE_JWT_SECRET is not defined
```
**Solution**: Ensure all required variables are set in `.env`

### CORS Errors

```
Access to fetch at 'http://localhost:3001' from origin 'http://localhost:5173' has been blocked by CORS
```
**Solution**: Set `FRONTEND_URL=http://localhost:5173` in server `.env`

### Authentication Failures

```
Error: JWT signature verification failed
```
**Solution**: Ensure `SUPABASE_JWT_SECRET` matches between Supabase dashboard and server

### Payment Processing Errors

```
Error: Square application ID not configured
```
**Solution**: Add `VITE_SQUARE_APP_ID` and `SQUARE_ACCESS_TOKEN`

---

## Migration from v6.0.3

If upgrading from v6.0.3, add these new variables:

```bash
# Client (new in v6.0.4)
VITE_SQUARE_APP_ID=xxx
VITE_SQUARE_LOCATION_ID=xxx

# Server (new in v6.0.4)
SUPABASE_JWT_SECRET=xxx  # CRITICAL - Required
FRONTEND_URL=xxx         # CRITICAL - Required
PIN_PEPPER=xxx          # CRITICAL - Required
DEVICE_FINGERPRINT_SALT=xxx
SQUARE_ACCESS_TOKEN=xxx
```

---

## CI/CD Configuration

### GitHub Actions

```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  # ... add all required variables
```

### Vercel

Set environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable for Preview and Production
3. Redeploy after adding variables

### Docker

```dockerfile
# Use build args for build-time variables
ARG VITE_SUPABASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

# Use runtime environment for server variables
ENV NODE_ENV=production
```

---

## Reference

- [Supabase Environment Variables](https://supabase.com/docs/guides/hosting/overview#environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Square API Credentials](https://developer.squareup.com/docs/build-basics/access-tokens)
- [OpenAI API Keys](https://platform.openai.com/api-keys)

---

**Security Notice**: This document contains sensitive configuration information. Restrict access and never share production values.