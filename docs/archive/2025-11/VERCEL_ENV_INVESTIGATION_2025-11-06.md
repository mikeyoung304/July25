# Vercel Environment Variables Investigation
**Date:** 2025-11-06  
**Issue:** VITE_DEFAULT_RESTAURANT_ID and other variables have embedded newline characters

---

## 🚨 CRITICAL FINDING: Newline Character Contamination

### The Problem

Multiple environment variables in Vercel have **literal `\n` (backslash-n) characters** appended to their values, causing application failures.

**Primary Issue:**
```bash
# What it should be:
VITE_DEFAULT_RESTAURANT_ID="grow"

# What it actually is in Vercel Production:
VITE_DEFAULT_RESTAURANT_ID="grow\n"
```

### Affected Variables

#### Production Environment (Most Critical)
- ❌ `VITE_DEFAULT_RESTAURANT_ID="grow\n"` (should be `"grow"`)
- ❌ `STRICT_AUTH="true\n"` (should be `"true"`)
- ❌ `VITE_DEMO_PANEL="1\n"` (should be `"1"`)
- ❌ `VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false\n"` (should be `"false"`)

#### Preview Environment
- ❌ `STRICT_AUTH="true\n"`
- ❌ `VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false\n"`
- ⚠️ `VITE_DEFAULT_RESTAURANT_ID` - **NOT SET** (missing entirely)

#### Development Environment  
- ❌ `STRICT_AUTH="true\n"`
- ❌ `VITE_FEATURE_NEW_CUSTOMER_ID_FLOW="false\n"`
- ⚠️ `VITE_DEFAULT_RESTAURANT_ID` - **NOT SET** (missing entirely)

---

## 📊 Environment Comparison Table

| Variable | Local Dev | Local Prod | Vercel Dev | Vercel Preview | Vercel Prod |
|----------|-----------|------------|------------|----------------|-------------|
| VITE_DEFAULT_RESTAURANT_ID | ✅ `grow` | ✅ `"grow"` | ❌ NOT SET | ❌ NOT SET | ❌ `"grow\n"` |
| STRICT_AUTH | N/A | N/A | ❌ `"true\n"` | ❌ `"true\n"` | ❌ `"true\n"` |
| VITE_DEMO_PANEL | ✅ `1` | N/A | ❌ `"1\n"` | ❌ `"1\n"` | ❌ `"1\n"` |
| VITE_FEATURE_NEW_CUSTOMER_ID_FLOW | N/A | N/A | ❌ `"false\n"` | ❌ `"false\n"` | ❌ `"false\n"` |

---

## 🔍 Complete Environment Variable List (from `vercel env ls`)

| Variable Name | Environments | Last Updated |
|--------------|--------------|--------------|
| VITE_DEFAULT_RESTAURANT_ID | **Production only** | 4 hours ago |
| VITE_FEATURE_NEW_CUSTOMER_ID_FLOW | Development, Preview, Production | 23 hours ago |
| VITE_DEMO_PANEL | Production, Preview, Development | 4 days ago |
| STRICT_AUTH | Production, Preview, Development | 30 days ago |
| VITE_API_BASE_URL | Production, Preview, Development | 31 days ago |
| VITE_ENVIRONMENT | Development, Preview, Production | 32 days ago |
| VITE_SUPABASE_URL | Production, Preview, Development | 85 days ago |
| VITE_SUPABASE_ANON_KEY | Production, Preview, Development | 85 days ago |

---

## 💥 Impact Analysis

### How Newlines Break Your Application

When `VITE_DEFAULT_RESTAURANT_ID="grow\n"`:

1. **String Comparisons Fail:**
   ```typescript
   if (restaurantId === 'grow') // FALSE (it's "grow\n")
   ```

2. **URL Routing Breaks:**
   ```typescript
   `/api/restaurants/${restaurantId}` 
   // Becomes: /api/restaurants/grow%5Cn
   // (The \n gets URL-encoded as %5Cn)
   ```

3. **Database Queries Fail:**
   ```sql
   SELECT * FROM restaurants WHERE slug = 'grow\n'
   -- No match! (looking for 'grow\n' instead of 'grow')
   ```

4. **API Requests Fail:**
   ```json
   { "restaurantId": "grow\n" }
   // Server validation rejects this
   ```

### Byte-Level Analysis

```
✅ CORRECT: "grow"
   Hex: 22 67 72 6f 77 22
   Length: 6 characters

❌ BROKEN: "grow\n"  
   Hex: 22 67 72 6f 77 5c 6e 22
   Length: 8 characters
   Extra: 5c 6e (backslash + n)
```

---

## 🛠️ Root Cause

The newline characters were likely introduced when setting variables via:

1. **Copy-paste from files with trailing newlines**
2. **CLI piping without -n flag:**
   ```bash
   echo "grow" | vercel env add  # ❌ Includes newline
   echo -n "grow" | vercel env add  # ✅ No newline
   ```
3. **Multi-line input in Vercel dashboard** (pressing Enter after value)

---

## ✅ SOLUTION: Step-by-Step Fix

### Step 1: Fix Production (CRITICAL)

