# Security Hardening Quick Reference

**For code reviews and security checks** - 5 minute read

---

## Critical Security Checks (Do These First)

### 1. Token Storage (XSS Prevention)
```
☐ Auth tokens in HTTPOnly cookie (auth_token)
☐ NO tokens in localStorage
☐ Response body has NO token field
☐ CSRF token in non-HTTPOnly cookie (csrf_token)
```

**If wrong:** XSS attack can steal authentication

---

### 2. CSRF Protection
```
☐ POST/PUT/DELETE requests check X-CSRF-Token header
☐ Token matches csrf_token cookie (timing-safe compare)
☐ GET/HEAD/OPTIONS skip CSRF check
☐ Token generated with crypto.randomBytes(32)
```

**If wrong:** CSRF attacks can change data on behalf of users

---

### 3. PIN Verification (Timing Attacks)
```
☐ Uses bcrypt.compareSync() - never raw string compare
☐ Dummy hash if user not found
☐ Generic error for all failures: "Invalid PIN"
☐ NO early returns that leak timing
```

**If wrong:** Attacker can enumerate users and PINs by timing

---

### 4. Demo Mode (Must Be Explicit)
```
☐ DEMO_MODE environment variable checked
☐ Demo users only allowed if DEMO_MODE === 'enabled'
☐ Demo users scoped to their JWT restaurant_id
☐ Rejection logged when DEMO_MODE not set
```

**If wrong:** Demo bypass could expose production data

---

### 5. Required Secrets (No Fallbacks)
```
☐ STATION_TOKEN_SECRET - crash if missing
☐ DEVICE_FINGERPRINT_SALT - crash if missing
☐ PIN_PEPPER - crash if missing in production
☐ No fallback to other secrets
```

**If wrong:** Weak defaults could be used in production

---

### 6. STRICT_AUTH (Default Enabled)
```
☐ Defaults to true: process.env.STRICT_AUTH !== 'false'
☐ Rejects tokens without restaurant_id
☐ Warning logged if disabled
☐ UUID format validated
```

**If wrong:** Users could access wrong restaurant's data

---

### 7. Restaurant ID Validation
```
☐ From JWT token only (never from header for auth users)
☐ Validated against UUID regex
☐ Every query filters by restaurant_id
☐ Cross-tenant attempts logged
```

**If wrong:** Multi-tenant isolation fails - data breach

---

### 8. Webhook Verification
```
☐ Signature verified with crypto.timingSafeEqual()
☐ Timestamp checked (< 5 minutes old)
☐ WEBHOOK_SECRET required in environment
☐ No fallback secrets
```

**If wrong:** Attacker can forge webhook events (payments, etc.)

---

## Code Review Examples

### ❌ Red Flags (Stop Review, Escalate)

```typescript
// 1. Token in localStorage
localStorage.setItem('token', response.token);

// 2. Token in response body
res.json({ token: jwtToken, user });

// 3. Early return on user not found
if (!user) return { error: 'Invalid PIN' };
// (then bcrypt.compare only if user exists)

// 4. Demo always allowed
if (req.user.id.startsWith('demo:')) return next();

// 5. Secret with fallback
const secret = process.env.SECRET || 'default-secret';

// 6. Restaurant from header
const restaurantId = req.headers['x-restaurant-id'];

// 7. Simple string comparison
if (signature === expectedSignature) { } // Timing attack

// 8. STRICT_AUTH defaults to false
const strictAuth = process.env.STRICT_AUTH === 'true';
```

---

### ✅ Green Flags (Good Practices)

```typescript
// 1. Cookie-based auth
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

// 2. Response without token
res.json({ user });

// 3. Dummy hash comparison
const hashToCompare = user?.pin_hash || DUMMY_HASH;
bcrypt.compareSync(pin, hashToCompare);

// 4. Demo mode gating
if (process.env.DEMO_MODE !== 'enabled') {
  throw Forbidden('Demo mode not enabled');
}

// 5. Required secret
const secret = process.env.SECRET;
if (!secret) throw new Error('SECRET required');

// 6. Restaurant from JWT
const restaurantId = req.user.restaurant_id; // From token

// 7. Timing-safe comparison
crypto.timingSafeEqual(buffer1, buffer2);

// 8. STRICT_AUTH defaults to enabled
const strictAuth = process.env.STRICT_AUTH !== 'false';
```

---

## Testing Checklist

Before approving PR, verify tests exist for:

