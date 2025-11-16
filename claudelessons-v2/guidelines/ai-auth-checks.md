# AI Agent Guidelines: Authentication System

> **Critical**: This guide is for AI assistants (Claude, GPT, Copilot, etc.) working on authentication code. Following these guidelines prevents multi-day production outages.

## 🚨 Priority Checks for Authentication

### Before Making ANY Auth Changes

```typescript
// 1. ALWAYS check current JWT structure first
// Run this command:
// echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .

// 2. Document what you see
interface CurrentJWTPayload {
  // List EVERY field, even if seems unused
}

// 3. Preserve ALL fields in new implementation
```

### The #1 Rule: Never Trust Assumptions

**WRONG Approach** (caused 10-day outage):
```
AI: "Supabase tokens include user permissions"
Reality: Supabase tokens DO NOT include custom 'scope' field
Result: All authorization failed in production
```

**RIGHT Approach**:
```
AI: "Let me decode an actual token to verify structure"
*Decodes token*
AI: "The token is missing the 'scope' field that middleware expects"
Result: Issue identified immediately
```

---

## 🔍 Authentication Investigation Protocol

### Step 1: Understand Current State

Before suggesting fixes:

1. **Read the actual JWT token**
```bash
# Get current token structure
curl -s POST /api/v1/auth/login ... | jq -r '.token' | base64 -d
```

2. **Check what middleware expects**
```typescript
// In auth.ts, find:
req.user.scopes = decoded.scope || [];  // What field does it read?
```

3. **Verify database schema**
```sql
-- What scopes exist?
SELECT * FROM role_scopes WHERE role = 'server';
```

### Step 2: Identify Patterns

Look for these anti-patterns:

#### Split Brain Architecture
```typescript
// 🚨 DANGER: Response and JWT have different data
res.json({
  user: { scopes: fetchedScopes },  // Has scopes
  token: jwt.sign({ sub, role })    // Missing scopes!
});
```

#### Fallback Logic Masking Issues
```typescript
// 🚨 DANGER: Hides that JWT is broken
if (!req.user.scopes) {
  req.user.scopes = await fetchFromDB();  // Masks the bug!
}
```

#### Testing Response Not Token
```typescript
// 🚨 INCOMPLETE: Only tests response
expect(response.body.user.scopes).toBeDefined();
// Must also test: jwt.decode(response.body.token).scope
```

---

## 🛠️ Safe Modification Patterns

### When Removing Code (Like Demo Auth)

**Step 1: Document Current Behavior**
```typescript
// Before removing ANYTHING, document:
// 1. What JWT fields does it create?
// 2. What do consumers expect?
// 3. Run: git diff to see EXACT changes
```

**Step 2: Preserve Critical Fields**
```typescript
// When demo auth created tokens with 'scope' field
// The replacement MUST also include 'scope' field
const demoPayload = { sub, role, scope: scopes };  // OLD
const newPayload = { sub, role, scope: scopes };   // NEW - preserve!
```

**Step 3: Verify Before Committing**
```bash
# Test the actual token structure
npm run dev
TOKEN=$(curl localhost:3000/api/v1/auth/login ...)
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.scope'
# MUST not be null
```

### When Debugging Auth Failures

**Follow the Data Flow**:
```
1. Login endpoint creates JWT
   ↓ (Check: Does JWT have all fields?)
2. Client stores token
   ↓ (Check: Is token intact?)
3. Client sends token in header
   ↓ (Check: Bearer token format correct?)
4. Auth middleware decodes token
   ↓ (Check: Does decoded match created?)
5. Middleware sets req.user
   ↓ (Check: Are scopes populated?)
6. RBAC checks permissions
   ↓ (Check: Does scope include required permission?)
7. Endpoint processes request
```

**At EACH step, log and verify**:
```typescript
console.log('Step X:', {
  hasScope: !!data.scope,
  scopeCount: data.scope?.length,
  firstScope: data.scope?.[0]
});
```

