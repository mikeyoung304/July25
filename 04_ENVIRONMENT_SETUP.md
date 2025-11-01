# Environment Setup & Configuration

**Version:** 6.0.14
**Last Updated:** 2025-11-01
**Target Audience:** Developers setting up Restaurant OS locally

---

## Table of Contents

1. [Critical Concepts](#1-critical-concepts)
2. [Complete Environment Variables Reference](#2-complete-environment-variables-reference)
3. [Service Integration Setup](#3-service-integration-setup)
4. [First-Time Setup](#4-first-time-setup)
5. [Database & Migrations](#5-database--migrations)
6. [Running the Application](#6-running-the-application)
7. [Deployment Configuration](#7-deployment-configuration)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Critical Concepts

### 1.1 VITE_ Prefix for Client Variables

**MOST IMPORTANT:** Variables exposed to the browser MUST have `VITE_` prefix.

**Why?**
- Vite only exposes variables with `VITE_` prefix to the client for security
- Variables WITHOUT `VITE_` are server-only and never sent to the browser
- This prevents accidentally exposing secrets like database passwords

**Example:**
```bash
# ✅ CORRECT - Client can access these
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# ✅ CORRECT - Server-only, never exposed to client
SUPABASE_SERVICE_KEY=your_service_key
DATABASE_URL=postgresql://...
PIN_PEPPER=secret123

# ❌ WRONG - Client needs this but missing VITE_ prefix
API_BASE_URL=http://localhost:3001  # Won't work!
```

### 1.2 Single .env File (Monorepo)

**Restaurant OS uses ONE .env file in the root directory.**

```
/rebuild-6.0
├── .env                 ✅ ONE file here
├── client/
│   └── .env.local       ❌ DON'T create this
└── server/
    └── .env             ❌ DON'T create this
```

**Why?**
- Simplifies configuration management
- Prevents inconsistencies between client and server
- Single source of truth for all environment variables

### 1.3 Environment Variable Loading

**Priority Order (highest to lowest):**
1. Process environment variables (CLI or system)
2. `.env.[NODE_ENV].local` (e.g., `.env.development.local`)
3. `.env.[NODE_ENV]` (e.g., `.env.development`)
4. `.env.local`
5. `.env`

**Development:**
```bash
# Use .env for local development
cp .env.example .env
# Edit .env with your credentials
```

**Production:**
```bash
# Set in platform dashboards (Vercel, Render)
# Never commit .env files
```

### 1.4 Security Best Practices

**DO:**
- ✅ Keep `.env` in `.gitignore`
- ✅ Use `.env.example` as template (no real values)
- ✅ Rotate secrets regularly
- ✅ Use different values per environment
- ✅ Store production secrets in platform dashboards

**DON'T:**
- ❌ Commit `.env` files with real credentials
- ❌ Share secrets in chat/email/Slack
- ❌ Use production credentials in development
- ❌ Log sensitive environment variables
- ❌ Expose `SUPABASE_SERVICE_KEY` to frontend

---

## 2. Complete Environment Variables Reference

### 2.1 Client Variables (VITE_ Prefix Required)

#### Core Client Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | ✅ Yes | - | Backend API URL (http://localhost:3001 for dev) |
| `VITE_SUPABASE_URL` | ✅ Yes | - | Supabase project URL (https://[project].supabase.co) |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | - | Supabase anonymous/public key |
| `VITE_DEFAULT_RESTAURANT_ID` | ✅ Yes | 11111111-... | Default restaurant UUID |
| `VITE_ENVIRONMENT` | ✅ Yes | development | Environment mode (development/production) |

**Example:**
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_ENVIRONMENT=development
```

#### Square Payment Integration (Client)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_SQUARE_APP_ID` | For payments | - | Square application ID (Web SDK) |
| `VITE_SQUARE_LOCATION_ID` | For payments | - | Square location ID for web payments |
| `VITE_SQUARE_ENVIRONMENT` | For payments | sandbox | 'sandbox' or 'production' (must match server) |

**Example:**
```bash
VITE_SQUARE_APP_ID=sandbox-sq0idb-XYZ123
VITE_SQUARE_LOCATION_ID=LABHCDEFG1234
VITE_SQUARE_ENVIRONMENT=sandbox
```

**Get Square Credentials:**
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create or select an application
3. Copy Application ID
4. Go to Locations tab for Location ID

#### AI & Voice Features (Client)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_OPENAI_API_KEY` | For voice | - | OpenAI API key for client-side voice WebRTC |
| `VITE_USE_REALTIME_VOICE` | No | false | Enable real-time voice assistant features |

**Example:**
```bash
VITE_OPENAI_API_KEY=sk-proj-abc123xyz...
VITE_USE_REALTIME_VOICE=true
```

#### Development & Debugging (Client)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_DEBUG_VOICE` | No | false | Enable voice/menu debugging logs |
| `VITE_USE_MOCK_DATA` | No | false | Use mock data instead of real API |
| `VITE_ENABLE_PERF` | No | false | Enable performance monitoring |
| `VITE_DEMO_PANEL` | No | 0 | Enable demo auth panel ('1' = enabled) |

**Example:**
```bash
VITE_DEBUG_VOICE=true
VITE_USE_MOCK_DATA=false
VITE_ENABLE_PERF=true
VITE_DEMO_PANEL=1
```

### 2.2 Server Variables (No Prefix)

#### Core Server Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | ✅ Yes | 3001 | Server port number |
| `NODE_ENV` | ✅ Yes | development | Environment mode (development/production) |
| `DEFAULT_RESTAURANT_ID` | ✅ Yes | 11111111-... | Default restaurant UUID |

**Example:**
```bash
PORT=3001
NODE_ENV=development
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

#### Supabase & Database

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection string |
| `SUPABASE_URL` | ✅ Yes | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ Yes | - | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | - | Supabase service role key (admin) |
| `SUPABASE_JWT_SECRET` | ✅ Yes | - | JWT secret for validating tokens (~88 chars) |

**Example:**
```bash
DATABASE_URL=postgresql://postgres.abcdefgh:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[DIFFERENT_KEY]
SUPABASE_JWT_SECRET=super-secret-jwt-secret-from-supabase-dashboard-88-chars
```

**Get Supabase Credentials:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy Project URL, anon key, service_role key
5. Go to Settings → Database → Connection string for DATABASE_URL
6. JWT secret is in Settings → API → JWT Settings

#### AI Integration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | ✅ Yes | - | OpenAI API key for AI features |

**Example:**
```bash
OPENAI_API_KEY=sk-proj-abc123xyz...
```

**Get OpenAI Key:**
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Go to API Keys
3. Create new secret key
4. Copy immediately (won't be shown again)

#### Square Payments (Server)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SQUARE_ACCESS_TOKEN` | For payments | - | Square API access token (SB* = sandbox, EAAA* = production) |
| `SQUARE_LOCATION_ID` | For payments | - | Square location ID for payment processing |
| `SQUARE_ENVIRONMENT` | ✅ Yes | sandbox | 'sandbox' or 'production' |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | No | - | Square webhook signature verification key |

**Example:**
```bash
SQUARE_ACCESS_TOKEN=EAAAEBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SQUARE_LOCATION_ID=LABHCDEFG1234
SQUARE_ENVIRONMENT=production
SQUARE_WEBHOOK_SIGNATURE_KEY=webhook_signature_key_from_square
```

**Token Prefix:**
- `SB*` = Sandbox token (for testing)
- `EAAA*` = Production token (for live payments)

#### Security & Authentication

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PIN_PEPPER` | ✅ Yes | - | Secret pepper for PIN hashing (random string) |
| `DEVICE_FINGERPRINT_SALT` | ✅ Yes | - | Salt for device fingerprinting in station auth |
| `FRONTEND_URL` | ✅ Yes | http://localhost:5173 | Frontend URL for CORS configuration |
| `AUTH_DUAL_AUTH_ENABLE` | No | true | Enable dual auth pattern (Supabase + localStorage) |
| `AUTH_ACCEPT_KIOSK_DEMO_ALIAS` | No | true | Accept 'kiosk_demo' role as 'customer' |

**Example:**
```bash
PIN_PEPPER=randomly-generated-secret-pepper-string-12345
DEVICE_FINGERPRINT_SALT=another-random-salt-67890
FRONTEND_URL=http://localhost:5173
AUTH_DUAL_AUTH_ENABLE=true
AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true
```

**Generate Random Secrets:**
```bash
# Generate PIN pepper
openssl rand -base64 32

# Generate device fingerprint salt
openssl rand -base64 32
```

#### Performance & Monitoring

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `CACHE_TTL_SECONDS` | No | 300 | Cache time-to-live in seconds (5 minutes) |
| `RATE_LIMIT_WINDOW_MS` | No | 60000 | Rate limit time window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | No | 100 | Maximum requests per rate limit window |
| `LOG_LEVEL` | No | info | Logging level (debug/info/warn/error) |
| `LOG_FORMAT` | No | json | Log output format ('json' or 'simple') |
| `ALLOWED_ORIGINS` | No | - | Comma-separated list of additional CORS origins |
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking |

**Example:**
```bash
CACHE_TTL_SECONDS=600
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=debug
LOG_FORMAT=json
ALLOWED_ORIGINS=https://example.com,https://app.example.com
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456
```

---

## 3. Service Integration Setup

### 3.1 Supabase Setup

**Step 1: Create Supabase Project**
1. Go to [Supabase](https://app.supabase.com)
2. Click "New Project"
3. Choose organization and project name
4. Select region (choose closest to your users)
5. Generate strong database password
6. Wait for project to finish setting up (~2 minutes)

**Step 2: Get Credentials**
1. Go to Settings → API
2. Copy:
   - Project URL → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_KEY` (NEVER expose to client!)
3. Go to Settings → API → JWT Settings
4. Copy JWT Secret → `SUPABASE_JWT_SECRET`

**Step 3: Get Database URL**
1. Go to Settings → Database
2. Scroll to "Connection string"
3. Select "URI" tab
4. Copy connection string
5. Replace `[YOUR-PASSWORD]` with your database password
6. Use for `DATABASE_URL`

**Step 4: Link Local Project**
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

**Project Ref:** The part of your URL after `https://` and before `.supabase.co`
- Example: `https://abcdefgh.supabase.co` → project ref is `abcdefgh`

### 3.2 Square Setup

**Step 1: Create Square Account**
1. Go to [Square Developer](https://developer.squareup.com)
2. Sign up or log in
3. Create a new application

**Step 2: Get Sandbox Credentials**
1. Select your application
2. Go to "Credentials" tab
3. Under "Sandbox" section, copy:
   - Application ID → `VITE_SQUARE_APP_ID`
   - Access Token → `SQUARE_ACCESS_TOKEN`
4. Go to "Locations" tab
5. Copy a location ID → `SQUARE_LOCATION_ID` and `VITE_SQUARE_LOCATION_ID`

**Step 3: Set Environment**
```bash
SQUARE_ENVIRONMENT=sandbox
VITE_SQUARE_ENVIRONMENT=sandbox
```

**Step 4: Test Payments**
Use Square's test card numbers:
- Success: `4111 1111 1111 1111`
- Decline: `4000 0000 0000 0002`

**Step 5: Production (When Ready)**
1. Complete Square account verification
2. Switch to "Production" tab in Square dashboard
3. Copy production credentials
4. Update environment variables:
```bash
SQUARE_ENVIRONMENT=production
VITE_SQUARE_ENVIRONMENT=production
```

### 3.3 OpenAI Setup

**Step 1: Create OpenAI Account**
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Add payment method (required for API access)

**Step 2: Create API Key**
1. Go to API Keys
2. Click "Create new secret key"
3. Give it a name (e.g., "Restaurant OS Development")
4. Copy the key immediately (won't be shown again!)
5. Use for both:
   - `OPENAI_API_KEY` (server)
   - `VITE_OPENAI_API_KEY` (client, for voice features)

**Step 3: Set Usage Limits**
1. Go to Settings → Billing → Usage limits
2. Set monthly budget (e.g., $50 for development)
3. Enable email notifications

**Models Used:**
- GPT-4 Turbo: Text processing, menu parsing
- GPT-4o Realtime: Voice ordering (WebRTC)

### 3.4 Vercel Setup (Frontend Deployment)

**Step 1: Create Vercel Account**
1. Go to [Vercel](https://vercel.com)
2. Sign up with GitHub (recommended)

**Step 2: Import Project**
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Select `/client` as root directory
4. Framework Preset: Vite
5. Don't deploy yet!

**Step 3: Configure Environment Variables**
1. Go to Settings → Environment Variables
2. Add all `VITE_*` variables
3. Set for "Production" environment
4. Click "Deploy"

**Step 4: Custom Domain (Optional)**
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### 3.5 Render Setup (Backend Deployment)

**Step 1: Create Render Account**
1. Go to [Render](https://render.com)
2. Sign up with GitHub

**Step 2: Create Web Service**
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Name: `restaurant-os-server`
4. Environment: Node
5. Build Command: `npm install && cd server && npm run build`
6. Start Command: `cd server && npm start`
7. Don't deploy yet!

**Step 3: Configure Environment Variables**
1. Go to Environment tab
2. Add all server variables (without `VITE_` prefix)
3. Save changes
4. Trigger manual deploy

**Step 4: Health Checks**
1. Go to Settings → Health Check Path
2. Set to `/api/health`
3. Save

---

## 4. First-Time Setup

### 4.1 Prerequisites Checklist

- [ ] Node.js 20.x installed (`node --version`)
- [ ] npm 10.7.0+ installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] Supabase account created
- [ ] Square developer account created (for payments)
- [ ] OpenAI account created (for AI features)
- [ ] Code editor (VS Code recommended)

### 4.2 Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/restaurant-os.git
cd restaurant-os

# Check you're on the main branch
git branch
```

### 4.3 Install Dependencies

```bash
# Install all dependencies (root, client, server, shared)
npm run install:all

# This runs:
# - npm install (root)
# - cd server && npm install
# - cd client && npm install
```

**Expected Output:**
```
added XXX packages in XXs
```

### 4.4 Configure Environment Variables

**Step 1: Copy Template**
```bash
cp .env.example .env
```

**Step 2: Edit .env**
```bash
# Use your editor
code .env
# or
nano .env
# or
vim .env
```

**Step 3: Fill in Required Values**

Minimum required for local development:
```bash
# Server
PORT=3001
NODE_ENV=development
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Security
PIN_PEPPER=generate-random-string
DEVICE_FINGERPRINT_SALT=generate-random-string
FRONTEND_URL=http://localhost:5173

# Client
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_ENVIRONMENT=development
```

**Optional for full features:**
- Square variables (for payment testing)
- Sentry DSN (for error tracking)
- Performance monitoring flags

**Step 4: Validate Configuration**
```bash
npm run env:check
```

---

## 5. Database & Migrations

### 5.1 Link Supabase Project

```bash
# Login to Supabase CLI
npx supabase login

# Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Verify link
npx supabase db remote ls
```

### 5.2 Apply Migrations

```bash
# Push all migrations to Supabase
npx supabase db push

# Or use npm script
npm run db:push
```

**Expected Output:**
```
Applying migration 20250101000000_initial_schema.sql...
Applying migration 20250102000000_add_voice_features.sql...
...
Finished supabase db push
```

### 5.3 Verify Database

```bash
# Check migration status
npm run db:status

# Or manually query
psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY created_at;"
```

### 5.4 Create New Migration

```bash
# Create new migration file
npx supabase migration new my_feature_name

# Edit the generated file
# Location: supabase/migrations/[timestamp]_my_feature_name.sql

# Write your SQL
# Example:
ALTER TABLE orders ADD COLUMN my_new_column TEXT;

# Apply migration
npm run db:push
```

### 5.5 Reset Database (Development Only!)

```bash
# ⚠️  WARNING: This deletes ALL data!
npm run db:reset

# This will:
# 1. Drop all tables
# 2. Re-run all migrations from scratch
# 3. Seed with test data (if seed script exists)
```

---

## 6. Running the Application

### 6.1 Start Development Servers

**Option 1: Both Client and Server**
```bash
npm run dev

# Starts:
# - Client on http://localhost:5173
# - Server on http://localhost:3001
```

**Option 2: Separate Terminals**
```bash
# Terminal 1: Server
npm run dev:server

# Terminal 2: Client
npm run dev:client
```

### 6.2 Verify Services

**Check Server:**
```bash
curl http://localhost:3001/api/health

# Expected:
# {"status":"ok","timestamp":"2025-01-01T00:00:00.000Z"}
```

**Check Client:**
Open browser to http://localhost:5173

**Check Database Connection:**
```bash
npm run db:status
```

### 6.3 Development Workflow

**Hot Reload:**
- Client: Vite hot module replacement (instant)
- Server: Nodemon auto-restart on file changes

**Typical Development Flow:**
1. Make code changes
2. Save file
3. See changes immediately in browser
4. Check terminal for errors

### 6.4 Common Development Commands

```bash
# Run tests
npm test                    # All tests
npm run test:client         # Client tests only
npm run test:server         # Server tests only
npm run test:e2e            # End-to-end tests

# Type checking
npm run typecheck           # Check all TypeScript

# Linting
npm run lint                # Check code style
npm run lint:fix            # Auto-fix issues

# Database
npm run db:push             # Apply migrations
npm run db:migration:new    # Create new migration

# Documentation
npm run docs:check          # Validate documentation
npm run docs:drift          # Check documentation drift

# Build
npm run build               # Build for production
npm run build:client        # Build client only
npm run build:server        # Build server only
```

---

## 7. Deployment Configuration

### 7.1 Vercel (Client)

**Environment Variables:**
Set in Vercel Dashboard → Settings → Environment Variables

```bash
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_ENVIRONMENT=production
VITE_SQUARE_APP_ID=your_square_app_id
VITE_SQUARE_LOCATION_ID=your_square_location_id
VITE_SQUARE_ENVIRONMENT=production
```

**Build Settings:**
- Framework Preset: Vite
- Build Command: `cd client && npm run build`
- Output Directory: `client/dist`
- Install Command: `npm install`

### 7.2 Render (Server)

**Environment Variables:**
Set in Render Dashboard → Environment tab

```bash
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=sk-proj-...
SQUARE_ACCESS_TOKEN=EAAA...
SQUARE_LOCATION_ID=L...
SQUARE_ENVIRONMENT=production
PIN_PEPPER=production-pepper
DEVICE_FINGERPRINT_SALT=production-salt
FRONTEND_URL=https://your-frontend.vercel.app
```

**Build Settings:**
- Build Command: `npm install && cd server && npm run build`
- Start Command: `cd server && npm start`
- Health Check Path: `/api/health`

### 7.3 Production Checklist

**Before Deploying:**
- [ ] All environment variables set in platform dashboards
- [ ] Database migrations applied to production database
- [ ] Square production credentials configured
- [ ] CORS origins updated (`ALLOWED_ORIGINS`)
- [ ] Health check endpoints working
- [ ] Error tracking configured (Sentry)
- [ ] Logs configured for production (`LOG_LEVEL=info`)

**After Deploying:**
- [ ] Run smoke tests
- [ ] Check health endpoints
- [ ] Verify authentication works
- [ ] Test payment processing
- [ ] Monitor error logs

---

## 8. Troubleshooting

### 8.1 Environment Variable Issues

**Problem:** Variables not loading

**Symptoms:**
- `undefined` in console
- "Configuration required" errors
- Blank login page

**Solutions:**

1. **Check Prefix:**
   ```bash
   # Client variables MUST have VITE_ prefix
   ✅ VITE_API_BASE_URL=http://localhost:3001
   ❌ API_BASE_URL=http://localhost:3001
   ```

2. **Restart Dev Server:**
   ```bash
   # Ctrl+C to stop
   npm run dev
   ```

3. **Check File Location:**
   ```bash
   # Must be in root directory
   ls -la .env
   # Should exist at /rebuild-6.0/.env
   ```

4. **Validate Values:**
   ```bash
   npm run env:check
   ```

### 8.2 Database Connection Issues

**Problem:** Can't connect to Supabase

**Symptoms:**
- "Connection refused" errors
- "Invalid JWT" errors
- Database queries fail

**Solutions:**

1. **Check Credentials:**
   ```bash
   # Verify in Supabase dashboard
   echo $SUPABASE_URL
   echo $DATABASE_URL
   ```

2. **Test Connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Check Firewall:**
   - Supabase uses port 5432
   - Ensure not blocked

4. **Verify Project Link:**
   ```bash
   npx supabase link --project-ref YOUR_REF
   ```

### 8.3 Build Failures

**Problem:** Build fails with errors

**Common Causes:**

1. **TypeScript Errors:**
   ```bash
   npm run typecheck
   # Fix all TypeScript errors before building
   ```

2. **Missing Dependencies:**
   ```bash
   npm run install:all
   ```

3. **Environment Variables:**
   ```bash
   # Ensure all required VITE_ variables set
   npm run env:check
   ```

4. **Node Version:**
   ```bash
   node --version
   # Should be 20.x
   # Use nvm to switch: nvm use 20
   ```

### 8.4 Port Already in Use

**Problem:** "Port 3001 already in use"

**Solutions:**

1. **Kill Process:**
   ```bash
   # Find process using port
   lsof -i :3001

   # Kill it
   kill -9 [PID]
   ```

2. **Use Different Port:**
   ```bash
   PORT=3002 npm run dev:server
   # Update VITE_API_BASE_URL accordingly
   ```

3. **Clean Restart:**
   ```bash
   npm run reset
   npm run dev
   ```

### 8.5 Authentication Failures

**Problem:** Login doesn't work

**Symptoms:**
- "Invalid JWT" errors
- Redirects to login after successful login
- Session expires immediately

**Solutions:**

1. **Check JWT Secret:**
   ```bash
   # Verify SUPABASE_JWT_SECRET is set correctly
   # Should be ~88 characters from Supabase dashboard
   ```

2. **Verify Token Generation:**
   ```bash
   # Check server logs for JWT generation
   # Should see "Generated JWT for user..."
   ```

3. **Clear Browser Storage:**
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   // Then refresh
   ```

4. **Check CORS:**
   ```bash
   # Ensure FRONTEND_URL matches client URL
   FRONTEND_URL=http://localhost:5173
   ```

### 8.6 Payment Processing Issues

**Problem:** Payments fail

**Symptoms:**
- "Invalid Square credentials" errors
- Payments stuck in "pending"
- Network errors during payment

**Solutions:**

1. **Verify Square Environment Match:**
   ```bash
   # Server and client must match!
   SQUARE_ENVIRONMENT=sandbox
   VITE_SQUARE_ENVIRONMENT=sandbox
   ```

2. **Check Token Prefix:**
   ```bash
   # Sandbox tokens start with SB
   SQUARE_ACCESS_TOKEN=SBxxxxxxxx

   # Production tokens start with EAAA
   SQUARE_ACCESS_TOKEN=EAAAxxxxxxxx
   ```

3. **Test with Square Test Cards:**
   - Success: `4111 1111 1111 1111`
   - Decline: `4000 0000 0000 0002`

4. **Check Square Dashboard:**
   - Verify credentials are active
   - Check for API errors in Square logs

### 8.7 Getting Help

**Documentation:**
- [Troubleshooting Guide](./docs/how-to/troubleshooting/TROUBLESHOOTING.md)
- [Auth Diagnostic Guide](./docs/how-to/troubleshooting/AUTH_DIAGNOSTIC_GUIDE.md)
- [API Reference](./docs/reference/api/api/README.md)

**Check Logs:**
```bash
# Server logs
npm run dev:server

# Client logs
# Open browser console (F12)

# Database logs
# Check Supabase dashboard → Logs
```

**Common Commands:**
```bash
# Reset everything
npm run reset
npm run install:all
npm run dev

# Check status
npm run db:status
npm run env:check
npm run docs:check
```

---

## Additional Resources

- **Environment Variables Reference:** [ENVIRONMENT.md](./docs/reference/config/ENVIRONMENT.md)
- **Deployment Guide:** [DEPLOYMENT.md](./docs/how-to/operations/DEPLOYMENT.md)
- **Getting Started:** [GETTING_STARTED.md](./docs/tutorials/GETTING_STARTED.md)
- **Supabase Docs:** https://supabase.com/docs
- **Square Developer:** https://developer.squareup.com
- **Vercel Docs:** https://vercel.com/docs
- **Render Docs:** https://render.com/docs

---

**Document Version:** 1.0
**Last Updated:** 2025-11-01
**Maintained By:** Restaurant OS Team
