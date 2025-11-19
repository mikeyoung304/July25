# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Deployment Documentation

---

# Database Audit - Quick Action Checklist

**Use this checklist to execute Week 1 emergency fixes**
**Estimated Time:** 10 hours over 3 days
**Priority:** P0 (Must complete before next deployment)

---

## 🚨 IMMEDIATE (Do Right Now - 20 minutes)

### 1. Fix STRICT_AUTH Newline Bug (5 minutes)
```bash
# Vercel Dashboard → Your Project → Settings → Environment Variables

# For PRODUCTION:
# 1. Delete: STRICT_AUTH
# 2. Add: STRICT_AUTH
#    - Value: true (no quotes, no newline)
#    - Environments: Production

# For PREVIEW:
# 1. Delete: STRICT_AUTH
# 2. Add: STRICT_AUTH
#    - Value: true (no quotes, no newline)
#    - Environments: Preview

# Verify no newline:
vercel env pull .env.vercel.check
cat -A .env.vercel.check | grep STRICT_AUTH
# Should see: STRICT_AUTH=true$
# NOT: STRICT_AUTH="true\n"$
```

### 2. Disable Demo Panel in Production (5 minutes)
```bash
vercel env rm VITE_DEMO_PANEL production
vercel env add VITE_DEMO_PANEL production
# Value: 0
# Environments: Production only

# Keep enabled for preview (development convenience):
# VITE_DEMO_PANEL=1 in preview is acceptable
```

### 3. Stop E2E Tests from Touching Production (5 minutes)
```typescript
// playwright.config.ts:11
// Change from:
fullyParallel: true,

// To:
fullyParallel: false,  // Serial execution prevents race conditions

// Commit this change immediately:
git add playwright.config.ts
git commit -m "fix(tests): disable parallel E2E tests until staging DB exists"
git push
```

### 4. Verify .env Not in Git (5 minutes)
```bash
# Check if .env is tracked:
git ls-files | grep "^\.env$"
# Should return nothing ✓

# If it shows .env, STOP and escalate:
# This means production credentials are in git history
# Requires: git filter-repo or BFG Repo-Cleaner

# Check git history for credential exposure:
git log --all --oneline -- .env | head -20
git log --all --oneline -- .env.bak | head -20

# If these show commits, credentials may be in history
# Save output and proceed to credential rotation
```

**CHECKPOINT:** ✅ Before proceeding, verify all 4 items above are complete.

---

## ⚠️ DAY 1 AFTERNOON (4 hours)

### 5. Rotate All Exposed Credentials

**Assumption:** Credentials in .env may be exposed. Better safe than sorry.

#### A. Rotate Supabase Service Role Key (30 minutes)
```bash
# 1. Navigate to: https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt/settings/api
# 2. Under "Service role" section, click "Reset Key"
# 3. Confirm and copy NEW key
# 4. Update everywhere:

# Local development:
# Edit .env (line ~20):
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs... # NEW KEY HERE

# Vercel production:
vercel env rm SUPABASE_SERVICE_KEY production
vercel env add SUPABASE_SERVICE_KEY production
# Paste: NEW KEY

# Vercel preview:
vercel env rm SUPABASE_SERVICE_KEY preview
vercel env add SUPABASE_SERVICE_KEY preview
# Paste: NEW KEY

# GitHub Secrets:
# Settings → Secrets and variables → Actions → SUPABASE_SERVICE_KEY → Update

# 5. Test: Run health check
curl https://your-app.vercel.app/api/health
# Should return 200 OK
```

#### B. Rotate Database Password (45 minutes)
```bash
# 1. Navigate to: https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt/settings/database
# 2. Under "Database password" section, click "Reset password"
# 3. Copy NEW password (save securely)
# 4. Update DATABASE_URL everywhere:

# Format:
# postgresql://postgres.xiwfhcikfdoshxwbtjxt:[NEW_PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres

# Local development (.env):
DATABASE_URL=postgresql://postgres.xiwfhcikfdoshxwbtjxt:NEW_PASSWORD_HERE@aws-0-us-east-2.pooler.supabase.com:5432/postgres

# Vercel (production & preview):
vercel env rm DATABASE_URL production preview
vercel env add DATABASE_URL production preview
# Paste updated URL

# GitHub Secrets:
# Settings → Secrets → DATABASE_URL → Update

# Render (if backend deployed there):
# Dashboard → Environment → DATABASE_URL → Update

# 5. Test database connection:
psql "$DATABASE_URL" -c "SELECT 1;"
# Should return: 1
```

