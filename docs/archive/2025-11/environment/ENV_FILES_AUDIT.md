# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: Environment Audits

---

# Environment Files Audit - Critical Issues
**Date**: 2025-11-12 15:20 UTC
**Status**: 🔴 MULTIPLE ISSUES FOUND

---

## 🚨 Critical Issues

### Issue #1: Backend DEFAULT_RESTAURANT_ID Set to Slug (BREAKS SERVER)
**File**: `.env.bak` (line 15)
```bash
DEFAULT_RESTAURANT_ID=grow  # ❌ WRONG - This must be UUID!
```

**Impact**: If this value is in Render, the server CANNOT START.
**Fix**: Must be `11111111-1111-1111-1111-111111111111` for backend

**Current .env** (line 15): Correctly has UUID ✅
**Backup file**: Has slug "grow" ❌ (shows this was changed at some point)

---

### Issue #2: Vercel Files Missing VITE_DEFAULT_RESTAURANT_ID
**Files Affected**:
- `.env.preview.vercel` - MISSING entirely
- `.env.vercel.check` - MISSING entirely

**Current Values**:
- `.env.vercel.current` (line 25): `VITE_DEFAULT_RESTAURANT_ID="grow"` ✅ (Frontend can use slug)
- `.env.preview.vercel`: ❌ MISSING
- `.env.vercel.check`: ❌ MISSING

**Impact**: Preview deployments and check builds might fail or use wrong restaurant
**Fix**: Add `VITE_DEFAULT_RESTAURANT_ID="grow"` to both files

---

### Issue #3: Newline Characters in Environment Values
**Files Affected**:
- `.env.preview.vercel` (line 3): `STRICT_AUTH="true\n"` ❌
- `.env.preview.vercel` (line 27): `VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false\n"` ❌
- `.env.vercel.check` (line 2): `STRICT_AUTH="true\n"` ❌
- `.env.vercel.check` (line 7): `VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false\n"` ❌

**Impact**: These literal `\n` characters in values can cause:
- String comparison failures (e.g., `"true\n" !== "true"`)
- Boolean parsing issues
- Unexpected behavior in conditionals

**Fix**: Remove the `\n` from these values:
```bash
STRICT_AUTH="true"  # Not "true\n"
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false"  # Not "false\n"
```

---

## 📊 Environment File Comparison

### Backend Variables (Server-side)
| Variable | .env (current) | .env.bak | Render (suspected) |
|----------|----------------|----------|-------------------|
| DEFAULT_RESTAURANT_ID | ✅ UUID | ❌ "grow" | ❌ "grow" (likely) |
| SQUARE_APP_ID | ✅ Present | ✅ Present | ❌ Named wrong (SQUARE_APPLICATION_ID) |

### Frontend Variables (Client-side)
| Variable | .env.vercel.current | .env.preview.vercel | .env.vercel.check |
|----------|---------------------|---------------------|-------------------|
| VITE_DEFAULT_RESTAURANT_ID | ✅ "grow" | ❌ MISSING | ❌ MISSING |
| STRICT_AUTH | ✅ "true" | ❌ "true\n" | ❌ "true\n" |
| VITE_FEATURE_NEW_CUSTOMER_ID_FLOW | ✅ "false" | ❌ "false\n" | ❌ "false\n" |

---

## 🔍 Root Cause Analysis

### How This Happened

1. **Slug Migration**: At some point, you changed from UUID to slug "grow" for easier configuration
2. **Incomplete Update**: Backend DEFAULT_RESTAURANT_ID was changed to "grow" in .env.bak
3. **Validation Added**: Commit `dbc009d5` added strict UUID validation for backend
4. **Conflict**: Backend validation requires UUID, but Render may have slug "grow"

### Why Frontend vs Backend is Different

| Component | Variable | Can Use Slug? | Reason |
|-----------|----------|---------------|--------|
| Frontend | `VITE_DEFAULT_RESTAURANT_ID` | ✅ YES | Sent in headers, slug resolver handles it |
| Backend | `DEFAULT_RESTAURANT_ID` | ❌ NO | Validated at startup, before middleware |

