# Claude AI Guidelines for This Codebase

**Purpose:** Optimized guidance for AI coding assistants (especially Claude) working on this project.
**Last Updated:** 2025-11-10
**Based on:** 20 major incidents, $50,000+ in preventable costs, 15-20 days of debugging time

---

## Philosophy

> "The fix was simple. Finding it was hard. Learning from it is invaluable."

These guidelines exist to help AI assistants avoid the mistakes that cost this project weeks of debugging time. Every rule below is based on a real incident that occurred in this codebase.

---

## Critical Rules (NEVER Violate These)

### 1. Always Check Architecture Decision Records (ADRs) First

```bash
# Before making architectural changes:
ls docs/explanation/architecture/ADR-*
```

**Key ADRs:**
- **ADR-001:** snake_case naming for ALL API responses (never camelCase)
- **ADR-006:** Dual authentication pattern (normal + PIN/demo users)
  - Demo users use string IDs like `"demo:server:xyz"`, NOT UUIDs
  - Both auth paths must coexist - this is intentional, not duplicate code

**Why This Matters:**
- Removing "duplicate" auth code broke critical flows (ADR-006)
- Adding camelCase transform violated ADR-001, created inconsistency
- **Cost:** Days of rework when changes conflict with established patterns

---

### 2. NEVER Early Return Before SSR Wrappers

```typescript
// ❌ NEVER DO THIS
if (!show) return null
return <AnimatePresence>...</AnimatePresence>

// ✅ ALWAYS DO THIS
return (
  <AnimatePresence>
    {show && ...}
  </AnimatePresence>
)
```

**Affected Components:**
- `AnimatePresence` (Framer Motion)
- `Suspense` (React)
- Any wrapper that must render consistently on server and client

**Why This Matters:**
- React Error #318: "Hydration failed"
- **Cost:** 3 days debugging, voice and touch ordering completely broken

**Related Lesson:** [react-hydration-early-return-bug.md](./react-hydration-early-return-bug.md)

---

### 3. Always Update RPC Functions When Tables Change

```bash
# When modifying a database table:

# 1. Find all RPC functions that touch it
SELECT routine_name
FROM information_schema.routines
WHERE routine_definition LIKE '%table_name%';

# 2. Update EACH RPC function signature
# 3. Update all application code calling the RPCs
# 4. Test with actual database (not mocks)
```

**Why This Matters:**
- Most recurring issue (3+ incidents)
- Added column to table but not RPC → 500 errors on order creation
- **Cost:** 3+ days across multiple incidents

**Related Lesson:** [database-schema-mismatches.md](./database-schema-mismatches.md)

---

### 4. Validate Multi-Tenant Middleware on ALL Protected Routes

```typescript
// ✅ Every protected endpoint needs BOTH:
router.use('/api/protected',
  authenticate,              // 1. Verify user identity
  validateRestaurantAccess,  // 2. Verify tenant access
  controller
)
```

**Why This Matters:**
- Missing middleware on ONE endpoint broke entire feature
- Users could log in but got "Access Denied" for everything
- **Cost:** 2-3 days, P0 production blocker

**Related Lesson:** [auth-multi-tenancy-security.md](./auth-multi-tenancy-security.md)

---

### 5. NEVER Expose Secrets with VITE_ Prefix

```bash
# ❌ NEVER
VITE_OPENAI_API_KEY=sk-proj-secret  # PUBLIC in browser bundle!

# ✅ ALWAYS
OPENAI_API_KEY=sk-proj-secret  # Server-side only
VITE_API_BASE_URL=https://api.example.com  # OK to expose
```

**Why This Matters:**
- VITE_ prefix makes values PUBLIC in browser
- API keys exposed to anyone viewing source
- **Cost:** Serious security hole, potentially costly

**Related Lesson:** [configuration-environment-errors.md](./configuration-environment-errors.md)

---

## Workflow Guidelines

### When Adding New Features

**1. Search for Existing Implementations First**

```bash
# Before creating new code:
git grep "functionName"
git grep "route/path"
git grep "similar-feature"
```

**Why:** Prevents duplicate implementations (15 duplicate files found in audit)