#### C. Rotate Supabase JWT Secret (30 minutes)
```bash
# WARNING: This invalidates ALL existing user sessions!
# Users will need to log in again.

# 1. Navigate to: https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt/settings/api
# 2. Under "JWT Settings" section, click "Rotate JWT Secret"
# 3. Confirm and copy NEW secret
# 4. Update everywhere:

# Local development (.env):
SUPABASE_JWT_SECRET=jEvdTDmyqrvl... # NEW SECRET HERE

# Vercel:
vercel env rm SUPABASE_JWT_SECRET production preview
vercel env add SUPABASE_JWT_SECRET production preview
# Paste: NEW SECRET

# GitHub Secrets:
# Settings → Secrets → SUPABASE_JWT_SECRET → Update

# 5. Notify users: All sessions invalidated, please log in again
```

#### D. Rotate OpenAI API Key (15 minutes)
```bash
# 1. Navigate to: https://platform.openai.com/api-keys
# 2. Click "Create new secret key"
# 3. Name: "Grow Restaurant OS - Production - Nov 2025"
# 4. Copy NEW key
# 5. Update everywhere:

# Local development (.env):
OPENAI_API_KEY=sk-proj-... # NEW KEY HERE

# Vercel:
vercel env rm OPENAI_API_KEY production preview
vercel env add OPENAI_API_KEY production preview
# Paste: NEW KEY

# Client-side (if used in browser):
vercel env rm VITE_OPENAI_API_KEY production preview
vercel env add VITE_OPENAI_API_KEY production preview
# Paste: NEW KEY

# 6. Revoke OLD key:
# https://platform.openai.com/api-keys → Find old key → "Revoke"
```

#### E. Verify All Rotations (30 minutes)
```bash
# Test each service:

# 1. Database:
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM restaurants;"
# Should return count ✓

# 2. Backend API:
curl https://your-app.vercel.app/api/health
# Should return {"status":"healthy"} ✓

# 3. Authentication:
# Try logging in via frontend
# Should work with new JWT secret ✓

# 4. Voice ordering (if applicable):
# Test OpenAI integration
# Should connect ✓

# If ANY test fails:
# - Check: Environment variable syntax (no quotes, no newlines)
# - Check: Vercel deployment completed after env var changes
# - Check: Correct environment (production vs preview)
```

**CHECKPOINT:** ✅ All credentials rotated and services healthy.

---

## 🔧 DAY 2-3 (4 hours)

### 6. Create Development Supabase Project (2 hours)

```bash
# 1. Create new Supabase project:
# Navigate to: https://app.supabase.com/
# Click: "New Project"
# Name: "Grow Restaurant OS - Development"
# Database password: Generate strong password (save securely)
# Region: Same as production (e.g., us-east-2)
# Plan: Free (sufficient for development)

# 2. Copy project credentials:
# Project URL: https://DEV_PROJECT_REF.supabase.co
# Anon key: eyJhbGciOiJIUzI1NiIs... (public, safe to expose)
# Service role key: eyJhbGciOiJIUzI1NiIs... (secret, server-only)
# JWT secret: (from Settings → API)
# Database URL: (from Settings → Database → Connection string)

# 3. Run migrations on dev database:
# Copy all migrations from production:
for migration in supabase/migrations/*.sql; do
  echo "Applying: $migration"
  psql "$DEV_DATABASE_URL" -f "$migration"
done

# 4. Verify schema matches:
npx prisma db pull --schema=./prisma/schema.dev.prisma
diff prisma/schema.prisma prisma/schema.dev.prisma
# Should show minimal differences ✓

# 5. Seed dev database with test data:
# Update .env temporarily:
cp .env .env.backup
# Edit .env with dev credentials

npm run seed
npm run seed:tables

# Restore production credentials:
mv .env.backup .env
```

### 7. Update Local Development Environment (1 hour)

```bash
# Create separate .env.development file:
cat > .env.development << 'EOF'
# Development Environment (Safe to experiment)
NODE_ENV=development
PORT=3001

# Development Supabase (DEV_PROJECT_REF)
SUPABASE_URL=https://DEV_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_dev_anon_key
SUPABASE_SERVICE_KEY=your_dev_service_key
SUPABASE_JWT_SECRET=your_dev_jwt_secret
DATABASE_URL=postgresql://postgres.DEV_PROJECT_REF:password@...

# Development OpenAI (use same key, track usage)
OPENAI_API_KEY=sk-proj-...

# Development Square (sandbox)
SQUARE_ACCESS_TOKEN=sandbox_token
SQUARE_ENVIRONMENT=sandbox

# Development features
VITE_DEMO_PANEL=1
STRICT_AUTH=false
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# Frontend (development)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://DEV_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_dev_anon_key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_ENVIRONMENT=development
EOF

# Update .gitignore to protect both:
echo ".env" >> .gitignore
echo ".env.development" >> .gitignore
echo ".env.backup" >> .gitignore

# Create symlink for active environment:
ln -sf .env.development .env

# Test development setup:
npm run dev
# Should connect to DEV Supabase, not production ✓
```

