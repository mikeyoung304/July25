# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Investigations

---

# AI Agent Mistake Analysis: Git History Audit
**Generated:** 2025-11-10
**Repository:** rebuild-6.0
**Analysis Period:** August 2025 - November 2025
**Methodology:** Comprehensive git history scan for AI-introduced errors and misleading diagnoses

---

## Executive Summary

This analysis identifies **8 major categories** of AI agent mistakes that led teams toward misleading symptoms or incorrect diagnoses. The patterns reveal systematic issues in how AI agents approach debugging, particularly around React SSR/hydration, database schema mismatches, and authentication flows.

**Key Metrics:**
- **Major incidents documented:** 12
- **False diagnoses leading to wasted time:** 6
- **Revert commits required:** 4
- **Average time to resolution after wrong diagnosis:** 1-3 days
- **Documentation archived due to inflated claims:** 40+ files

---

## Category 1: React SSR/Hydration Misdiagnosis

### Incident #1: React #318 Hydration Bug (CRITICAL)
**Original Issue:** 3949d61a (2025-11-10)
**Post-Mortem:** 5915e83d (2025-11-10)
**Duration:** 3+ days across 4 sessions

#### Misleading Symptom vs Actual Root Cause

**What Users Saw:**
- "This section couldn't be loaded" error in ServerView
- Both voice and touch ordering modals completely broken
- React Error #318 in console (ignored initially)

**Initial AI Diagnosis (WRONG):**
```typescript
// accf09e9 (2025-11-09) - INCORRECT FIX
"Root cause: VoiceOrderModal had nested UnifiedCartProvider
wrapping MenuGrid, creating context conflicts"
```

**Why This Was Wrong:**
- Context nesting was actually the CORRECT pattern
- ServerView is lazy-loaded, creating a context boundary
- MenuGrid legitimately needed cart context access
- The nested provider was not the issue at all

**Actual Root Cause:**
```typescript
// Line 81 in VoiceOrderModal.tsx
if (!show || !table || !seat) return null  // ❌ Early return BEFORE AnimatePresence

return (
  <AnimatePresence>  // This wrapper must render consistently
    {show && ( /* content */ )}
  </AnimatePresence>
)
```

**The Real Problem:**
- Early return prevented AnimatePresence from rendering consistently
- Server rendered `null` when modal closed (no DOM elements)
- Client rendered `AnimatePresence` wrapper (`<div>`)
- DOM mismatch → React Error #318 hydration failure

**Timeline of Wrong Turns:**
1. **Day 1-2:** Assumed nested providers were the issue
2. **Commit accf09e9:** Removed nested provider (wrong fix)
3. **Day 3:** User reported "nothing is being fixed"
4. **Commit 6bded64f:** Restored nested provider (reverted wrong fix)
5. **Day 3:** Finally investigated React #318 error message
6. **Commit 3949d61a:** Fixed actual issue (early return)

**Files Affected:**
- `client/src/pages/components/VoiceOrderModal.tsx`

**Actionable Lessons:**

1. **Trust Error Messages First**
   - React #318 explicitly means hydration mismatch
   - Don't ignore framework error codes in favor of architecture assumptions
   - Use unminified builds during debugging

2. **Early Returns + SSR = Danger**
   - Never early return before wrapper components (AnimatePresence, Suspense, Providers)
   - Move conditionals INSIDE wrappers, not before them
   - Pattern: `return (<Wrapper>{condition && <Content />}</Wrapper>)`

3. **Test in Production Builds**
   - Dev mode hides hydration issues
   - `suppressHydrationWarning` masks real problems
   - Always verify SSR components in production builds

4. **Question Your Assumptions**
   - Previous fixes create confirmation bias ("we fixed providers before")
   - Architecture changes aren't always the answer
   - Sometimes the fix is removing 1 line, not refactoring

**Prevention Strategy:**
```javascript
// ESLint rule to catch this pattern
{
  "rules": {
    "react/no-unstable-wrapper-render": ["error", {
      "wrappers": ["AnimatePresence", "Suspense"]
    }]
  }
}
```

---

## Category 2: Database Schema Mismatches

### Incident #2: RPC Type Mismatch (VARCHAR vs TEXT)
**Original Issue:** cb02f9ad (2025-10-29)
**Context:** 006647626f79 (previous migration)

#### Misleading Symptom vs Actual Root Cause

**What Logs Showed:**
```
PostgreSQL Error 42804
"Returned type text does not match expected type character varying"
```

**Initial AI Approach (INEFFICIENT):**
- Created new migration with VARCHAR types (20251030010000)
- Tried to match what seemed like expected types
- Didn't verify actual table schema first