---

## 📋 AI Agent Checklist

### Before Suggesting Auth Changes

- [ ] Decoded actual JWT token from the system
- [ ] Identified ALL fields in current tokens
- [ ] Checked what middleware expects
- [ ] Verified database has required data
- [ ] Looked for split brain patterns
- [ ] Checked for fallback logic

### When Writing Auth Code

- [ ] JWT includes `scope` field (array)
- [ ] JWT includes `restaurant_id` field
- [ ] Response data matches JWT content
- [ ] No fallback to database for scopes
- [ ] Tests decode and validate JWT structure
- [ ] Removed any `|| []` fallbacks

### Before Committing

- [ ] Created working token and decoded it
- [ ] Verified `scope` field exists and has data
- [ ] Tested protected endpoint with token
- [ ] Added integration test for JWT structure
- [ ] Documented JWT contract in comments

---

## 🎓 Learning from Past Mistakes

### Case Study: The JWT Scope Bug

**What AI agents assumed**:
1. ❌ "Supabase tokens include everything needed"
2. ❌ "If response has scopes, token must too"
3. ❌ "Database query fallback is a feature"
4. ❌ "Working in dev means working in prod"

**What actually happened**:
1. ✅ Supabase tokens lack custom fields
2. ✅ Response and token were different (split brain)
3. ✅ Fallback masked the bug for 6 days
4. ✅ Dev used different auth path than prod

**Lesson**: ALWAYS verify actual data, never assume.

### Common AI Agent Errors

1. **Assuming standard library behavior**
   - Supabase JWT ≠ Custom JWT
   - Default fields ≠ Required fields

2. **Fixing symptoms not causes**
   - Adding fallback instead of fixing JWT
   - Catching errors instead of preventing them

3. **Incomplete testing**
   - Testing happy path only
   - Not decoding actual tokens
   - Mocking too much

4. **Documentation trust**
   - Docs say "complete" but tests fail
   - Types lie about optional vs required

---

## 🔧 Debugging Scripts for AI Agents

### Quick JWT Analyzer

```bash
#!/bin/bash
# Save as: check-jwt.sh

TOKEN=$1
if [ -z "$TOKEN" ]; then
  echo "Usage: ./check-jwt.sh <token>"
  exit 1
fi

echo "=== JWT Analysis ==="
DECODED=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "❌ Invalid JWT format"
  exit 1
fi

echo "$DECODED" | jq . || echo "❌ Invalid JSON in payload"

echo -e "\n=== Critical Fields ==="
echo "✓ sub: $(echo $DECODED | jq -r '.sub')"
echo "✓ role: $(echo $DECODED | jq -r '.role')"
echo "✓ scope: $(echo $DECODED | jq -r '.scope')"
echo "✓ restaurant_id: $(echo $DECODED | jq -r '.restaurant_id')"

SCOPE=$(echo $DECODED | jq -r '.scope')
if [ "$SCOPE" = "null" ]; then
  echo "🚨 WARNING: scope field is missing!"
  echo "This will cause all authorization to fail!"
fi
```

### Auth Flow Validator

