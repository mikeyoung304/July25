# Lesson: Configuration & Environment Variable Errors

**Date:** 2025-11-10
**Severity:** CRITICAL to HIGH
**Time to Find:** 4-8 hours per incident
**Fix Complexity:** Usually trivial (1 character) but hard to find

---

## The Bug Patterns

### 1. API Credential Typos

```bash
# ❌ WRONG - One character typo in .env
SQUARE_LOCATION_ID=L3ABC123XYZ  # Should be L1ABC123XYZ
SQUARE_ACCESS_TOKEN=sq0atp-correct-token
```

```typescript
// Application code
const payment = await squareClient.payments.createPayment({
  locationId: process.env.SQUARE_LOCATION_ID,  // Invalid location
  // ...
})
// ERROR: Location not found - all payments fail
```

**Why It Breaks:**
- One character difference: `L3` instead of `L1`
- Square API rejects all payment requests
- Error message is generic: "Invalid location"
- **Took hours to trace back to typo in env var**

---

### 2. Secret Exposure in Client Code

```typescript
// ❌ WRONG - API key exposed to frontend
// .env.local (in client directory)
VITE_OPENAI_API_KEY=sk-proj-abc123...

// Client code
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
    // This key is now in the browser bundle - PUBLIC!
  }
})
```

**Why It Breaks:**
- `VITE_` prefix makes variable available to client
- Anyone can view source and steal the API key
- Exposed key can be used by attackers
- **Serious security hole, potentially costly**

---

### 3. Permissive CORS Configuration

```typescript
// ❌ WRONG - Allow all origins
app.use('/api/voice', cors({
  origin: '*',  // Any website can call this
  credentials: true
}))
```

**Why It Breaks:**
- Any website can make requests to your API
- Credentials (cookies, auth headers) are allowed
- CSRF attacks possible
- **Security vulnerability that could linger unnoticed**

---

### 4. Missing Origin Header Bypass

```typescript
// ❌ WRONG - No origin = bypass CORS
app.use((req, res, next) => {
  if (!req.headers.origin) {
    // No CORS check for requests without Origin header
    return next()
  }
  // CORS validation...
})
```

**Why It Breaks:**
- Requests without `Origin` header bypass CORS
- curl, Postman, server-to-server calls can bypass security
- Intended for legitimate use but weakens security

---

### 5. Environment Variable Newlines

```bash
# ❌ WRONG - Literal \n in the value
OPENAI_API_KEY="sk-proj-abc123\ndef456"
# Render CLI or some tools add literal \n instead of newline
```

```typescript
// Application tries to use it
const response = await openai.chat.completions.create({
  // API key contains literal backslash-n characters
  // OpenAI rejects: 401 Unauthorized
})
```

**Why It Breaks:**
- Some CLIs or config tools add literal `\n` instead of actual newlines
- API key format validation fails
- Silent failure - no user feedback
- **Voice ordering completely broken, took days to find**

---

## The Fixes

### 1. Add Startup Validation for API Credentials

```typescript
// ✅ CORRECT - Validate on server startup
// server/src/startup/validate-square.ts
export async function validateSquareConfig() {
  const locationId = process.env.SQUARE_LOCATION_ID

  if (!locationId) {
    throw new Error('SQUARE_LOCATION_ID not configured')
  }

  // Call Square API to list valid locations
  const locations = await squareClient.locations.listLocations()
  const validIds = locations.result.locations?.map(l => l.id) || []

  if (!validIds.includes(locationId)) {
    console.error('❌ Invalid SQUARE_LOCATION_ID:', locationId)
    console.error('✅ Valid location IDs:', validIds)
    throw new Error(
      `SQUARE_LOCATION_ID "${locationId}" not found. ` +
      `Valid IDs: ${validIds.join(', ')}`
    )
  }

  console.log('✅ Square location validated:', locationId)
}

// Call on startup
await validateSquareConfig()
```

**Benefits:**
- Catches typos immediately on deployment
- Clear error message with valid options
- Fail-fast instead of silent failures
- Saves hours of debugging

---

### 2. Keep Secrets on Server Only

```typescript
// ✅ CORRECT - Server-side proxy
// server/src/routes/ai.routes.ts
router.post('/api/ai/complete', authenticate, async (req, res) => {
  // Server holds the API key
  const response = await openai.chat.completions.create({
    model: req.body.model,
    messages: req.body.messages,
  })

  res.json(response)
})

// Client calls server proxy instead
const response = await fetch('/api/ai/complete', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${userToken}`,  // User's token, not API key
  },
  body: JSON.stringify({ model: 'gpt-4', messages })
})
```

```bash
# ✅ Server .env (not exposed)
OPENAI_API_KEY=sk-proj-secret-key