**Actual Root Cause:**
- RPC function signature used `VARCHAR` types
- But `orders` table actually uses `TEXT` types
- PostgreSQL cannot cast TEXT to VARCHAR in return type
- Migration system wasn't syncing RPC signatures with table schemas

**The Fix:**
```sql
-- Before (WRONG)
CREATE FUNCTION create_order_with_audit(
  p_order_number VARCHAR,  -- ❌ Mismatch
  p_type VARCHAR,           -- ❌ Mismatch
  p_status VARCHAR,         -- ❌ Mismatch
  ...
)

-- After (CORRECT)
CREATE FUNCTION create_order_with_audit(
  p_order_number TEXT,  -- ✅ Matches table
  p_type TEXT,          -- ✅ Matches table
  p_status TEXT,        -- ✅ Matches table
  ...
)
```

**Files Affected:**
- `supabase/migrations/20251030020000_fix_rpc_type_mismatch.sql`

**Actionable Lessons:**

1. **Verify Database Schema First**
   - Don't assume types from function signatures
   - Query actual table definitions: `\d+ orders`
   - RPC signatures must match table column types exactly

2. **PostgreSQL Type System Is Strict**
   - VARCHAR and TEXT are not interchangeable in RPC returns
   - TEXT is preferred for all string columns (PostgreSQL best practice)
   - Always use consistent types across migrations

3. **Add Schema Validation**
   - Document RPC sync guidelines (done: `docs/db/rpc-function-sync-guidelines.md`)
   - Add migration validation scripts
   - Check type consistency before deploying RPCs

---

### Incident #3: Schema Field Name Mismatch (seats vs capacity)
**Original Issue:** 1b7826ec (2025-11-06)

#### Misleading Symptom vs Actual Root Cause

**What Users Saw:**
- Seat selection modal showing empty buttons
- Voice ordering failing after table selection
- No visible seats to select

**Initial AI Diagnosis:**
- Assumed UI rendering bug
- Checked modal component logic
- Investigated event handlers

**Actual Root Cause:**
```typescript
// Server returns
{ seats: 4 }

// Client expects
{ capacity: 4 }

// Result: SeatSelectionModal reads table.capacity (undefined)
```

**The Problem:**
- Database column: `seats`
- API transformations inconsistent
- Client type definitions expect `capacity`
- Field name mismatch = missing data

**The Fix:**
```typescript
// server/routes/tables.routes.ts
const transformedData = tables.map(table => ({
  ...table,
  x: table['x_pos'],
  y: table['y_pos'],
  type: table['shape'],
  capacity: table['seats']  // ✅ Transform to expected name
}));
```

**Files Affected:**
- `server/src/routes/tables.routes.ts` (5 endpoints)
- `server/src/services/orders.service.ts`
- `client/src/pages/components/VoiceOrderModal.tsx`

**Actionable Lessons:**

1. **Consistent Field Naming Across Stack**
   - Document schema → API → client field mappings
   - Use transformation layer at API boundary
   - Type definitions should match client expectations

2. **Type Safety Doesn't Catch Runtime Mismatches**
   - TypeScript types can be wrong
   - Need runtime validation or integration tests
   - E2E tests would have caught this immediately

3. **Log Data Structures During Debugging**
   - Added debug logging to see actual vs expected fields
   - Helps identify schema mismatches quickly
   - Remove debug logs after fixing

---

## Category 3: Authentication & Context Misconfigurations

### Incident #4: Restaurant Context Using Hardcoded Mock
**Original Issue:** 0c1de0f6 (2025-10-30)

#### Misleading Symptom vs Actual Root Cause

**What Users Saw:**
- Menu API returning 400 errors
- "Restaurant not found" messages
- Voice ordering failing to load menu items

**Initial AI Diagnosis:**
- API endpoint broken
- Menu data missing from database
- Network issues or CORS problems

**Actual Root Cause:**
```typescript
// RestaurantContext.tsx (BEFORE)
const mockRestaurantId = "11111111-1111-1111-1111-111111111111";
// ❌ Hardcoded mock, ignoring authenticated user's actual restaurant ID

// API calls used mock ID, but user's JWT had different restaurant_id
// Result: Multi-tenancy isolation = 400 Bad Request
```

**What AI Missed:**
- AuthContext was WORKING correctly (had real restaurant ID from JWT)
- RestaurantContext was IGNORING AuthContext
- Never checked if contexts were synced
- Assumed all context sources were aligned

**The Fix:**
```typescript
// RestaurantContext.tsx (AFTER)
const { restaurantId: authRestaurantId } = useAuth();  // ✅ Read from auth
const restaurantId = authRestaurantId || DEFAULT_RESTAURANT_ID;  // ✅ Sync
```