---

## ✅ Complete Fix Checklist

### 1. Render Environment (URGENT)
- [ ] Scroll up to find `DEFAULT_RESTAURANT_ID`
- [ ] Change from `"grow"` to `"11111111-1111-1111-1111-111111111111"`
- [ ] Rename `SQUARE_APPLICATION_ID` to `SQUARE_APP_ID` (or add new variable)
- [ ] Save changes → Render auto-deploys

### 2. Vercel Environment Files (HIGH PRIORITY)
- [ ] Add `VITE_DEFAULT_RESTAURANT_ID="grow"` to `.env.preview.vercel`
- [ ] Add `VITE_DEFAULT_RESTAURANT_ID="grow"` to `.env.vercel.check`

### 3. Fix Newline Characters (MEDIUM PRIORITY)
Edit these files to remove `\n` literals:

**`.env.preview.vercel`**:
```bash
# Line 3: Change from
STRICT_AUTH="true\n"
# To
STRICT_AUTH="true"

# Line 27: Change from
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false\n"
# To
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false"
```

**`.env.vercel.check`**:
```bash
# Line 2: Change from
STRICT_AUTH="true\n"
# To
STRICT_AUTH="true"

# Line 7: Change from
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false\n"
# To
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false"
```

### 4. Clean Up Backup File (OPTIONAL)
**`.env.bak`** (line 15):
```bash
# Change from
DEFAULT_RESTAURANT_ID=grow
# To
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

---

## 🎯 Priority Actions

### IMMEDIATE (Blocks Deployment)
1. ✅ Fix Render `DEFAULT_RESTAURANT_ID` → UUID
2. ✅ Fix Render `SQUARE_APP_ID` naming

### HIGH (Breaks Preview/Check Builds)
3. Add `VITE_DEFAULT_RESTAURANT_ID` to preview and check env files

### MEDIUM (May Cause Subtle Bugs)
4. Remove `\n` characters from boolean values

---

## 📝 Testing After Fix

### Test 1: Render Deployment
```bash
# After fixing Render env vars, check server starts
curl -s "https://july25-server.onrender.com/api/v1/health" | jq .
```

### Test 2: Vercel Preview
```bash
# After fixing .env.preview.vercel, test preview deployment
# Should use correct restaurant ID
```

### Test 3: Environment Variable Consistency
```bash
# Verify no more newline issues
grep -r '\\n"' .env.*
# Should return nothing
```

---

## 🛡️ Prevention Strategy

### 1. Document Backend vs Frontend Distinction
Create `.env.example` with clear comments:
```bash
# Backend (Server-side) - MUST be UUID
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# Frontend (Client-side) - Can use slug
VITE_DEFAULT_RESTAURANT_ID=grow
```

### 2. Add Environment Validation Script
Create `scripts/validate-env.sh`:
```bash
#!/bin/bash
# Validate no newlines in env values
if grep -q '\\n"' .env.*; then
  echo "❌ Found literal newlines in env values"
  exit 1
fi

# Validate DEFAULT_RESTAURANT_ID is UUID
if ! grep -q 'DEFAULT_RESTAURANT_ID=[0-9a-f-]\{36\}' .env; then
  echo "❌ DEFAULT_RESTAURANT_ID must be UUID format"
  exit 1
fi
```

### 3. Add Pre-commit Hook
Prevent committing bad env values

---

## 📞 If Issues Persist

1. **Check Render Logs**: Verify new env vars are being used
2. **Verify UUID Format**: Ensure no typos in the UUID
3. **Check All Caps**: Environment variables are case-sensitive
4. **Clear Render Build Cache**: Sometimes old values are cached

---

**Created**: 2025-11-12 15:20 UTC
**Status**: 🔴 MULTIPLE CRITICAL ISSUES - FIXES REQUIRED
**Priority**: P0 (Blocks production deployment)
