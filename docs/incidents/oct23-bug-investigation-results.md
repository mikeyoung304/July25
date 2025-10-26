# October 23, 2025 - Bug Investigation Results

**Date:** October 23, 2025
**Status:** 🔍 Investigation Complete - Action Required
**Priority:** P1 - OpenAI API Key Invalid

---

## Executive Summary

Investigated and resolved two critical bugs in the Restaurant OS application:

1. ✅ **RBAC Authorization Bug** - **RESOLVED** - Demo users blocked from payments
2. ✅ **OpenAI API Key Invalid** - **RESOLVED** - Key mismatch between local and production

---

## Issue 1: RBAC Authorization Bug [RESOLVED]

### Problem
Demo users with server role were being blocked from payment endpoints with **403 Forbidden** errors.

### Root Cause
**Location:** `server/src/middleware/rbac.ts:214-240`

Recent commit (822d3e8, Oct 18) added bypass logic for specific roles (`customer`, `kiosk_demo`), but left other demo roles (server, cashier, etc.) falling through to database lookup.

Demo user IDs are randomly generated (format: `demo:server:abc123`) and don't exist in the `user_restaurants` table, causing the RBAC middleware to reject them with "User has no role in restaurant".

### Fix Applied
Changed RBAC middleware to check **user ID prefix** instead of specific role names:

```typescript
// BEFORE (lines 214-216):
if (req.user.role === 'customer' || req.user.role === 'kiosk_demo') {
  // bypass database lookup
}

// AFTER (lines 217-240):
if (req.user.id?.startsWith('demo:')) {
  const roleScopes = getScopesForRole(req.user.role);
  const hasRequiredScope = requiredScopes.some(scope =>
    roleScopes.includes(scope)
  );
  // ... rest of bypass logic
  return next();
}
```

### Verification
Created automated test script: `/scripts/test-rbac-fix.sh`

**Results:**
- ✅ Demo session creation succeeds (200 OK)
- ✅ Order creation succeeds (201 Created)
- ✅ Payment endpoint reached (400 error from business logic, not 403 from RBAC)
- ✅ No "User has no role in restaurant" errors in logs

**Conclusion:** RBAC fix working as expected. Payment requests now reach business logic layer where they fail on amount validation (expected behavior).

---

## Issue 2: OpenAI API Key Invalid [RESOLVED]

### Problem
Voice ordering feature failed with **401 Unauthorized** errors when creating realtime sessions.

**Error from OpenAI API:**
```json
{
  "error": {
    "message": "Incorrect API key provided: sk-svcac*...rYPZ. You can find your API key at https://platform.openai.com/account/api-keys.",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}
```

### Investigation Results

#### Environment Variable Audit
**Location:** `/Users/mikeyoung/CODING/rebuild-6.0/.env:26`

```bash
OPENAI_API_KEY=[REDACTED]zYHPI9dJLVhEpywf7p8Y74MSZ0b4dkyOLYT9MzGCqQss1NFPhIp1lSTrZAOeweKPTTRvHPr2k7T3BlbkFJ4aAFDkxFGYFSHkjMD5XzYV3KOAV52GH-AGdFf6dFj4xbnjwe6ymgTZ9S7drYPZ
```

**Key Properties:**
- Format: `[REDACTED]*` (service account key)
- Length: 155 characters
- Location: Only in root `.env` file (no duplicates)
- Status: ❌ Rejected by OpenAI API

#### Loading Verification
**File:** `server/src/config/env.ts:1-7`

```typescript
// Load environment variables from project root
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });
```

**Resolved Path:** `/Users/mikeyoung/CODING/rebuild-6.0/.env` ✅

**Key Loading Test:**
```bash
node -e "require('dotenv').config({path:'.env'}); console.log('Key exists:', !!process.env.OPENAI_API_KEY)"
# Output: Key exists: true ✅
```

#### API Usage Verification
**Endpoints Using Key:**
1. `server/src/routes/realtime.routes.ts:113` - Realtime session creation
2. Uses `process.env['OPENAI_API_KEY']` consistently across codebase

**Test Results:**
```bash
# Test 1: Models endpoint
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
# Result: 401 Unauthorized - "Incorrect API key provided"

# Test 2: Realtime sessions endpoint
curl -X POST -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/realtime/sessions \
  -d '{"model": "gpt-4o-realtime-preview-2024-10-01"}'
# Result: 401 Unauthorized - "Incorrect API key provided"
```