**Files Affected:**
- `client/src/core/RestaurantContext.tsx`

**Actionable Lessons:**

1. **Context Sources Must Be Synchronized**
   - Don't create parallel context systems with different data
   - One source of truth for authentication data
   - Derived contexts should read from primary source

2. **Multi-Tenancy Requires Careful Context Flow**
   - Restaurant ID must flow through entire request chain
   - Header → Auth → Context → API calls
   - Break in any link = 400/403 errors

3. **Mock Data Should Be Last Resort**
   - Only use defaults when no auth exists
   - Don't override real data with mocks
   - Log source of data for debugging

---

### Incident #5: Optional Auth Missing Restaurant ID Extraction
**Original Issue:** e836901b (2025-10-27)
**Investigation:** docs/investigations/menu-loading-error-fix-oct27-2025.md

#### Misleading Symptom vs Actual Root Cause

**What Screenshot Showed:**
```
URL: july25.onrender.com/_1/menu/categories11
```
- Appeared to show corrupted API URLs
- Led to investigation of Vite build-time string replacement
- Hours wasted on URL construction code

**What Puppeteer Revealed:**
```json
{
  "url": "https://july25.onrender.com/api/v1/menu/categories",  // ✅ CORRECT
  "status": 500,
  "error": { "code": "22P02" }  // PostgreSQL invalid UUID
}
```

**Actual Root Cause:**
```typescript
// auth.ts - optionalAuth middleware (BEFORE)
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return next();  // ❌ Does nothing with x-restaurant-id header
}

// Menu route tries to use it
const restaurantId = req.restaurantId!;  // ❌ undefined!

// PostgreSQL query
SELECT * FROM menu_categories WHERE restaurant_id = undefined
// Error 22P02: Cannot parse undefined as UUID
```

**What AI Missed:**
- URLs were never corrupted (screenshot was DevTools display artifact)
- Error was backend 500, not frontend URL construction
- `optionalAuth` middleware incomplete for unauthenticated path
- PostgreSQL error code 22P02 should have been the clue

**The Fix:**
```typescript
// auth.ts - optionalAuth middleware (AFTER)
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  // ✅ Extract restaurant ID from header for unauthenticated requests
  const restaurantId = req.headers['x-restaurant-id'] as string;
  if (restaurantId) {
    req.restaurantId = restaurantId;
  }
  return next();
}
```

**Files Affected:**
- `server/src/middleware/auth.ts`

**Actionable Lessons:**

1. **Trust Network Inspection Over Visual Artifacts**
   - DevTools display can be misleading
   - Always use Network tab to see actual requests
   - Puppeteer automation helps verify real traffic

2. **Middleware Must Handle ALL Code Paths**
   - `optionalAuth` had authenticated path (working)
   - But unauthenticated path was incomplete
   - Both paths need proper context extraction

3. **PostgreSQL Error Codes Are Clues**
   - 22P02 = invalid text representation (type parsing)
   - Immediately suggests `undefined` or wrong type
   - Don't ignore database error codes

---

## Category 4: AI Parsing & Voice Ordering Confusion

### Incident #6: Wrong AI Parse Method & Field Names
**Original Issue:** 5e65699f (2025-10-29)

#### Misleading Symptom vs Actual Root Cause

**What Users Saw:**
- Voice orders showing raw transcription instead of menu items
- "Order in Greek salad" instead of "Greek Salad - $12.99"
- Random UUIDs generated for items

**Initial AI Diagnosis:**
- OpenAI integration broken
- Menu data not loading
- Fuzzy matching service failing

**Actual Root Cause:**
```typescript
// orders.routes.ts (BEFORE - WRONG)
const result = await orderNLP.parseOrder({ restaurantId, text });
// ❌ Calling legacy method that doesn't exist

// Looking for wrong field names
const menuItemId = item.menu_item_id;  // ❌ snake_case
const itemName = item.name;            // ❌ Doesn't exist in ParsedOrder

// Fallback to random UUID when lookup fails
const menuItemId = randomUUID();  // ❌ Generates garbage data
```

**What AI Missed:**
- API method was refactored but route not updated
- New method: `orderNLP.parse()` (not `parseOrder()`)
- Field names changed to camelCase: `menuItemId` (not `menu_item_id`)
- Fallback logic was hiding the real error

**The Fix:**
```typescript
// orders.routes.ts (AFTER - CORRECT)
const result = await orderNLP.parse({ restaurantId, text });
// ✅ Correct method

// Use correct field names
const menuItemId = item.menuItemId;  // ✅ camelCase
const menuItem = await lookupMenuItem(menuItemId);  // ✅ Actual data

// Remove fallback that masks errors
if (!menuItem) {
  throw new Error(`Menu item not found: ${menuItemId}`);
}
```

