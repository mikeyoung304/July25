# Agent 4: Security Auditor

**Priority**: CRITICAL
**Estimated Runtime**: 35-45 minutes
**Focus**: Security vulnerabilities and exposed secrets

## Mission

Scan the codebase for security vulnerabilities, exposed API keys, weak authentication, and RLS policy gaps. Based on recent commits ("fix(security): skip sanitization for auth tokens"), security is an active concern.

## Why This Matters

Security violations can lead to:
- **Data breaches** (exposed customer PII)
- **Financial loss** (unauthorized transactions)
- **Reputation damage** (security incidents go public)
- **Regulatory fines** (GDPR, PCI-DSS violations)
- **Service abuse** (API key theft, resource exhaustion)

Your architecture specifies:
- API keys **NEVER** in client code
- Use `SUPABASE_SERVICE_KEY` server-side ONLY
- Client gets `SUPABASE_ANON_KEY` with RLS protection
- Transform sensitive data at API boundary

## Scan Strategy

### 1. API Key Exposure Detection
**Target Files**: `client/src/**/*`, `.env*`

**Detection Steps**:
1. Grep for sensitive environment variable names:
   - `SERVICE_KEY`
   - `SECRET`
   - `PRIVATE_KEY`
   - `API_KEY` (but `ANON_KEY` is OK in client)
2. Check for hardcoded credentials
3. Flag any process.env access in client without `VITE_` prefix
4. Verify .env files are in .gitignore

**Example Violation**:
```typescript
// ❌ CRITICAL VIOLATION - Service key in client code!
// client/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xxx.supabase.co',
  'eyJhbGc...SERVICE_KEY_HERE'  // ← CRITICAL! Never in client!
);

// ❌ VIOLATION - process.env without VITE_ prefix in client
const apiKey = process.env.API_KEY;  // ← Won't work, security risk

// ✅ CORRECT - Only anon key in client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY  // ← Safe, RLS protected
);

// ✅ CORRECT - VITE_ prefix for client env vars
const apiUrl = import.meta.env.VITE_API_URL;
```

### 2. Authentication Bypass Detection
**Target Files**: `server/src/routes/**/*.ts`, `server/src/middleware/**/*.ts`

**Detection Steps**:
1. Find all API route handlers
2. Check for authentication middleware:
   - Is auth middleware applied?
   - Does it verify JWT properly?
   - Does it extract restaurant_id from trusted source?
3. Flag unprotected routes that should require auth
4. Flag routes accepting restaurant_id from client

**Example Violation**:
```typescript
// ❌ CRITICAL VIOLATION - No authentication!
router.get('/admin/users', async (req, res) => {
  // ← No auth middleware! Anyone can access admin routes!
  const users = await getAllUsers();
  res.json(users);
});

// ❌ VIOLATION - Accepting restaurant_id from client
router.post('/orders', async (req, res) => {
  const { restaurant_id, order_data } = req.body;  // ← DANGEROUS!
  // Attacker can impersonate any restaurant
});

// ✅ CORRECT - Protected route with auth
router.get('/admin/users', authenticateAdmin, async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

// ✅ CORRECT - restaurant_id from auth token
router.post('/orders', authenticate, async (req, res) => {
  const { restaurant_id } = req.user;  // ← From JWT, trusted
  const { order_data } = req.body;
  // Safe - restaurant_id from authentication
});
```

### 3. SQL Injection Detection
**Target Files**: `server/src/**/*.ts`

**Detection Steps**:
1. Search for raw SQL queries
2. Flag string interpolation in SQL:
   - Template literals with variables: `SELECT * FROM ${table}`
   - String concatenation: `'SELECT * FROM ' + table`
3. Verify parameterized queries are used
4. Check Supabase queries (should be safe by default)

**Example Violation**:
```typescript
// ❌ CRITICAL VIOLATION - SQL injection!
router.get('/search', async (req, res) => {
  const { query } = req.query;
  const sql = `SELECT * FROM orders WHERE customer_name = '${query}'`;
  // ← Attacker can inject: ' OR '1'='1
  const results = await db.raw(sql);
  res.json(results);
});

// ✅ CORRECT - Parameterized query
router.get('/search', async (req, res) => {
  const { query } = req.query;
  const results = await supabase
    .from('orders')
    .select('*')
    .eq('customer_name', query);  // ← Safe, parameterized
  res.json(results);
});
```

### 4. Sensitive Data Exposure
**Target Files**: `server/src/**/*.ts`, `client/src/**/*.ts`

**Detection Steps**:
1. Search for logging statements
2. Flag logs that might contain sensitive data:
   - Passwords
   - Credit card numbers
   - API keys
   - Customer PII