### 8. Document Environment Separation (1 hour)

```markdown
# Create: docs/ENVIRONMENTS.md

# Environment Configuration Guide

## Overview

We use THREE separate Supabase projects for environment isolation:

| Environment | Supabase Project | Purpose | Data |
|-------------|------------------|---------|------|
| Development | dev-grow (DEV_PROJECT_REF) | Local development | Test data |
| Staging | staging-grow (STAGING_REF) | Pre-production testing | Synthetic data |
| Production | grow (xiwfhcikfdoshxwbtjxt) | Live customer data | REAL DATA |

## Local Development Setup

1. Copy `.env.example` to `.env.development`
2. Fill in DEV credentials (ask team lead)
3. Link: `ln -sf .env.development .env`
4. Run: `npm run dev`

## Which Database Am I Using?

```bash
# Check your current database:
psql "$DATABASE_URL" -c "SELECT current_database();"

# Check your Supabase project:
echo $SUPABASE_URL
```

## Safety Rules

✅ DO:
- Run seed scripts in development
- Experiment with schema in development
- Test breaking changes in development

❌ DON'T:
- NEVER run seed scripts against production
- NEVER manually modify production data
- NEVER test unvalidated code against production

## Emergency: "I Accidentally Modified Production"

1. Stop immediately
2. Notify team lead
3. Check: What was modified?
4. Restore from Supabase backup if needed
5. Document incident for post-mortem
```

**CHECKPOINT:** ✅ Development environment separated from production.

---

## 📋 Verification Checklist

After completing all steps, verify:

### Security:
- [ ] STRICT_AUTH works correctly (no newline)
- [ ] VITE_DEMO_PANEL disabled in production
- [ ] All credentials rotated
- [ ] Old credentials revoked
- [ ] .env not in git history (or purged if found)

### Functionality:
- [ ] Production site works after credential rotation
- [ ] Users can log in (JWT secret rotation)
- [ ] Database queries succeed (new password)
- [ ] Voice ordering works (OpenAI key)
- [ ] Payments work (Square credentials)

### Environment Separation:
- [ ] Development Supabase project exists
- [ ] Local .env points to dev database
- [ ] Seed scripts run against dev (not production)
- [ ] Team knows which environment is which

### Testing:
- [ ] E2E tests run serially (no race conditions)
- [ ] Tests still touch production (acceptable for now)
- [ ] No new test data pollution since changes

---

## 🆘 Troubleshooting

### "Can't connect to database after password rotation"
```bash
# Verify DATABASE_URL format:
echo $DATABASE_URL | grep -o '[^:]*:[^@]*@'
# Should show: postgres.PROJECT_REF:NEW_PASSWORD@

# Test connection:
psql "$DATABASE_URL" -c "SELECT 1;"
```

### "Users logged out after JWT secret rotation"
**This is expected.** JWT secret rotation invalidates all sessions.
Solution: Notify users to log in again.

### "Vercel deployment failed after env var changes"
```bash
# Redeploy:
vercel --prod

# Check logs:
vercel logs --prod

# Common issue: Forgot to update preview environment
vercel env ls preview
```

### "Seed script still touching production"
```bash
# Verify .env symlink:
ls -la .env
# Should point to: .env.development

# Check DATABASE_URL:
grep SUPABASE_URL .env
# Should show: DEV_PROJECT_REF, NOT xiwfhcikfdoshxwbtjxt
```

---

## 📞 Support

**Questions?** Check:
1. Main audit: `/DATABASE_AUDIT_EXECUTIVE_SUMMARY.md`
2. Environment docs: `/docs/ENVIRONMENTS.md` (create in step 8)
3. Team lead: [Your team lead's contact]

**Found an issue?** Create GitHub issue with:
- What you tried
- Expected result
- Actual result
- Relevant .env excerpt (WITHOUT secrets)

---

**Last Updated:** November 11, 2025
**Next Review:** After completing Week 1 checklist