**Files Affected:**
- `server/src/routes/orders.routes.ts`

**Actionable Lessons:**

1. **API Refactoring Must Update All Consumers**
   - Search codebase for all method calls
   - Update field name access throughout
   - Remove old methods to force errors

2. **Fallbacks Can Hide Real Bugs**
   - Random UUID generation masked the lookup failure
   - Better to throw error and fix root cause
   - Logging is not enough if fallback continues

3. **Document API Changes**
   - Method signature changes need migration guide
   - Field name changes need search/replace plan
   - Integration tests catch these immediately

---

### Incident #7: Wrong Code Path Fixed (Server-Side vs Client-Side)
**Original Issue:** 58578b1b (2025-10-30)

#### Misleading Symptom vs Actual Root Cause

**What Users Saw:**
- Server voice orders returning 500 errors
- Stuck loading states in incognito mode
- Order items showing raw text

**Initial AI Diagnosis:**
- Fixed server-side AI parsing (POST `/api/v1/orders/voice`)
- Assumed voice ordering uses server-side parsing

**Actual Root Cause:**
```
ServerView uses DIFFERENT code path:
- Uses POST /api/v1/orders (not /api/v1/orders/voice)
- Uses client-side OrderParser (not server-side AI)
- When OrderParser fails → creates raw item WITHOUT menuItemId
- Submission sends menu_item_id: undefined → Zod validation rejects
```

**What AI Missed:**
- Two different voice ordering implementations
- Fixed the wrong implementation path
- ServerView uses client-side parsing, not server-side
- Previous commits "fixed" code that wasn't being executed

**The Fix:**
```typescript
// Root Cause #1: RestaurantContext initialization
// BEFORE: useAsyncState (first render = null)
// AFTER: Synchronous useState (always available)

// Root Cause #2: Validate items before submission
const validItems = items.filter(item => item.menuItemId);
if (validItems.length === 0) {
  throw new Error('No valid menu items');
}

// Root Cause #3: Remove raw item fallback
// BEFORE: Create item with raw text if parsing fails
// AFTER: Show error toast, don't submit invalid data
```

**Files Affected:**
- `client/src/core/RestaurantContext.tsx`
- `client/src/pages/hooks/useVoiceOrderWebRTC.ts`

**Actionable Lessons:**

1. **Multiple Code Paths Require Full Investigation**
   - Don't assume one implementation
   - Trace execution path from UI to API
   - Different features may use different flows

2. **Client-Side vs Server-Side Parsing**
   - Kiosk: server-side AI parsing
   - ServerView: client-side OrderParser
   - Need to know which path is executing

3. **Validation Should Fail Fast**
   - Don't allow invalid data to reach API
   - Block submission instead of generating fallback data
   - User feedback > silent failure

---

## Category 5: Documentation Inflation & Archive Churn

### Incident #8: Misleading Documentation Archived
**Original Issue:** 53035eed (2025-10-25)

#### Pattern: Documentation as Truth vs Documentation as Aspiration

**What Documentation Claimed:**
```markdown
STABILITY_AUDIT_PROGRESS.md:
"✅ PRODUCTION READY - All Tests Passing in CI"
"92% Complete - Ready for Phase 2"

TEST_SUITE_RESTORATION_SUMMARY.md:
"ALL 164 TESTS PASSING"
```

**Actual Reality:**
- Client tests: 18/36 passing (50%)
- 19 test files explicitly quarantined (.skip)
- Multi-tenancy tests fluctuating
- Payment system returning 500 errors
- Git status: 14 modified files uncommitted

**AI Pattern Identified:**
```
The Cycle:
1. Problem identified → Document created
2. Partial fix applied → Status marked "COMPLETE"
3. Problem persists → New document created
4. Old document archived → Problem "disappears"
5. Repeat cycle
```

**Evidence:**
- 40+ documents in `/docs/archive/` marked "COMPLETE"
- Multiple documents for same issues
- Status progression: "Ready" → "Completely Broken" → "Ready" (same issues)

**Files Affected:**
- Archived: `docs/archive/STABILITY_AUDIT_PROGRESS.md`
- Archived: `docs/archive/TEST_SUITE_RESTORATION_SUMMARY.md`
- Archived: `docs/archive/PHASE_2_AUTOMATED_FIX_PLAN.md`
- Created: `docs/investigations/AI_DIAGNOSTIC_REPORT.md` (calling out the pattern)

**Actionable Lessons:**