Both endpoints explicitly reject the key as invalid.

#### Git History Review
**Relevant Commits:**
- `bf1a1dcd` (Aug 23): Implemented OpenAI proxy for security (no key changes)
- `3c191a2` (Oct 16): Fixed voice ordering item parsing (client-side only)
- No recent changes to API key or realtime routes

**File History:**
```bash
git log --oneline -10 -- server/src/routes/realtime.routes.ts
```
- Last modified: `f659ae8` (TypeScript fixes, no functional changes)
- No commits modifying the API key itself

### Root Cause Discovered
**Key mismatch between local development and production environments.**

**Investigation revealed:**
1. ✅ Local `.env` had old service account key: `[REDACTED]...rYPZ`
2. ✅ Production Render environment had newer project key: `[REDACTED]...wcsA`
3. ✅ Old key was revoked or expired
4. ✅ User confirmed correct key from OpenAI dashboard ends in `wcsA`

### Fix Applied
Updated `/Users/mikeyoung/CODING/rebuild-6.0/.env` line 26:

```bash
# BEFORE:
OPENAI_API_KEY=[REDACTED]zYHPI9dJLVhEpywf7p8Y74MSZ0b4dkyOLYT9MzGCqQss1NFPhIp1lSTrZAOeweKPTTRvHPr2k7T3BlbkFJ4aAFDkxFGYFSHkjMD5XzYV3KOAV52GH-AGdFf6dFj4xbnjwe6ymgTZ9S7drYPZ

# AFTER:
OPENAI_API_KEY=[REDACTED]WCGmZJlvkAY4cVhjlAA9ya_77PsTSovmmXo_HR9jF_mVq5slQ1CTy6bNQo4oeatjAu2HlWqLZcT3BlbkFJD5WFYD_Nl9qjbL1GpQLDkScFYTHP7E0h9bTg52t5vUg2HTkrKGdVT9tSATychMf7Jz2olYwcsA
```

### Verification
**Test Results:**
```bash
$ ./scripts/test-openai-key.sh

🔍 Testing OpenAI API Key...
Key format: [REDACTED]WCGmZJl...Jz2olYwcsA
Key length: 164 characters

1️⃣  Testing basic API access (list models)...
✅ Basic API access works

2️⃣  Testing realtime sessions endpoint...
   HTTP Status: 200
✅ Realtime sessions endpoint works!

🎉 OpenAI API key is valid for realtime API
```

**Server Logs:**
```
✅ OpenAI configured
🚀 Unified backend running on port 3001
   - Voice AI: http://localhost:3001/api/v1/ai
```

### Resolution Status
✅ **RESOLVED** - Voice ordering feature now has valid OpenAI API access

---

## Next Steps

### Completed (Today)
1. ✅ RBAC fix verified and working
2. ✅ OpenAI API key updated from production
3. ✅ Voice ordering API access verified (200 OK)
4. ✅ Dev server running with correct configuration

### Short-term (This Week)
1. Test complete payment flow end-to-end in browser
2. Verify production endpoints match local behavior
3. Run full E2E test suite
4. Update CHANGELOG.md with RBAC fix

### Documentation Updates
1. ✅ Created automated RBAC test script
2. ✅ Created OpenAI key validation script
3. ✅ Documented investigation findings (this file)
4. ⏳ Update oct23plan.md with resolution

---

## Files Created/Modified

### Scripts Created
- `/scripts/test-rbac-fix.sh` - Automated RBAC verification
- `/scripts/test-openai-key.sh` - OpenAI API key validation

### Code Modified
- `server/src/middleware/rbac.ts` (lines 214-240) - Extended demo user bypass

### Documentation Created
- `oct23-bug-investigation-results.md` (this file)

---

## Testing Summary

### RBAC Tests
- ✅ Demo session creation (server role)
- ✅ Order creation
- ✅ Payment endpoint access (reaches business logic)
- ✅ No 403 Forbidden errors
- ✅ Logs show demo users authorized correctly

### OpenAI API Tests
- ❌ Basic API access (models endpoint) - 401 Unauthorized
- ❌ Realtime sessions endpoint - 401 Unauthorized
- ❌ Key rejected by OpenAI with "invalid_api_key" error

---

**Document Status:** 🟢 COMPLETE - ALL ISSUES RESOLVED
**Owner:** Engineering Team
**Next Action:** Manual browser testing of voice ordering feature
**Last Updated:** October 23, 2025 15:20 EDT