```typescript
// Run this to validate auth flow
async function validateAuthFlow() {
  console.log('=== Auth Flow Validation ===\n');

  // Step 1: Login
  console.log('1. Testing login...');
  const loginRes = await fetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, restaurant_id }),
  });
  const loginData = await loginRes.json();
  console.log('   ✓ Login response received');

  // Step 2: Decode token
  console.log('2. Decoding JWT...');
  const token = loginData.session.access_token;
  const decoded = JSON.parse(atob(token.split('.')[1]));
  console.log('   Decoded:', decoded);

  // Step 3: Check critical fields
  console.log('3. Checking critical fields...');
  const required = ['sub', 'email', 'role', 'scope', 'restaurant_id'];
  const missing = required.filter(field => !decoded[field]);

  if (missing.length > 0) {
    console.error(`   ❌ Missing fields: ${missing.join(', ')}`);
    return false;
  }
  console.log('   ✓ All required fields present');

  // Step 4: Verify scope is array with data
  console.log('4. Validating scope field...');
  if (!Array.isArray(decoded.scope)) {
    console.error('   ❌ Scope is not an array');
    return false;
  }
  if (decoded.scope.length === 0) {
    console.warn('   ⚠️ Scope array is empty');
  }
  console.log(`   ✓ Scope contains ${decoded.scope.length} permissions`);

  // Step 5: Test protected endpoint
  console.log('5. Testing authorization...');
  const authRes = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ test: true }),
  });

  if (authRes.status === 401) {
    const error = await authRes.json();
    console.error(`   ❌ Authorization failed: ${error.error.message}`);
    return false;
  }
  console.log('   ✓ Authorization successful');

  console.log('\n✅ Auth flow validation complete');
  return true;
}
```

---

## 🚀 Proactive Patterns

### When Starting Auth Work

```typescript
// ALWAYS start with this investigation
async function investigateAuthSystem() {
  const report = {
    jwt_structure: {},
    middleware_expectations: {},
    database_schema: {},
    recent_changes: [],
    potential_issues: []
  };

  // 1. Get current JWT structure
  const sampleToken = await getSampleToken();
  report.jwt_structure = jwt.decode(sampleToken);

  // 2. Check for split brain
  const response = await getLoginResponse();
  if (JSON.stringify(response.scopes) !== JSON.stringify(report.jwt_structure.scope)) {
    report.potential_issues.push('SPLIT BRAIN DETECTED');
  }

  // 3. Check recent commits
  const commits = await getRecentAuthCommits();
  report.recent_changes = commits;

  return report;
}
```

### When Reviewing Auth PRs

```markdown
## Auth PR Review Checklist

- [ ] JWT structure unchanged OR migration provided
- [ ] Scope field present in all JWT creation
- [ ] No split brain patterns introduced
- [ ] No new fallback logic added
- [ ] Integration tests decode JWT
- [ ] Tested with actual token, not mock
```

---

## 📚 Required Reading for AI Agents

Before working on auth, query these documents:

1. `/docs/postmortems/2025-11-12-jwt-scope-bug.md` - The 10-day incident
2. `/docs/explanation/architecture-decisions/ADR-010-jwt-payload-standards.md` - JWT requirements
3. `/claudelessons-v2/knowledge/incidents/jwt-scope-mismatch.md` - Pattern details
4. `/docs/how-to/development/AUTH_DEVELOPMENT_GUIDE.md` - Development practices

Use this query:
```
"Show me recent auth incidents and JWT structure requirements before I make changes"
```

---

## 🎯 Success Metrics for AI Agents

Your auth changes are successful when:

1. ✅ JWT tokens include ALL required fields
2. ✅ No split brain between response and token
3. ✅ No fallback logic added
4. ✅ Tests decode actual tokens
5. ✅ Zero "Missing required scope" errors
6. ✅ Auth works in production, not just dev

---

## 🆘 When to Escalate

Stop and ask for human review if:

1. 🛑 Removing more than 50 lines of auth code
2. 🛑 Changing JWT structure in any way
3. 🛑 Adding fallback or recovery logic
4. 🛑 Test failures you don't understand
5. 🛑 Mismatch between docs and reality

Better to ask than cause a 10-day outage!

---

**Remember**: The JWT scope bug was caused by assumptions. When in doubt, decode a real token and verify. Reality beats assumptions every time.

*"Trust, but verify - especially JWT payloads."* - Engineering Wisdom

---

**Document Version**: 1.0
**Last Updated**: November 12, 2025
**Based On**: JWT Scope Bug Post-mortem
**For**: AI Assistants (Claude, GPT, Copilot, etc.)