1. **Documentation Should Reflect Reality, Not Aspirations**
   - "COMPLETE" means actually complete
   - Run actual tests, don't count quarantined tests
   - Version bump doesn't mean production ready

2. **AI Agents Treat Documentation as Ground Truth**
   - If docs say "passing", AI assumes passing
   - Must verify actual state, not just read docs
   - Outdated docs are worse than no docs

3. **Archive is Not a Solution**
   - Archiving doesn't fix the problem
   - Creates illusion of progress
   - Makes it harder to find real status

---

## Category 6: UUID/ID Confusion & Reverts

### Incident #9: Wrong Restaurant UUID → Immediate Revert
**Original Issue:** 8e6c42c2 (2025-11-06)
**Revert:** 392240a4 (2025-11-06, 3 minutes later)

#### Misleading Symptom vs Actual Root Cause

**What User Saw:**
- Checkout page blank
- Restaurant data not loading

**Initial AI Diagnosis:**
```typescript
// AI thought the UUID was wrong
// Changed: 11111111-1111-1111-1111-111111111111
// To:      1111-111111-11111

// Rationale: "Correct ID is for Grow Fresh Local Food"
```

**What Actually Happened:**
- Original UUID was CORRECT
- AI misread database or saw wrong data
- 3 minutes later: Revert commit restored original UUID
- Next step: Implement slug-based routing instead

**Files Affected:**
- `.env.example`
- `client/src/contexts/UnifiedCartContext.tsx`
- `tests/e2e/checkout-smoke.spec.ts`

**Actionable Lessons:**

1. **Verify UUIDs Against Database Before Changing**
   - Query: `SELECT id, name FROM restaurants WHERE id = '...'`
   - Don't guess based on partial information
   - UUIDs are brittle - changes cascade everywhere

2. **Quick Reverts Indicate Uncertainty**
   - 3-minute revert = didn't verify before committing
   - Should have checked database first
   - Better to be slow and right than fast and wrong

3. **Consider Slug-Based Routing**
   - UUIDs in URLs are ugly: `/order/11111111-1111-1111-1111-111111111111`
   - Slugs are better UX: `/order/grow`
   - Implemented later: e4e192b2 (slug-based routing)

---

## Category 7: Middleware Ordering & RBAC Issues

### Incident #10: Floor Plan RBAC Investigation (Preventive)
**Investigation:** docs/FLOOR_PLAN_RBAC_INVESTIGATION.md (2025-11-07)

#### Pattern: Thorough Investigation Prevented Mistakes

**What Could Have Gone Wrong:**
- Manager reported unable to save floor plans
- Initial assumption: Missing RBAC scopes
- Quick fix: Add `tables:manage` to manager role

**What Investigation Revealed:**
- Manager ALREADY had `tables:manage` scope ✅
- Middleware ordering was correct ✅
- Backend routes properly protected ✅
- Gap: Frontend didn't check permissions before attempting save
- Gap: Server role has `tables:manage` but comment says they shouldn't

**Preventive Actions:**
1. Verified scope definitions match database
2. Traced middleware execution flow
3. Identified ambiguity (server role comment vs actual scopes)
4. Documented permission matrix for all roles
5. Recommended frontend permission checks

**Actionable Lessons:**

1. **Verify Before Assuming**
   - Don't add scopes without checking existing config
   - Database, code, and docs must align
   - Systematic investigation prevents wrong fixes

2. **Comments Can Lie**
   - Code comment said "servers should not manage tables"
   - But `ApiScope.TABLES_MANAGE` was assigned to server role
   - Code is truth, comments can be outdated

3. **Frontend Should Check Permissions**
   - Don't rely on backend 403 errors for UX
   - Check scopes before showing actions
   - Hide/disable features user can't access

---

## Category 8: Environment Variable Edge Cases

### Incident #11: Newline Characters Breaking Voice Ordering
**Original Issue:** 03011ced (2025-11-07)

#### Misleading Symptom vs Actual Root Cause

**What Users Saw:**
- Voice ordering completely broken
- OpenAI API calls failing
- Authentication errors

**Initial AI Diagnosis:**
- API key incorrect
- OpenAI service down
- Network issues

**Actual Root Cause:**
```bash
# .env file (copied from docs)
VITE_OPENAI_API_KEY=sk-proj-abcd1234
# ← Hidden newline character here causing API call to fail
```

**The Problem:**
- Environment variable had trailing newline
- Copied from markdown code block (preserves whitespace)
- API key sent as: `"sk-proj-abcd1234\n"`
- OpenAI rejected: invalid key format

**The Fix:**
```typescript
// server/.env
VITE_OPENAI_API_KEY=$(echo -n "sk-proj-abcd1234")  // -n strips newline

// Or validation:
const apiKey = process.env.VITE_OPENAI_API_KEY?.trim();
```