# ✅ Client .env (no secret keys)
VITE_API_BASE_URL=https://api.example.com
VITE_APP_VERSION=1.0.0
```

**Rules:**
- Never prefix server secrets with `VITE_`
- All API keys stay on server
- Client gets ephemeral tokens from backend
- Double-check `.env` files in code review

---

### 3. Centralized CORS Configuration

```typescript
// ✅ CORRECT - Single allowlist
// server/src/config/cors.ts
const ALLOWED_ORIGINS = [
  'https://app.example.com',
  'https://www.example.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
].filter(Boolean)

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    // Only in development or for specific use cases
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }

    if (!origin) {
      return callback(new Error('Origin header required'))
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`Origin ${origin} not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Restaurant-ID']
}

// Apply globally
app.use(cors(corsOptions))

// Don't override on specific routes
// ❌ app.use('/api/voice', cors({ origin: '*' }))  // Bad!
```

---

### 4. Sanitize Environment Variables

```typescript
// ✅ CORRECT - Always trim and validate
// server/src/config/env.ts
function getEnv(key: string, required = true): string {
  let value = process.env[key]

  if (!value) {
    if (required) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return ''
  }

  // Remove whitespace and literal \n
  value = value.trim().replace(/\\n/g, '\n')

  return value
}

export const config = {
  openai: {
    apiKey: getEnv('OPENAI_API_KEY'),
  },
  square: {
    accessToken: getEnv('SQUARE_ACCESS_TOKEN'),
    locationId: getEnv('SQUARE_LOCATION_ID'),
  },
  // ...
}

// Add format validation
export function validateApiKeyFormat(key: string, name: string) {
  const patterns = {
    OPENAI_API_KEY: /^sk-[A-Za-z0-9-_]+$/,
    SQUARE_ACCESS_TOKEN: /^sq0atp-[A-Za-z0-9-_]+$/,
  }

  const pattern = patterns[name]
  if (pattern && !pattern.test(key)) {
    throw new Error(
      `${name} has invalid format. ` +
      `Check for extra whitespace or special characters.`
    )
  }
}

validateApiKeyFormat(config.openai.apiKey, 'OPENAI_API_KEY')
```

---

## Key Lessons

### 1. Small Config Errors Have Outsized Impact
**Problem:** One character typo breaks entire payment system

**Solution:**
- Add startup validation for critical configs
- Call external APIs to verify credentials
- Fail-fast with clear error messages
- Include valid options in error output

### 2. Client-Side Secrets Are Public
**Problem:** `VITE_` prefix exposes secrets to browser

**Solution:**
- NEVER prefix secrets with `VITE_`
- Keep API keys on server
- Client calls server proxy endpoints
- Review `.env` files in PRs for accidental exposure

### 3. Security Config Should Be Centralized
**Problem:** Per-route CORS overrides create vulnerabilities

**Solution:**
- Single CORS configuration at app level
- No route-specific security overrides
- Document security patterns in ADRs
- Review any `cors()`, `helmet()`, or security middleware changes

### 4. Environment Variables Need Sanitization
**Problem:** CLI tools add literal `\n` breaking API keys

**Solution:**
- Always `.trim()` environment variables
- Replace literal `\n` with actual newlines
- Validate format with regex
- Show meaningful errors for malformed values

### 5. Silent Failures Are Unacceptable
**Problem:** Voice ordering broke silently with no user feedback

**Solution:**
- Validate config on startup, not on first use
- Health check endpoints for critical integrations
- Log configuration errors with actionable messages
- Show errors to users when appropriate

---

## Quick Reference Card

### Environment Variable Best Practices

```typescript
// ✅ DO
- Trim all env vars: value.trim()
- Validate format on startup
- Fail-fast with clear errors
- Centralize in config module
- Never commit .env files

// ❌ DON'T
- Use VITE_ prefix for secrets
- Trust env vars without validation
- Allow silent failures
- Scatter process.env.X throughout code
```

### Security Config Checklist

When working with CORS/security:
- [ ] No `origin: '*'` in production
- [ ] Centralized CORS config
- [ ] Origin header required in production
- [ ] No route-specific security overrides
- [ ] Rate limiting enabled
- [ ] CSRF protection active
- [ ] Helmet middleware configured

### Startup Validation Template

```typescript
// server/src/startup/validate-config.ts
export async function validateConfiguration() {
  console.log('🔍 Validating configuration...')

  // 1. Check required env vars exist
  const required = [
    'DATABASE_URL',
    'SQUARE_ACCESS_TOKEN',
    'SQUARE_LOCATION_ID',
    'OPENAI_API_KEY'
  ]

  required.forEach(key => {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`)
    }
  })

  // 2. Validate format
  validateApiKeyFormat(process.env.OPENAI_API_KEY!, 'OPENAI_API_KEY')

  // 3. Verify credentials with external APIs
  await validateSquareConfig()

  // 4. Check database connectivity
  await db.raw('SELECT 1')

  console.log('✅ Configuration validated')
}