3. Check error responses don't leak internal details
4. Verify sensitive fields are filtered from API responses

**Example Violation**:
```typescript
// ❌ VIOLATION - Logging sensitive data
console.log('User login:', req.body);  // ← May contain password!
console.log('Payment info:', paymentData);  // ← Contains CC numbers!

// ❌ VIOLATION - Exposing sensitive data in error
res.status(500).json({
  error: error.stack,  // ← Leaks internal paths and logic
  query: sqlQuery      // ← Leaks database schema
});

// ✅ CORRECT - Safe logging
console.log('User login attempt:', { email: req.body.email });  // ← No password
console.log('Payment processed:', { orderId, amount });  // ← No CC number

// ✅ CORRECT - Safe error response
res.status(500).json({
  error: 'Internal server error',  // ← Generic message
  code: 'ORDER_PROCESSING_FAILED'  // ← Safe error code
});
```

### 5. CORS Misconfiguration
**Target Files**: `server/src/middleware/**/*.ts`, `server/src/index.ts`

**Detection Steps**:
1. Find CORS configuration
2. Check for overly permissive settings:
   - `origin: '*'` (allows any site)
   - Missing credentials: true
   - Allowing dangerous methods
3. Verify only approved origins are allowed

**Example Violation**:
```typescript
// ❌ VIOLATION - Overly permissive CORS
app.use(cors({
  origin: '*',  // ← Allows ANY website to call your API!
  credentials: true  // ← Dangerous with origin: '*'
}));

// ✅ CORRECT - Restricted CORS
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://staging.yourdomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

### 6. RLS Policy Gaps
**Target**: Comments referencing Supabase tables

**Detection Steps**:
1. Search for table names in code
2. List all tables that store multi-tenant data
3. Flag tables that need RLS but may not have it
4. Note: Can't check actual RLS policies (need Supabase Dashboard)

**Tables That MUST Have RLS**:
- orders (restaurant_id)
- menu_items (restaurant_id)
- customers (restaurant_id)
- users (restaurant_id)
- payments (restaurant_id)

### 7. Environment File Security
**Target Files**: `.env*`, `.gitignore`

**Detection Steps**:
1. Check .gitignore includes all .env files
2. Look for .env files committed to git (git log)
3. Flag any .env.production or .env.local in repository
4. Verify .env.example doesn't contain real secrets

**Example Violation**:
```bash
# ❌ VIOLATION - .env file committed to git
$ git log --all --full-history -- .env
# If this shows commits, .env was accidentally committed!

# ❌ VIOLATION - .gitignore missing .env
# .gitignore
node_modules/
dist/
# ← Missing .env patterns!

# ✅ CORRECT - .gitignore includes all .env files
# .gitignore
node_modules/
dist/
.env
.env.local
.env.*.local
.env.production
```

## Detection Patterns

### Critical Violations (Severity: CRITICAL)
- [ ] SUPABASE_SERVICE_KEY in client code
- [ ] Hardcoded API keys, passwords, tokens
- [ ] SQL injection vulnerability
- [ ] Authentication bypass
- [ ] .env file committed to git

### High-Risk Patterns (Severity: HIGH)
- [ ] process.env without VITE_ prefix in client
- [ ] Accepting restaurant_id from client input
- [ ] Overly permissive CORS (origin: '*')
- [ ] Sensitive data in logs
- [ ] Error messages leaking internal details

### Medium-Risk Patterns (Severity: MEDIUM)
- [ ] Missing rate limiting on auth endpoints
- [ ] No HTTPS enforcement
- [ ] Missing security headers (CSP, HSTS)
- [ ] Weak password requirements

## Report Template

Generate report at: `/scans/reports/[timestamp]/security-auditor.md`

```markdown
# Security Auditor - Overnight Scan Report

**Generated**: [ISO timestamp]
**Scan Duration**: [time in minutes]
**Files Scanned**: [count]

## Executive Summary

[2-3 sentence overview of security posture]

**Total Security Issues Found**: X
- CRITICAL: X (immediate breach risk)
- HIGH: X (significant vulnerability)
- MEDIUM: X (security hardening needed)

**Estimated Fix Effort**: X hours
**Risk Level**: [CRITICAL/HIGH/MEDIUM/LOW]

⚠️ **IMMEDIATE ATTENTION REQUIRED** for CRITICAL issues

## Critical Findings

### 1. [File Path:Line] - Exposed Service Key
**Severity**: CRITICAL
**Type**: Secret Exposure
**Risk**: Complete database access, data breach