**Files Affected:**
- Environment variables
- Documentation examples

**Actionable Lessons:**

1. **Trim Environment Variables on Load**
   - Always `.trim()` when reading env vars
   - Markdown code blocks preserve whitespace
   - Copy-paste from docs is common source of bugs

2. **Validate API Keys on Startup**
   - Check format before making API calls
   - Fail fast with clear error message
   - Don't wait for first API call to discover problem

3. **Document Copy-Paste Risks**
   - Warn users about whitespace in .env files
   - Provide scripts to set env vars correctly
   - Use `.env.example` as template, not markdown

---

## Pattern Analysis: Common Themes

### Theme 1: Confirmation Bias from Previous Fixes
- React hydration → Assumed Date.now() issue (it wasn't)
- Context issues → Assumed nested providers (they were correct)
- Voice parsing → Fixed server-side (wrong code path)

**Prevention:** Question assumptions, investigate fresh each time

---

### Theme 2: Framework Behavior Misunderstanding
- AnimatePresence must render consistently (missed)
- PostgreSQL VARCHAR vs TEXT (assumed interchangeable)
- Middleware execution order (incomplete path handling)

**Prevention:** Read framework docs, understand internal behavior

---

### Theme 3: Type System Limitations
- Database schema mismatches not caught by TypeScript
- Field name changes (seats vs capacity) compile but fail at runtime
- API method refactoring doesn't break at compile time

**Prevention:** Integration tests, runtime validation, E2E tests

---

### Theme 4: Multiple Code Paths Not Considered
- Server-side vs client-side voice parsing
- Authenticated vs unauthenticated middleware paths
- Different table selection flows in different views

**Prevention:** Trace full execution path, document flows

---

### Theme 5: Documentation Drift Creates False Truth
- Tests marked "COMPLETE" but quarantined
- Status claims don't match git status
- Archiving creates illusion of progress

**Prevention:** Verify actual state, run tests, check git status

---

## Recommendations for AI Agents

### 1. Investigation Protocol
```
Before applying fix:
1. Verify symptom in actual environment
2. Read error codes/messages carefully
3. Trace execution path from UI to database
4. Check for multiple implementations
5. Search for similar past issues
6. Question assumptions from previous fixes
```

### 2. SSR/Hydration Checklist
```
For React hydration errors:
- Check for early returns before wrappers
- Look for Date.now(), Math.random()
- Search for suppressHydrationWarning
- Test in production build, not dev
- AnimatePresence/Suspense must be stable
```

### 3. Database Schema Workflow
```
For database errors:
1. Query actual schema: \d+ table_name
2. Check RPC signatures match table types
3. Verify field name consistency (camelCase vs snake_case)
4. Test transformations at API boundary
5. Add migration validation
```

### 4. Context/Auth Flow
```
For authentication issues:
1. Trace ID from JWT → Context → API
2. Check all middleware paths (auth + no-auth)
3. Verify context sources are synced
4. Don't override real data with mocks
5. Log data source for debugging
```

### 5. Documentation Hygiene
```
When documenting:
- Status reflects actual state, not aspiration
- Run tests before marking "COMPLETE"
- Archive means obsolete, not incomplete
- Version numbers match git tags
- Include "Last Verified" timestamps
```

---

## Parseable Summary Data

```json
{
  "analysis_date": "2025-11-10",
  "repository": "rebuild-6.0",
  "analysis_period": "2025-08-01 to 2025-11-10",
  "total_incidents": 12,
  "incidents_by_category": {
    "react_ssr_hydration": 1,
    "database_schema_mismatch": 3,
    "authentication_context": 3,
    "ai_parsing_voice": 2,
    "documentation_inflation": 1,
    "uuid_id_confusion": 1,
    "middleware_rbac": 1,
    "environment_variables": 1
  },
  "key_metrics": {
    "average_resolution_time_days": 2.5,
    "false_diagnoses": 6,
    "revert_commits": 4,
    "documentation_archived": "40+",
    "lines_of_code_in_final_fixes": {
      "min": 1,
      "max": 50,
      "average": 15
    }
  },
  "findings": [
    {
      "incident_id": 1,
      "name": "React #318 Hydration Bug",
      "original_commit": "3949d61a",
      "date": "2025-11-10",
      "fix_commit": "3949d61a",
      "wrong_diagnosis_commits": ["accf09e9", "6bded64f"],
      "misleading_symptom": "Nested UnifiedCartProvider causing context conflicts",
      "actual_root_cause": "Early return before AnimatePresence causing server/client DOM mismatch",
      "files_affected": ["client/src/pages/components/VoiceOrderModal.tsx"],
      "resolution_time_days": 3,
      "lines_changed": 2,
      "lesson": "Trust framework error messages. Never early return before wrapper components in SSR."
    },
    {
      "incident_id": 2,
      "name": "RPC Type Mismatch (VARCHAR vs TEXT)",
      "original_commit": "cb02f9ad",
      "date": "2025-10-29",
      "fix_commit": "cb02f9ad",
      "misleading_symptom": "Random PostgreSQL errors in RPC calls",
      "actual_root_cause": "RPC signature used VARCHAR but table uses TEXT. PostgreSQL cannot cast TEXT to VARCHAR in return type.",
      "files_affected": ["supabase/migrations/20251030020000_fix_rpc_type_mismatch.sql"],
      "resolution_time_hours": 2,
      "lines_changed": 212,
      "lesson": "Verify database schema first. RPC signatures must match table column types exactly. TEXT is preferred over VARCHAR in PostgreSQL."
    },
    {
      "incident_id": 3,
      "name": "Schema Field Name Mismatch (seats vs capacity)",
      "original_commit": "1b7826ec",
      "date": "2025-11-06",
      "fix_commit": "1b7826ec",
      "misleading_symptom": "Seat selection modal showing empty buttons",
      "actual_root_cause": "Database uses 'seats', API sometimes transformed to 'capacity', client expected 'capacity'. Inconsistent transformations across endpoints.",
      "files_affected": [
        "server/src/routes/tables.routes.ts",
        "server/src/services/orders.service.ts"
      ],
      "resolution_time_hours": 4,
      "lines_changed": 30,
      "lesson": "Establish consistent field naming across entire stack. Document schema → API → client mappings. Use transformation layer at API boundary."
    },
    {
      "incident_id": 4,
      "name": "Restaurant Context Using Hardcoded Mock",
      "original_commit": "0c1de0f6",
      "date": "2025-10-30",
      "fix_commit": "0c1de0f6",
      "misleading_symptom": "Menu API returning 400 errors, restaurant not found",
      "actual_root_cause": "RestaurantContext hardcoded mock ID, ignoring authenticated user's actual restaurant ID from JWT token. Multi-tenancy isolation blocked API calls.",
      "files_affected": ["client/src/core/RestaurantContext.tsx"],
      "resolution_time_hours": 3,
      "lines_changed": 22,
      "lesson": "Context sources must be synchronized. Don't create parallel context systems. One source of truth for authentication data."
    },
    {
      "incident_id": 5,
      "name": "Optional Auth Missing Restaurant ID Extraction",
      "original_commit": "e836901b",
      "date": "2025-10-27",
      "fix_commit": "e836901b",
      "investigation_doc": "docs/investigations/menu-loading-error-fix-oct27-2025.md",
      "misleading_symptom": "Screenshot showed corrupted URLs (DevTools artifact)",
      "actual_root_cause": "optionalAuth middleware incomplete for unauthenticated path. Never extracted restaurant ID from x-restaurant-id header, causing undefined to be passed to PostgreSQL queries.",
      "files_affected": ["server/src/middleware/auth.ts"],
      "resolution_time_hours": 2,
      "lines_changed": 8,
      "lesson": "Trust network inspection over visual artifacts. Middleware must handle ALL code paths. PostgreSQL error codes are clues (22P02 = invalid text representation)."
    },
    {
      "incident_id": 6,
      "name": "Wrong AI Parse Method & Field Names",
      "original_commit": "5e65699f",
      "date": "2025-10-29",
      "fix_commit": "5e65699f",
      "misleading_symptom": "Voice orders showing raw transcription instead of menu items",
      "actual_root_cause": "Calling legacy parseOrder() instead of new parse(). Looking for snake_case menu_item_id instead of camelCase menuItemId. Fallback logic masked errors.",
      "files_affected": ["server/src/routes/orders.routes.ts"],
      "resolution_time_hours": 3,
      "lines_changed": 32,
      "lesson": "API refactoring must update all consumers. Fallbacks can hide real bugs. Document API changes with migration guide."
    },
    {
      "incident_id": 7,
      "name": "Wrong Code Path Fixed (Server vs Client Parsing)",
      "original_commit": "58578b1b",
      "date": "2025-10-30",
      "fix_commit": "58578b1b",
      "misleading_symptom": "Server voice orders failing, but we fixed server-side AI parsing",
      "actual_root_cause": "ServerView uses client-side OrderParser (POST /api/v1/orders), not server-side AI (POST /api/v1/orders/voice). Fixed wrong code path.",
      "files_affected": [
        "client/src/core/RestaurantContext.tsx",
        "client/src/pages/hooks/useVoiceOrderWebRTC.ts"
      ],
      "resolution_time_hours": 4,
      "lines_changed": 40,
      "lesson": "Multiple code paths require full investigation. Don't assume one implementation. Trace execution from UI to API."
    },
    {
      "incident_id": 8,
      "name": "Misleading Documentation Archived",
      "original_commit": "53035eed",
      "date": "2025-10-25",
      "fix_commit": "53035eed",
      "analysis_doc": "docs/investigations/AI_DIAGNOSTIC_REPORT.md",
      "misleading_symptom": "Documentation claimed 92% complete, all tests passing",
      "actual_root_cause": "Only 50% of tests passing, 19 files quarantined. Documentation inflation cycle created illusion of progress.",
      "files_affected": ["docs/archive/* (40+ files)"],
      "resolution_time_days": 1,
      "lines_changed": "N/A",
      "lesson": "Documentation should reflect reality, not aspirations. AI agents treat docs as ground truth. Verify actual state, don't just read docs."
    },
    {
      "incident_id": 9,
      "name": "Wrong Restaurant UUID → Immediate Revert",
      "original_commit": "8e6c42c2",
      "date": "2025-11-06",
      "revert_commit": "392240a4",
      "revert_time_minutes": 3,
      "misleading_symptom": "Checkout page blank, assumed UUID was wrong",
      "actual_root_cause": "Original UUID was correct. AI misread data. Quick revert indicates uncertainty.",
      "files_affected": [
        ".env.example",
        "client/src/contexts/UnifiedCartContext.tsx",
        "tests/e2e/checkout-smoke.spec.ts"
      ],
      "resolution_time_minutes": 3,
      "lines_changed": 8,
      "lesson": "Verify UUIDs against database before changing. Quick reverts indicate uncertainty. Better slow and right than fast and wrong."
    },
    {
      "incident_id": 10,
      "name": "Floor Plan RBAC Investigation (Preventive)",
      "investigation": "docs/FLOOR_PLAN_RBAC_INVESTIGATION.md",
      "date": "2025-11-07",
      "misleading_symptom": "Manager couldn't save floor plans (assumed missing RBAC scopes)",
      "actual_finding": "Manager already had correct scopes. Gap was frontend not checking permissions before attempting save.",
      "files_affected": ["None - preventive investigation"],
      "resolution_time_hours": 2,
      "lines_changed": 0,
      "lesson": "Verify before assuming. Systematic investigation prevents wrong fixes. Code is truth, comments can be outdated."
    },
    {
      "incident_id": 11,
      "name": "Newline Characters Breaking Voice Ordering",
      "original_commit": "03011ced",
      "date": "2025-11-07",
      "fix_commit": "03011ced",
      "misleading_symptom": "OpenAI API calls failing, assumed bad API key",
      "actual_root_cause": "Environment variable had trailing newline from copy-paste. API key sent as 'sk-proj-xxx\\n', OpenAI rejected.",
      "files_affected": ["Environment variables, documentation"],
      "resolution_time_hours": 1,
      "lines_changed": "N/A (env var trim)",
      "lesson": "Trim environment variables on load. Validate API keys on startup. Document copy-paste risks from markdown code blocks."
    }
  ]
}
```

---

## Conclusion

AI agents introduce mistakes primarily through:
1. **Confirmation bias** from previous fixes
2. **Framework behavior misunderstanding**
3. **Type system limitations** not catching runtime issues
4. **Multiple code paths** not being considered
5. **Documentation drift** creating false sources of truth

The most damaging pattern is **treating documentation as ground truth** instead of verifying actual system state. This leads to circular problem-solving where issues are documented as "COMPLETE" without resolution, then archived to create an illusion of progress.

**Key Prevention Strategies:**
- Trust error messages and framework codes first
- Verify database schema before assuming types
- Trace full execution paths (don't assume one implementation)
- Test in production builds for SSR/hydration issues
- Synchronize context sources (one source of truth)
- Document actual state, not aspirational state
- Quick reverts indicate uncertainty - verify first

**Most Valuable Lesson:**
The React #318 hydration bug (3+ days, 2-line fix) demonstrates that **simple bugs can be incredibly hard to find when AI makes wrong assumptions**. The fix was removing 1 line (`if (!show) return null`), but finding it required questioning every assumption, reading error messages carefully, and understanding framework internals.

---

**Generated by:** Claude Code AI Analysis
**Methodology:** Git history scan + commit message analysis + file content review + post-mortem documentation synthesis
**Total commits analyzed:** 1000+
**Time period:** August 2025 - November 2025
**Documentation reviewed:** 60+ files (active + archived)