```bash
# Fix VITE_DEFAULT_RESTAURANT_ID
vercel env rm VITE_DEFAULT_RESTAURANT_ID production
vercel env add VITE_DEFAULT_RESTAURANT_ID production
# When prompted, enter: grow
# Press Ctrl+D (not Enter) to finish without newline
# OR use: echo -n "grow" | vercel env add VITE_DEFAULT_RESTAURANT_ID production

# Fix STRICT_AUTH
vercel env rm STRICT_AUTH production
echo -n "true" | vercel env add STRICT_AUTH production

# Fix VITE_DEMO_PANEL
vercel env rm VITE_DEMO_PANEL production
echo -n "1" | vercel env add VITE_DEMO_PANEL production

# Fix VITE_FEATURE_NEW_CUSTOMER_ID_FLOW
vercel env rm VITE_FEATURE_NEW_CUSTOMER_ID_FLOW production
echo -n "false" | vercel env add VITE_FEATURE_NEW_CUSTOMER_ID_FLOW production
```

### Step 2: Fix Preview Environment

```bash
# Add missing VITE_DEFAULT_RESTAURANT_ID
echo -n "grow" | vercel env add VITE_DEFAULT_RESTAURANT_ID preview

# Fix existing variables
vercel env rm STRICT_AUTH preview
echo -n "true" | vercel env add STRICT_AUTH preview

vercel env rm VITE_FEATURE_NEW_CUSTOMER_ID_FLOW preview
echo -n "false" | vercel env add VITE_FEATURE_NEW_CUSTOMER_ID_FLOW preview
```

### Step 3: Fix Development Environment

```bash
# Add missing VITE_DEFAULT_RESTAURANT_ID
echo -n "grow" | vercel env add VITE_DEFAULT_RESTAURANT_ID development

# Fix existing variables
vercel env rm STRICT_AUTH development
echo -n "true" | vercel env add STRICT_AUTH development

vercel env rm VITE_FEATURE_NEW_CUSTOMER_ID_FLOW development
echo -n "false" | vercel env add VITE_FEATURE_NEW_CUSTOMER_ID_FLOW development
```

### Step 4: Redeploy

```bash
# Trigger a new deployment to pick up the fixed environment variables
vercel --prod
```

---

## 🔒 Prevention: Best Practices

1. **Always use `echo -n` when piping to Vercel CLI:**
   ```bash
   echo -n "value" | vercel env add VARIABLE_NAME environment
   ```

2. **Use a script to set all variables:**
   ```bash
   #!/bin/bash
   # set-vercel-envs.sh
   
   set_env() {
     local name=$1
     local value=$2
     local env=$3
     
     vercel env rm "$name" "$env" --yes 2>/dev/null || true
     echo -n "$value" | vercel env add "$name" "$env"
   }
   
   set_env VITE_DEFAULT_RESTAURANT_ID "grow" production
   set_env STRICT_AUTH "true" production
   # etc...
   ```

3. **Verify after setting:**
   ```bash
   vercel env pull .env.verify --environment production
   hexdump -C .env.verify | grep VITE_DEFAULT_RESTAURANT_ID
   ```

4. **Use the Vercel dashboard carefully:**
   - Don't press Enter after typing the value
   - Use Ctrl+Enter or click "Save" immediately

---

## 📁 File Locations

All investigation files are in: `/Users/mikeyoung/CODING/rebuild-6.0/`

- `.env` - Local development (✅ Correct)
- `.env.production` - Local production (✅ Correct)
- `.env.vercel.production` - Pulled from Vercel (❌ Has newlines)
- `.env.production.vercel` - Pulled from Vercel Production (❌ Has newlines)
- `.env.preview.vercel` - Pulled from Vercel Preview (❌ Has newlines, missing VITE_DEFAULT_RESTAURANT_ID)
- `.env.vercel.check` - Pulled from Vercel Development (❌ Has newlines, missing VITE_DEFAULT_RESTAURANT_ID)

---

## 🎯 Expected Behavior After Fix

Once fixed and redeployed:

- ✅ `import.meta.env.VITE_DEFAULT_RESTAURANT_ID` returns `"grow"` (not `"grow\n"`)
- ✅ URL routing works: `/grow/order` resolves correctly
- ✅ API calls succeed: `GET /api/restaurants/grow` returns restaurant data
- ✅ Database queries match: `WHERE slug = 'grow'` finds the restaurant
- ✅ String comparisons work: `restaurantId === 'grow'` returns true

---

## 📞 Next Steps

1. ✅ **IMMEDIATE:** Run the fix commands above for Production
2. ✅ **SOON:** Fix Preview and Development environments
3. ✅ **VERIFY:** Pull env vars again and confirm no `\n` characters
4. ✅ **DEPLOY:** Trigger new production deployment
5. ✅ **TEST:** Verify application works correctly
6. ✅ **DOCUMENT:** Add this to team runbook for future reference

---

**Investigation completed:** 2025-11-06  
**Investigator:** Claude Code  
**Working Directory:** `/Users/mikeyoung/CODING/rebuild-6.0`