**Current Code**:
```typescript
const supabase = createClient(
  'https://xxx.supabase.co',
  'eyJhbGc...SERVICE_KEY'  // ← EXPOSED!
);
```

**Recommended Fix**:
```typescript
// Move to server-side only
// Use SUPABASE_ANON_KEY in client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Impact**: If client code is public, database is fully compromised
**Effort**: 10 minutes (move logic to server)
**Urgency**: FIX IMMEDIATELY

[Repeat for each CRITICAL finding]

## High-Risk Findings

[Same format as above, but for HIGH severity]

## Medium-Risk Findings

[Same format as above, but for MEDIUM severity]

## Statistics

### Security Issues by Category
- Exposed secrets: X
- Authentication issues: Y
- Injection vulnerabilities: Z
- Data exposure: W
- Configuration issues: V

### Most Vulnerable Files
1. client/src/lib/supabase.ts - CRITICAL (exposed key)
2. server/src/routes/admin.ts - HIGH (no auth)
[etc.]

### Risk Distribution
```
CRITICAL: ██░░░░░░░░ 2 issues (immediate action required)
HIGH:     █████░░░░░ 5 issues (fix this week)
MEDIUM:   ████████░░ 8 issues (harden security)
```

## Environment Variable Audit

### Client-Side Environment Variables (OK)
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
✅ VITE_API_URL

### Server-Side Environment Variables (Keep Secret!)
🔒 SUPABASE_SERVICE_KEY
🔒 JWT_SECRET
🔒 STRIPE_SECRET_KEY

### Issues Found
- [ ] .env.local committed to git ← DELETE from history!
- [ ] API_KEY used in client without VITE_ prefix
- [ ] .env.example contains real API key (should be placeholder)

## RLS Policy Review

Tables requiring RLS enforcement:
- [ ] orders (needs restaurant_id policy)
- [ ] menu_items (needs restaurant_id policy)
- [ ] customers (needs restaurant_id policy)
- [ ] payments (needs restaurant_id policy)
- [ ] users (needs restaurant_id policy)

**Recommendation**: Review all policies in Supabase Dashboard

## Authentication Flow Analysis

### Protected Routes (Good ✅)
- POST /api/v1/orders (has auth middleware)
- GET /api/v1/menu (has auth middleware)

### Unprotected Routes (Review Required ⚠️)
- GET /api/v1/admin/users (no auth!) ← FIX
- DELETE /api/v1/orders/:id (no auth!) ← FIX

### restaurant_id Source Audit
✅ Correct: req.user.restaurant_id (from JWT)
❌ Dangerous: req.body.restaurant_id (from client)

## Next Steps

### Immediate Actions (Today - CRITICAL)
1. Remove exposed service keys from client code
2. Rotate compromised API keys
3. Add authentication to unprotected admin routes
4. Remove .env files from git history

### Short-term (This Week - HIGH)
1. Fix all authentication bypasses
2. Add rate limiting to auth endpoints
3. Implement security headers (CSP, HSTS)
4. Audit and fix CORS configuration

### Long-term (This Sprint - MEDIUM)
1. Implement automated secret scanning (git hooks)
2. Add security testing to CI/CD
3. Set up security monitoring and alerts
4. Conduct full RLS policy audit

## Security Hardening Recommendations

```typescript
// Add security middleware to server
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());  // Security headers

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5  // 5 requests per window
}));

// Add authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Use on all protected routes
router.use(authenticate);
```

## Validation Checklist

Before marking this scan as complete, verify:
- [ ] All client files scanned for exposed secrets
- [ ] All API routes checked for authentication
- [ ] All .env files verified not in git
- [ ] CORS configuration reviewed
- [ ] Sensitive data logging checked
- [ ] File:line references are accurate
- [ ] Fix urgency clearly communicated
```

## Success Criteria

- [ ] All source files scanned for secrets
- [ ] All API routes checked for auth
- [ ] Environment files audited
- [ ] CORS configuration reviewed
- [ ] RLS policy gaps identified
- [ ] Report generated with actionable fixes
- [ ] CRITICAL issues clearly flagged
- [ ] Fix urgency communicated

## Tools to Use

- **Glob**: Find all source files and .env files
- **Grep**: Search for `SERVICE_KEY`, `SECRET`, `PASSWORD`, `API_KEY`
- **Read**: Examine authentication middleware
- **Bash**: Check git history for .env files

## Exclusions

Do NOT flag:
- VITE_* environment variables in client (these are safe)
- SUPABASE_ANON_KEY in client (designed for this)
- API keys in .env.example (if they're obviously placeholders)
- Commented-out old keys (but recommend removal)

## End of Agent Definition