// In server/src/index.ts
await validateConfiguration()
app.listen(port)
```

---

## When to Reference This Lesson

**Symptoms:**
- ✅ API integration inexplicably failing
- ✅ "Invalid credentials" or "unauthorized" errors
- ✅ Payments failing with generic errors
- ✅ Security vulnerability discovered
- ✅ Silent failures with no user feedback
- ✅ Works in dev, breaks in production

**Error Messages:**
- "Location not found"
- "Invalid API key"
- "401 Unauthorized"
- "Origin not allowed by CORS"
- "Invalid input format"

**Related Issues:**
- Any third-party API integration
- Payment processing
- Voice/AI features
- CORS errors

---

## Prevention

### 1. .env.example Template

```bash
# .env.example
# Copy this to .env and fill in real values

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Square Payments
SQUARE_ACCESS_TOKEN=sq0atp-YOUR_TOKEN_HERE
SQUARE_LOCATION_ID=L1XXXXXXXXX  # ⚠️  Check Square Dashboard for correct ID

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE  # ⚠️  Server-side only, never expose to client

# Client (VITE_ prefix exposes to browser)
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_VERSION=1.0.0
# ⚠️  NEVER put secrets with VITE_ prefix!

# Security
ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
```

### 2. Pre-Commit Hook for Secrets

```bash
#!/bin/bash
# .husky/pre-commit

# Check for potential secret exposure in client env
if grep -r "VITE_.*API_KEY\|VITE_.*SECRET\|VITE_.*TOKEN" client/.env* 2>/dev/null; then
  echo "❌ ERROR: Potential secret exposure in client .env file"
  echo "   Secrets should NOT have VITE_ prefix"
  exit 1
fi

# Check for .env files in git staging
if git diff --cached --name-only | grep -q ".env$\|.env.local$"; then
  echo "❌ ERROR: .env file should not be committed"
  exit 1
fi
```

### 3. CI Validation

```yaml
# .github/workflows/ci.yml
- name: Validate Environment Config
  run: |
    # Check .env.example has all required vars
    node scripts/validate-env-example.js

    # Ensure no secrets in client .env files (if committed by mistake)
    if grep -r "VITE_.*API_KEY" client/; then
      echo "Secret exposure in client .env"
      exit 1
    fi
```

### 4. Configuration Documentation

```markdown
# docs/how-to/ENVIRONMENT_SETUP.md

## Environment Variables

### Server (.env in root)
- Never prefix secrets with `VITE_`
- All API keys and tokens go here
- Use startup validation to catch issues early

### Client (vite.config.ts)
- Only non-secret config (API URLs, versions)
- VITE_ prefix makes values PUBLIC in browser
- NEVER put API keys in client config

### Validation
- Run `npm run validate:env` before deploying
- Startup checks verify credentials with external APIs
- Fail-fast with clear error messages
```

---

## Code Review Checklist

When reviewing config changes:
- [ ] No secrets with `VITE_` prefix
- [ ] No hardcoded API keys in code
- [ ] CORS config centralized, no wildcards
- [ ] Environment variables trimmed and validated
- [ ] Startup validation for critical credentials
- [ ] Clear error messages for config issues
- [ ] .env.example updated with new variables
- [ ] Security configs not overridden per-route
- [ ] No commit of actual .env files

---

## Related Lessons

- [Testing & Debugging Strategies](./testing-debugging-strategies.md) - Systematic validation approaches

---

## TL;DR

**Problem:** Typos, exposed secrets, permissive security configs
**Solutions:**
1. **Validate on startup** - Call external APIs to verify credentials
2. **Never expose secrets** - Keep API keys on server, no `VITE_` prefix
3. **Centralize security** - Single CORS config, no overrides
4. **Sanitize inputs** - Trim env vars, validate format
5. **Fail-fast** - Clear errors on startup, not silent failures

**Remember:**
- One character typo can break entire features
- VITE_ prefix = PUBLIC in browser bundle
- Small config errors have outsized impact
- Startup validation saves hours of debugging

**Quick Fix Pattern:**
```typescript
// ✅ Startup validation
const locationId = process.env.SQUARE_LOCATION_ID?.trim()
if (!locationId || !validLocationIds.includes(locationId)) {
  throw new Error(`Invalid location ID. Valid: ${validLocationIds}`)
}

// ✅ Keep secrets on server
// Server: OPENAI_API_KEY=sk-proj-secret
// Client: VITE_API_URL=https://api.example.com (no secrets!)

// ✅ Centralized CORS
app.use(cors({ origin: ALLOWED_ORIGINS }))  // No wildcards
```
