# Installation Guide

## Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account (free tier works)
- Modern browser (Chrome, Firefox, Safari, Edge)

## Quick Setup (5 minutes)

### 1. Clone Repository

```bash
git clone [repository-url]
cd rebuild-6.0
```

### 2. Install Dependencies

```bash
npm install
```

This runs a postinstall script that installs dependencies for both client and server.

### 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# OpenAI Configuration (Required for Voice)
OPENAI_API_KEY=your-openai-api-key

# Square Configuration (Optional)
SQUARE_ACCESS_TOKEN=your-square-token
SQUARE_ENVIRONMENT=sandbox
```

### 4. Database Setup

If using a new Supabase project, run migrations:

```bash
npm run db:migrate
```

For demo data:

```bash
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Access points:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api-docs

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbG...` |
| `DEFAULT_RESTAURANT_ID` | Default restaurant identifier | `11111111-1111-1111-1111-111111111111` |
| `OPENAI_API_KEY` | OpenAI API key for voice features | `sk-...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `SQUARE_ACCESS_TOKEN` | Square payment token | - |
| `SQUARE_ENVIRONMENT` | Square environment | `sandbox` |

## Verification Steps

### 1. Check Backend Health

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-26T..."
}
```

### 2. Check Frontend

Navigate to http://localhost:5173 and verify:
- Login page loads
- No console errors
- Can navigate to different pages

### 3. Test Database Connection

```bash
npm run db:test
```

## Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Kill process on port 5173 (frontend)
npx kill-port 5173

# Kill process on port 3001 (backend)
npx kill-port 3001
```

Or change ports in:
- Frontend: `vite.config.ts`
- Backend: `.env` PORT variable

### Installation Issues

Clear caches and reinstall:

```bash
rm -rf node_modules package-lock.json
rm -rf client/node_modules server/node_modules
npm install
```

### Database Connection Failed

1. Verify Supabase credentials in `.env`
2. Check Supabase project status (not paused)
3. Test connection:
   ```bash
   npx supabase status
   ```

### TypeScript Errors

Known non-blocking errors (~482):
```bash
npm run typecheck
```

These don't prevent the app from running.

## Next Steps

- [First Order Tutorial](./first-order.md) - Create your first order
- [Configuration Guide](./configuration.md) - Customize settings
- [Architecture Overview](../02-architecture/overview.md) - Understand the system