---

**2. Check ADRs for Relevant Patterns**

```bash
cat docs/explanation/architecture/ADR-*.md | grep -i "keyword"
```

**Key Questions:**
- Does this involve auth? → Check ADR-006 (dual auth pattern)
- Does this involve API responses? → Check ADR-001 (snake_case)
- Does this involve user IDs? → Remember demo users use strings, not UUIDs

---

**3. Consider Demo Users in Schema Design**

```sql
-- ❌ WRONG - Breaks demo users
user_id UUID NOT NULL REFERENCES users(id)

-- ✅ CORRECT - Supports both demo and regular users
user_id UUID REFERENCES users(id)  -- Nullable
demo_user_info JSONB  -- Store demo user metadata
```

**Why:** Demo users use string IDs, not UUIDs → UUID constraints break checkout

---

**4. Write Tests for Critical Paths**

Required test coverage:
- Auth flows: 100%
- Payment processing: 100%
- Order creation: 100%
- Business logic: 90%+
- Overall: 80%+

---

### When Debugging Issues

**1. Read Error Messages FIRST (Don't Assume)**

```markdown
# Debugging Process:
1. [ ] Read the actual error message
2. [ ] Check logs (server, client, database)
3. [ ] Gather evidence (console, network tab, database queries)
4. [ ] Form hypothesis based on evidence
5. [ ] Make minimal change
6. [ ] Verify in production build
7. [ ] Add regression test
```

**Why:** Wasted 3 days ignoring React #318 error that told us exactly what was wrong

---

**2. Test in Production Mode**

```bash
# Many issues only appear in production builds
npm run build && npm run start
# NOT just npm run dev
```

**Why:** Dev mode hides SSR/hydration errors, module issues, etc.

---

**3. Don't Make Broad Changes Without Evidence**

**Examples of Wrong Approach:**
- "Maybe it's caching" → Clear all caches (didn't help)
- "Maybe it's the provider" → Remove UnifiedCartProvider (didn't help, had to revert)
- "Maybe it's Date.now()" → Replace all timestamps (didn't help)

**Correct Approach:**
- Read the error message
- Add logging to gather evidence
- Form hypothesis based on evidence
- Test hypothesis with minimal change

---

### When Modifying Database Schema

**Checklist:**
```markdown
- [ ] Identify ALL tables affected
- [ ] Find ALL RPC functions touching those tables
- [ ] Update RPC function signatures to match
- [ ] Update ALL application code calling RPCs
- [ ] Check for demo user compatibility (nullable user_id)
- [ ] Update TypeScript types if using codegen
- [ ] Add migration to version control
- [ ] Test with actual database (not mocks)
- [ ] Deploy migration BEFORE code changes
- [ ] Verify in production after deployment
- [ ] Add regression test
```

**Type Standards:**
```sql
-- ✅ Preferred
TEXT          -- Not VARCHAR(n)
TIMESTAMPTZ   -- Not TIMESTAMP
JSONB         -- Not JSON
UUID          -- For real user IDs
```

---

### When Working with Environment Variables

**1. Always Sanitize**

```typescript
// ✅ ALWAYS
const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/\\n/g, '\n')

// Validate format
if (!/^sk-[A-Za-z0-9-_]+$/.test(apiKey)) {
  throw new Error('Invalid API key format')
}
```

**Why:** Render CLI added literal `\n` breaking API keys → voice ordering failed silently

---

**2. Add Startup Validation**

```typescript
// Validate critical configs on startup
export async function validateSquareConfig() {
  const locationId = process.env.SQUARE_LOCATION_ID

  // Call external API to verify
  const validIds = await squareClient.locations.listLocations()

  if (!validIds.includes(locationId)) {
    console.error('Valid IDs:', validIds)
    throw new Error(`Invalid location ID: ${locationId}`)
  }
}
```

**Why:** One-character typo (L3 vs L1) broke all payments → took hours to find

---

## Code Quality Standards

### Component Complexity

**Limits:**
- Components: < 200 lines
- Functions: < 50 lines
- Parameters: < 4
- Nested depth: < 3

**When Exceeded:**
- Extract hooks for reusable logic
- Separate UI modes into different components
- Break into smaller focused components

**Why:** 515-line VoiceOrderModal hid 1-line hydration bug for 3 days

---

### No Duplicate Code

**Before Creating New Code:**

```bash
# Search for existing implementations
git grep "similar-pattern"
npx jscpd src/  # Detect duplicates
```

**Why:** 15 duplicate files found (duplicate table routes, etc.) → inconsistent behavior

---

### Documentation Organization

**Structure:**
```
docs/
├── tutorials/        # Learning-oriented
├── how-to/           # Problem-oriented
├── reference/        # Information-oriented
└── explanation/      # Understanding-oriented
    └── architecture/ # ADRs here

# NOT in main docs:
docs/postmortems/     # Investigation reports (AFTER resolution)
```

**Why:** 89,387 lines of unorganized docs → 79 hours wasted ($7,900)

---

## Common Pitfalls to Avoid

### ❌ Don't Do This

1. **Early return before AnimatePresence/Suspense**
   - Causes React #318 hydration errors
   - Always render wrapper, conditionally render contents

2. **Add columns without updating RPCs**
   - Causes 500 errors on order creation
   - Most recurring issue (3+ incidents)

3. **Skip middleware on "just one" endpoint**
   - Breaks multi-tenant security
   - Can cause P0 production blockers

4. **Put API keys in client .env with VITE_ prefix**
   - Exposes secrets publicly
   - Serious security vulnerability

5. **Make UUID columns NOT NULL without considering demo users**
   - Breaks demo checkout completely
   - Demo users use string IDs, not UUIDs

6. **Deploy code without production build test**
   - Hides SSR/hydration issues
   - Many bugs only appear in production mode

7. **Skip tests for "small changes"**
   - Missing middleware not caught until production
   - 100% coverage required for auth, payments, orders

8. **Ignore error messages and debug by assumption**
   - Wasted 3 days on wrong hypotheses
   - React #318 told us exactly what was wrong

9. **Remove "duplicate" code without checking ADRs**
   - ADR-006 dual auth is intentional
   - Removing it breaks critical flows

10. **Create large components (> 200 lines)**
    - Bugs hide in complexity
    - 515-line component hid 1-line bug for 3 days

---

## Quick Decision Tree

### "Should I create a new file/component?"

```
1. Does this already exist?
   └─ No → Continue
   └─ Yes → Use existing, don't duplicate

2. Is this > 200 lines?
   └─ No → OK to create
   └─ Yes → Break into smaller pieces first

3. Does it follow ADRs?
   └─ Yes → OK to create
   └─ No → Update ADR project-wide, or follow ADR

4. Is it tested?
   └─ Yes → OK to create
   └─ No → Add tests first
```

### "Should I make this database change?"

```
1. Did I find ALL affected RPC functions?
   └─ No → Find them first
   └─ Yes → Continue

2. Did I update ALL RPC signatures?
   └─ No → Update them
   └─ Yes → Continue

3. Does it support demo users?
   └─ No → Make user_id nullable
   └─ Yes → Continue

4. Did I test with actual database?
   └─ No → Test with real DB
   └─ Yes → OK to proceed
```

### "Should I skip this test?"

```
1. Is there a regression test?
   └─ No → Add test, don't skip
   └─ Yes, but it's failing → Continue

2. Did I add it to test-health.json?
   └─ No → Add to quarantine system
   └─ Yes → Continue

3. Is pass rate > 85%?
   └─ No → FIX NOW, don't skip more
   └─ Yes → OK to quarantine temporarily

4. Did I assign owner and estimate?
   └─ No → Assign and estimate
   └─ Yes → OK to skip temporarily
```

---

## Error Message Patterns

**When you see these errors, check these lessons:**

| Error | Check This Lesson |
|-------|-------------------|
| React #318: "Hydration failed" | [react-hydration-early-return-bug.md](./react-hydration-early-return-bug.md) |
| "invalid input syntax for type uuid" | [database-schema-mismatches.md](./database-schema-mismatches.md) |
| "Access Denied" after login | [auth-multi-tenancy-security.md](./auth-multi-tenancy-security.md) |
| "Restaurant ID required" | [auth-multi-tenancy-security.md](./auth-multi-tenancy-security.md) |
| 500 error on order creation | [database-schema-mismatches.md](./database-schema-mismatches.md) |
| "Location not found" (Square) | [configuration-environment-errors.md](./configuration-environment-errors.md) |
| "Origin not allowed" (CORS) | [configuration-environment-errors.md](./configuration-environment-errors.md) |
| Voice ordering silent failure | [configuration-environment-errors.md](./configuration-environment-errors.md) |

---

## Before Proposing Changes

**Checklist for AI Assistants:**

```markdown
- [ ] Searched for existing implementations
- [ ] Checked relevant ADRs
- [ ] Considered demo user compatibility
- [ ] Planned tests for critical paths
- [ ] Verified no secrets will be exposed
- [ ] Checked for RPC updates if schema changes
- [ ] Ensured middleware on all protected routes
- [ ] No early returns before SSR wrappers
- [ ] Production build testing planned
- [ ] Component complexity < 200 lines
- [ ] Evidence-based approach (not assumptions)
```

---

## Communication Style

**When suggesting fixes:**

1. **Cite the error message**
   - "React #318 indicates hydration mismatch"
   - Not: "There might be a rendering issue"

2. **Reference lessons learned**
   - "This matches the pattern in react-hydration-early-return-bug.md"
   - "According to ADR-006, demo users use string IDs"

3. **Explain the evidence**
   - "The logs show the server rendered null while the client rendered AnimatePresence"
   - Not: "I think maybe it's the wrapper"

4. **Propose minimal changes**
   - "Move the conditional inside AnimatePresence (2 lines changed)"
   - Not: "Let's refactor the entire component"

5. **Include verification steps**
   - "Test with: npm run build && npm run start"
   - "Verify React #318 no longer appears in console"

---

## Success Metrics

**How to know you're doing well:**

- ✅ No ADR violations
- ✅ All protected endpoints have both authenticate + validateRestaurantAccess
- ✅ No React #318 hydration errors
- ✅ RPC functions updated when tables change
- ✅ Demo users work (checkout, payments, orders)
- ✅ No secrets exposed with VITE_ prefix
- ✅ Test coverage > 80% (100% for critical paths)
- ✅ Components < 200 lines
- ✅ No duplicate implementations
- ✅ Production build tested before deployment

---

## Resources

**Primary Lessons:**
- [react-hydration-early-return-bug.md](./react-hydration-early-return-bug.md)
- [auth-multi-tenancy-security.md](./auth-multi-tenancy-security.md)
- [database-schema-mismatches.md](./database-schema-mismatches.md)
- [configuration-environment-errors.md](./configuration-environment-errors.md)
- [code-complexity-debt.md](./code-complexity-debt.md)
- [testing-debugging-strategies.md](./testing-debugging-strategies.md)

**Reference:**
- [git-history-lessons.json](./git-history-lessons.json) - 20 major incidents analyzed
- [LESSONS_SUMMARY.md](./LESSONS_SUMMARY.md) - Comprehensive analysis

**ADRs:**
- ADR-001: snake_case API convention
- ADR-006: Dual authentication pattern

---

## TL;DR for AI Assistants

**Top 10 Rules:**

1. Check ADRs first (ADR-001 snake_case, ADR-006 dual auth)
2. Never early return before AnimatePresence/Suspense
3. Always update RPC functions when tables change
4. Both authenticate + validateRestaurantAccess on protected routes
5. Never VITE_ prefix for secrets
6. Support demo users (string IDs, nullable user_id)
7. Read error messages first, gather evidence
8. Test in production mode (npm run build)
9. Components < 200 lines
10. 100% coverage for auth/payments/orders

**Remember:** Every rule is based on real incidents that cost days of debugging. Following these guidelines prevents repeated mistakes.

---

**Last Updated:** 2025-11-10
**Based on:** 1,648 commits analyzed, 20 major incidents, $50,000+ preventable costs