```
☐ CSRF token validation (present and matching)
☐ PIN timing consistency (same time for all failures)
☐ Demo mode disabled rejection
☐ PIN attempt counter (5 failures = lockout)
☐ HTTPOnly cookie auth flow
☐ STRICT_AUTH enforcement
☐ Webhook timestamp verification
☐ Restaurant ID format validation
```

---

## Common Mistakes During Implementation

| Mistake | Impact | Fix |
|---------|--------|-----|
| `localStorage.token` | XSS steals auth | Use HTTPOnly cookie |
| `res.json({ token })` | Response contains secret | Remove token field |
| Early return on user not found | Timing attack | Use dummy hash |
| Demo always enabled | Prod data exposed | Check DEMO_MODE env |
| `process.env.X \|\| 'default'` | Weak default in prod | Crash if missing |
| Restaurant from header | Cross-tenant access | Use JWT restaurant_id |
| String comparison for signature | Timing attack | Use timingSafeEqual |
| STRICT_AUTH === 'true' | Defaults to disabled | Use !== 'false' |

---

## Files to Review

When reviewing security code, check these files first:

```
server/src/middleware/
├── auth.ts                    ← STRICT_AUTH, JWT validation
├── csrf.ts                    ← CSRF token generation/validation
├── restaurantAccess.ts        ← Demo mode, restaurant filtering
└── webhookSignature.ts        ← Webhook signature & timestamp

server/src/services/auth/
├── pinAuth.ts                 ← PIN verification, attempt counter
└── stationAuth.ts             ← Station token secrets

server/src/config/
└── environment.ts             ← Secret validation on startup
```

---

## Environment Variables to Verify

**Production Required** (server crashes without these):
- `KIOSK_JWT_SECRET`
- `STATION_TOKEN_SECRET`
- `PIN_PEPPER`
- `DEVICE_FINGERPRINT_SALT`
- `WEBHOOK_SECRET`
- `SUPABASE_JWT_SECRET`

**Security Defaults** (should not be explicitly set):
- `STRICT_AUTH` - defaults to enabled, omit for prod
- `DEMO_MODE` - omit for prod (disabled by default)

---

## Questions to Ask During Code Review

1. **Auth tokens**: "Where are auth tokens stored? Can JavaScript read them?"
   - ✅ HTTPOnly cookies, JavaScript cannot read
   - ❌ localStorage, Authorization header, response body

2. **Demo mode**: "Is DEMO_MODE environment check present?"
   - ✅ `process.env.DEMO_MODE === 'enabled'`
   - ❌ No check, always allowed, or hardcoded

3. **PIN verification**: "Does it use bcrypt and dummy hash?"
   - ✅ `bcrypt.compareSync()` with dummy hash when user missing
   - ❌ Early return, raw string compare, no dummy hash

4. **CSRF token**: "Is token sent in header AND cookie?"
   - ✅ Cookie (readable) + X-CSRF-Token header (both timing-safe compared)
   - ❌ Only in cookie, only in header, HTTPOnly cookie

5. **Restaurant ID**: "Is it validated and from JWT?"
   - ✅ From `req.user.restaurant_id` (JWT), UUID format validated
   - ❌ From header, from query param, no validation

6. **Webhook**: "Is signature and timestamp verified?"
   - ✅ `crypto.timingSafeEqual()` + timestamp < 5 min
   - ❌ Simple string compare, no timestamp, just signature

7. **Secrets**: "Are there fallbacks?"
   - ✅ `process.env.SECRET` with error if missing
   - ❌ `process.env.SECRET || 'default'`

8. **STRICT_AUTH**: "What's the default?"
   - ✅ `process.env.STRICT_AUTH !== 'false'` (defaults enabled)
   - ❌ `process.env.STRICT_AUTH === 'true'` (defaults disabled)

---

## When to Escalate

Stop review and escalate to security team if you find:

1. **Token in localStorage or response body**
2. **Demo bypass without DEMO_MODE check**
3. **Fallback secrets or default values**
4. **Early returns in auth code (timing leak)**
5. **Restaurant ID from untrusted source (header)**
6. **Simple string comparison for secrets**
7. **STRICT_AUTH defaulting to false**
8. **Multi-tenant query without restaurant_id filter**

---

## Resources

- **Full guide**: `.claude/prevention/SECURITY-HARDENING-PREVENTION.md`
- **Test examples**: Same file, Section 3
- **Implementation plan**: `plans/security-remediation-v2.md`
- **Architecture**: `CLAUDE.md` - Authentication section

---

**Last Updated**: 2025-12-29
**Use in**: Code reviews, security audits, PR feedback
