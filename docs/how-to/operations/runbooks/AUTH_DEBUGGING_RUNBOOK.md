# Authentication Debugging Runbook

**Purpose**: Step-by-step guide for diagnosing and resolving authentication issues in production.
**Time to Resolution Target**: < 2 hours (vs 10 days for JWT scope bug)

---

## 🚨 Quick Triage

### Symptoms → Probable Cause

| Symptom | Probable Cause | Jump to Section |
|---------|---------------|-----------------|
| "Missing required scope: X" | JWT missing scope field | [JWT Structure Issues](#jwt-structure-issues) |
| 401 on all protected routes | Token validation failing | [Token Validation](#token-validation) |
| Works in dev, fails in prod | Environment config issue | [Environment Issues](#environment-issues) |
| Some users work, others don't | Role-specific problem | [Role-Based Issues](#role-based-issues) |
| Worked yesterday, broken today | Recent deployment issue | [Deployment Issues](#deployment-issues) |
| Login succeeds, actions fail | Split brain architecture | [Split Brain](#split-brain-architecture) |

---

## 🔍 Initial Diagnostics

### Step 1: Capture a Token

```bash
# Get a token from production
curl -s -X POST "https://your-api.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password","restaurant_id":"..."}' | \
  jq -r '.session.access_token' > token.txt

TOKEN=$(cat token.txt)
```

### Step 2: Decode and Inspect

```bash
# Decode JWT payload
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .

# Expected output:
{
  "sub": "user-uuid",
  "email": "test@test.com",
  "role": "server",
  "scope": ["orders:create", "orders:read"],  # ⚠️ MUST BE PRESENT
  "restaurant_id": "restaurant-uuid",
  "auth_method": "email",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Step 3: Check Critical Fields

```bash
# Quick check for scope field
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.scope'

# If null or missing, YOU FOUND THE PROBLEM
# See: JWT Structure Issues section
```

### Step 4: Test Authorization

```bash
# Test a protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api.com/api/v1/orders \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# If 401 with "Missing required scope", check JWT structure
# If 401 with "Invalid token", check token validation
```

---

## 🔧 Common Issues and Fixes

### JWT Structure Issues

**Problem**: JWT missing required fields (usually `scope`)

#### Diagnosis
```bash
# Check if scope field exists
DECODED=$(echo $TOKEN | cut -d'.' -f2 | base64 -d)
echo $DECODED | jq '.scope'
# Output: null = PROBLEM FOUND
```

#### Root Cause Locations
Check these files for JWT creation:
- `server/src/routes/auth.routes.ts` (login endpoints)
- `server/src/services/auth/pinAuth.ts` (PIN login)
- Any file with `jwt.sign()`

#### Fix Pattern
```typescript
// Find where JWT is created
const payload = {
  sub: user.id,
  role: user.role,
  // ❌ Missing scope field!
};

// Add scope field
const scopes = await fetchScopes(user.role);
const payload = {
  sub: user.id,
  role: user.role,
  scope: scopes,  // ✅ ADD THIS
};
```

#### Verification
```bash
# After fix, get new token and verify
TOKEN=$(curl ... | jq -r '.token')
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.scope'
# Should output: ["permission1", "permission2", ...]
```

---

### Token Validation

**Problem**: Valid JWT structure but validation fails

#### Diagnosis
```bash
# Check token signature
jwt verify $TOKEN --secret $JWT_SECRET

# Check expiration
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.exp'
date +%s  # Current timestamp
# If exp < current, token expired
```

#### Common Causes
1. Wrong JWT secret in environment
2. Token expired
3. Token from different environment (dev token in prod)

#### Verification Steps
```bash
# 1. Check environment variable
echo $JWT_SECRET | wc -c  # Should be 32+ characters

# 2. Verify secret matches between services
# In Node.js service:
node -e "console.log(process.env.JWT_SECRET?.substring(0,5))"

# 3. Check token age
DECODED=$(echo $TOKEN | cut -d'.' -f2 | base64 -d)
IAT=$(echo $DECODED | jq '.iat')
EXP=$(echo $DECODED | jq '.exp')
echo "Token age: $(($EXP - $IAT)) seconds"
```

---

### Split Brain Architecture

**Problem**: Response body has data that JWT lacks

#### Diagnosis
```bash
# Compare response scopes vs JWT scopes
RESPONSE=$(curl -s POST .../login ...)
RESPONSE_SCOPES=$(echo $RESPONSE | jq '.user.scopes')
TOKEN=$(echo $RESPONSE | jq -r '.session.access_token')
JWT_SCOPES=$(echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.scope')

echo "Response scopes: $RESPONSE_SCOPES"
echo "JWT scopes: $JWT_SCOPES"
# If different, you have split brain
```

#### Fix
Ensure response data comes FROM the JWT:
```typescript
// ❌ WRONG: Different sources
const token = jwt.sign({ sub, role });  // No scopes
const scopes = await getScopes();        // Has scopes
res.json({ token, user: { scopes } });   // Split brain!

// ✅ RIGHT: Same source
const scopes = await getScopes();
const token = jwt.sign({ sub, role, scope: scopes });
const decoded = jwt.decode(token);
res.json({ token, user: decoded });  // Consistent!
```

---

### Role-Based Issues

**Problem**: Specific roles can't perform actions

#### Check Database
```sql
-- Check role has correct scopes
SELECT * FROM role_scopes WHERE role = 'server';

-- Expected output:
-- role   | scope
-- server | orders:create
-- server | orders:read
-- server | payments:process
```

#### Check User Assignment
```sql
-- Check user has correct role
SELECT * FROM user_restaurants
WHERE user_id = 'uuid-from-jwt-sub';

-- Check auth.users metadata
SELECT raw_user_meta_data->>'role' as role
FROM auth.users
WHERE id = 'uuid-from-jwt-sub';
```

#### Common Issues
1. Role exists but no scopes assigned
2. User role mismatch between tables
3. Scopes in database but not in JWT

---

### Environment Issues

**Problem**: Works locally, fails in production

#### Check Environment Variables
```bash
# Local
env | grep -E "(JWT|SUPABASE|AUTH)" | sort

# Production (via deployment platform)
vercel env pull  # or equivalent
cat .env.production
```

#### Common Differences
1. `JWT_SECRET` different between environments
2. `SUPABASE_JWT_SECRET` vs custom secret confusion
3. Newline characters in secrets (`\n` literal vs actual newline)

#### Debug Commands
```bash
# Test with production environment locally
export $(cat .env.production | xargs)
npm run dev

# Check for special characters in secrets
echo -n $JWT_SECRET | od -c  # Shows special characters
```

---

### Deployment Issues

**Problem**: Auth broke after recent deployment

#### Quick Rollback
```bash
# If critical, rollback first, debug later
git revert HEAD
git push origin main

# Or via platform
vercel rollback
# or
heroku releases:rollback
```

#### Find Breaking Commit
```bash
# Check recent auth-related commits
git log --oneline -20 -- "*auth*" "*jwt*" "*token*"

# Diff against last known working
git diff LAST_WORKING_COMMIT HEAD -- server/src/routes/auth.routes.ts
```

#### Common Deployment Issues
1. Environment variables not updated
2. Database migrations not run
3. Dependencies not installed
4. Build cache using old code

---

## 📊 Production Diagnostics

### Health Check Endpoint

Create this endpoint for quick diagnostics:

```typescript
app.get('/api/v1/auth/health', async (req, res) => {
  const checks = {
    jwt_secret_configured: !!process.env.JWT_SECRET,
    jwt_secret_length: process.env.JWT_SECRET?.length || 0,
    supabase_configured: !!supabase,
    database_reachable: false,
    role_scopes_exist: false,
    sample_jwt_valid: false
  };

  try {
    // Check database
    const { data } = await supabase.from('role_scopes').select('role').limit(1);
    checks.database_reachable = true;
    checks.role_scopes_exist = data?.length > 0;

    // Create and validate sample JWT
    const testPayload = {
      sub: 'test',
      email: 'test@test.com',
      role: 'server',
      scope: ['test'],
      restaurant_id: 'test',
      auth_method: 'email',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    const token = jwt.sign(testPayload, process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    checks.sample_jwt_valid = !!decoded.scope;
  } catch (error) {
    console.error('Health check error:', error);
  }

  const healthy = Object.values(checks).every(v => v === true);

  res.status(healthy ? 200 : 503).json({
    healthy,
    checks,
    timestamp: new Date().toISOString()
  });
});
```

### Monitoring Queries

```sql
-- Recent auth failures
SELECT
  created_at,
  user_id,
  error_message,
  request_path
FROM error_logs
WHERE error_message LIKE '%scope%'
  OR error_message LIKE '%401%'
  OR error_message LIKE '%jwt%'
ORDER BY created_at DESC
LIMIT 100;

-- User login patterns
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as login_count,
  COUNT(DISTINCT user_id) as unique_users
FROM auth_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Role scope configuration
SELECT
  role,
  ARRAY_AGG(scope ORDER BY scope) as scopes,
  COUNT(*) as scope_count
FROM role_scopes
GROUP BY role
ORDER BY role;
```

---

## 🎯 Prevention Checklist

After resolving any auth issue:

- [ ] Add test case for the specific failure
- [ ] Update this runbook with new pattern
- [ ] Add monitoring for the error message
- [ ] Create alert for similar failures
- [ ] Document in team knowledge base
- [ ] Consider adding to claudelessons-v2

---

## 🔗 Quick Commands Reference

```bash
# Decode JWT
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .

# Check scope field
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.scope'

# Get token and test
TOKEN=$(curl -s -X POST "https://api/login" -d '{"email":"test","password":"test"}' | jq -r '.token')
curl -H "Authorization: Bearer $TOKEN" https://api/protected

# Check all JWTs in logs
grep "Bearer " app.log | sed 's/.*Bearer //' | while read token; do
  echo $token | cut -d'.' -f2 | base64 -d | jq '.scope' || echo "Invalid: $token"
done

# Database scope check
psql $DATABASE_URL -c "SELECT role, array_agg(scope) FROM role_scopes GROUP BY role;"
```

---

## 📚 References

- [JWT Scope Bug Post-mortem](../../../postmortems/2025-11-12-jwt-scope-bug.md)
- [Auth Development Guide](../../development/AUTH_DEVELOPMENT_GUIDE.md)
- [ADR-010: JWT Standards](../../../explanation/architecture-decisions/ADR-010-jwt-payload-standards.md)
- [Claudelessons JWT Pattern](../../../../claudelessons-v2/knowledge/incidents/jwt-scope-mismatch.md)

---

## 🆘 Escalation Path

If unable to resolve within 2 hours:

1. **Hour 1**: Follow this runbook
2. **Hour 2**: Check similar incidents in `/docs/postmortems/`
3. **Hour 3**: Escalate to senior engineer
4. **Hour 4**: Consider rollback if no progress
5. **Hour 5+**: All-hands debugging session

**Remember**: The JWT scope bug took 10 days to fix because we didn't have this runbook. Use it!

---

*Last updated: November 12, 2025*
*Based on: JWT scope bug incident (10-day outage)*