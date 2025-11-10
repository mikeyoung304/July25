# Lesson: Code Complexity & Technical Debt Patterns

**Date:** 2025-11-10
**Severity:** MEDIUM to HIGH
**Time to Find:** Varies (hours to days)
**Cost Impact:** $38,800+ in accumulated waste

---

## The Bug Patterns

### 1. God Objects - Large Components

```typescript
// ❌ WRONG - 515-line component doing everything
// VoiceOrderModal.tsx - 515 lines
export function VoiceOrderModal({
  show, table, seat, onClose
}) {
  // 50 lines of state
  const [voiceMode, setVoiceMode] = useState(false)
  const [touchMode, setTouchMode] = useState(false)
  const [recording, setRecording] = useState(false)
  // ... 20 more state variables

  // 100 lines of effects
  useEffect(() => { /* voice logic */ }, [])
  useEffect(() => { /* touch logic */ }, [])
  useEffect(() => { /* cart sync */ }, [])
  // ... 10 more effects

  // 200 lines of handlers
  const handleVoiceStart = () => { /* complex logic */ }
  const handleTouchInput = () => { /* complex logic */ }
  const handleSubmit = () => { /* complex logic */ }
  // ... 15 more handlers

  // 100 lines of rendering logic
  if (!show || !table || !seat) return null  // BUG HID HERE
  return (
    <AnimatePresence>
      {/* 50 lines of nested modals */}
      {voiceMode && <VoiceUI />}
      {touchMode && <TouchUI />}
      {/* ... more conditional rendering */}
    </AnimatePresence>
  )
}
```

**Why It Breaks:**
- 515 lines - easy to overlook single-line bugs
- Multiple concerns mixed together (voice, touch, cart)
- Hard to test individual features
- **The hydration bug (React #318) hid in this file for 3 days**

---

### 2. Duplicate Code & Drift

```typescript
// ❌ WRONG - Two implementations of the same feature
// server/src/routes/tables-v1.ts
router.post('/tables', async (req, res) => {
  // Implementation A
})

// server/src/routes/tables-v2.ts
router.post('/tables', async (req, res) => {
  // Implementation B (slightly different)
})

// Both routes active, sometimes using A, sometimes B
// Bug fixes applied to one but not the other
```

**Why It Breaks:**
- Inconsistent behavior depending on which route is called
- Bug fixes miss one implementation
- Double maintenance burden
- Confusion about which is canonical

---

### 3. Ignoring Architecture Decision Records (ADRs)

```typescript
// ❌ WRONG - Violates ADR-001 (snake_case convention)
// Some middleware transforms responses
export function transformMiddleware(req, res, next) {
  const originalJson = res.json
  res.json = (data) => {
    // Convert to camelCase
    return originalJson(toCamelCase(data))
  }
  next()
}

// But ADR-001 says ALL API responses use snake_case
// Now we have mixed conventions and extra conversion logic
```

**Why It Breaks:**
- Conflicts with established patterns
- Extra transformation logic needed
- Inconsistency across API
- Future developers confused by mixed conventions

---

### 4. Premature or Misguided Fixes

```typescript
// ❌ WRONG - Removing code without understanding why it exists
// commit accf09e9 - During hydration bug investigation
- import { UnifiedCartProvider } from './contexts/UnifiedCartContext'

function App() {
  return (
-   <UnifiedCartProvider>
      <Router />
-   </UnifiedCartProvider>
  )
}

// This DIDN'T fix the hydration bug
// Had to be reverted, wasting time
// Real bug was early return before AnimatePresence
```

**Why It Breaks:**
- Changed code without evidence it was the problem
- Removed necessary provider based on assumption
- Had to back out the change
- Actual bug remained unfixed

---

### 5. Documentation Bloat

```bash
# ❌ WRONG - 89,387 lines of docs, much unorganized
docs/
├── investigation-2024-09-15-auth-issue.md (12,000 lines)
├── investigation-2024-09-22-payment-debug.md (8,500 lines)
├── investigation-2024-10-01-voice-ordering.md (15,000 lines)
├── random-notes.md (3,200 lines)
├── ai-generated-api-docs.md (25,000 lines)
├── more-investigation-files... (25,687 lines)
└── ... 50+ more files

# Total: 89,387 lines
# Useful docs: ~10% (9,000 lines)
# Cost: 79 hours @ $100/hr = $7,900 of wasted effort
```

**Why It Breaks:**
- Can't find useful information in the noise
- AI-generated docs without human curation
- Investigation reports should be in postmortems, not main docs
- No organization or taxonomy

---

## The Fixes

### 1. Break Up Large Components

```typescript
// ✅ CORRECT - Focused, single-responsibility components
// VoiceOrderModal.tsx - 80 lines
export function VoiceOrderModal({ show, table, seat, onClose }) {
  const mode = useOrderMode()  // Custom hook

  return (
    <AnimatePresence>
      {show && table && seat && (
        <OrderModalContainer onClose={onClose}>
          {mode === 'voice' && <VoiceOrderUI table={table} seat={seat} />}
          {mode === 'touch' && <TouchOrderUI table={table} seat={seat} />}
        </OrderModalContainer>
      )}
    </AnimatePresence>
  )
}

// VoiceOrderUI.tsx - 120 lines (focused on voice only)
export function VoiceOrderUI({ table, seat }) {
  const { startRecording, stopRecording, transcript } = useVoiceRecognition()
  const { addToCart } = useCart()
  // Voice-specific logic only
}

// TouchOrderUI.tsx - 100 lines (focused on touch only)
export function TouchOrderUI({ table, seat }) {
  const { items, addItem } = useMenuItems()
  const { addToCart } = useCart()
  // Touch-specific logic only
}

// hooks/useOrderMode.ts - 40 lines
export function useOrderMode() {
  // Mode selection logic extracted to reusable hook
}
```

**Benefits:**
- Each component has single responsibility
- Easier to test in isolation
- Bugs don't hide in massive files
- Clear separation of concerns

---

### 2. Eliminate Duplicate Code

```typescript
// ✅ CORRECT - Single implementation
// server/src/routes/tables.ts
import { tableController } from '../controllers/tables'

router.post('/tables', tableController.create)
router.get('/tables', tableController.list)
router.put('/tables/:id', tableController.update)
router.delete('/tables/:id', tableController.delete)

// Delete tables-v2.ts entirely
// Use git to preserve history if needed
```

**Before deleting, verify:**
```bash
# Find all imports of the duplicate
git grep "tables-v2" --exclude-dir=node_modules

# Should return zero results
# If not, migrate consumers first
```

---

### 3. Follow ADRs or Update Them

```typescript
// ✅ CORRECT - Follow ADR-001 (snake_case)
// All API responses use snake_case consistently
app.get('/api/user', (req, res) => {
  res.json({
    user_id: user.id,
    first_name: user.firstName,
    created_at: user.createdAt,
    restaurant_id: user.restaurantId
  })
})

// No transformation middleware needed
// Consistent across entire API
```

**If you must diverge from an ADR:**
1. Document WHY in the code
2. Update the ADR or create a new one
3. Apply the change project-wide, not piecemeal
4. Discuss with team before merging

---

### 4. Evidence-Based Debugging

```typescript
// ✅ CORRECT - Form hypothesis, gather evidence, then fix
// 1. Form hypothesis
// "Maybe UnifiedCartProvider causes hydration issue"

// 2. Gather evidence
console.log('Server render:', typeof window)  // undefined
console.log('Client render:', typeof window)  // object

// Check error message
// React #318: "Hydration failed because initial UI does not match"

// Look for DOM structure mismatches
// Server: null (early return)
// Client: <AnimatePresence><div>...</div></AnimatePresence>

// 3. Evidence points to early return, NOT UnifiedCartProvider

// 4. Fix the actual issue
- if (!show || !table || !seat) return null
return (
  <AnimatePresence>
-   {show && <Content />}
+   {show && table && seat && <Content />}
  </AnimatePresence>
)
```

**Process:**
1. Read error message carefully
2. Form hypothesis
3. Gather evidence (logs, tests, minimal reproduction)
4. Let evidence guide the fix
5. Don't make changes without evidence

---

### 5. Organize Documentation

```bash
# ✅ CORRECT - Diátaxis framework structure
docs/
├── README.md
├── tutorials/              # Learning-oriented
│   └── getting-started.md
├── how-to/                 # Problem-oriented
│   ├── deploy.md
│   └── debug-auth.md
├── reference/              # Information-oriented
│   ├── api/
│   │   └── openapi.yaml
│   └── database/
│       └── schema.md
└── explanation/            # Understanding-oriented
    ├── architecture/
    │   └── ADR-001-snake-case.md
    └── concepts/
        └── multi-tenancy.md

# Archive investigation reports
docs/postmortems/
└── 2025-11-10-react-318-hydration.md

# Total useful docs: ~20,000 lines
# Well organized, easy to find information
```

**Rules:**
- Investigation reports → `postmortems/` immediately after resolution
- ADRs → `explanation/architecture/`
- API docs → auto-generated from OpenAPI/TypeScript
- Human curation required for all AI-generated docs
- Delete, don't just comment out

---

## Key Lessons

### 1. Large Files Hide Bugs
**Problem:** 515-line component made 1-line bug hard to spot

**Solution:**
- Component > 200 lines = red flag
- Extract hooks for reusable logic
- Separate concerns (voice, touch, cart)
- Each file should have one clear purpose

### 2. Duplicate Code = Double Bugs
**Problem:** Two table route implementations caused drift

**Solution:**
- Search for existing implementations before writing new code
- Use AST tools to detect duplicates (e.g., jscpd)
- Migrate consumers before deleting APIs
- DRY (Don't Repeat Yourself)

### 3. ADRs Exist for a Reason
**Problem:** Adding camelCase transform violated ADR-001

**Solution:**
- Check ADRs before making architectural changes
- ADR-001: snake_case API convention
- ADR-006: Dual auth pattern (don't remove "duplicate" auth code)
- If ADR is wrong, update it project-wide

### 4. Don't Fix Without Evidence
**Problem:** Removed UnifiedCartProvider without proof it caused the bug

**Solution:**
- Read error messages first (React #318 was clear)
- Form hypothesis, gather evidence
- Make minimal changes
- Test before assuming success
- Revert if evidence doesn't support the fix

### 5. Documentation Needs Curation
**Problem:** 89,387 lines of unorganized docs

**Solution:**
- Use Diátaxis framework (tutorials, how-to, reference, explanation)
- Archive investigations immediately after resolution
- AI-generated docs need human review and organization
- 20% sprint time for tech debt prevents accumulation

---

## Quick Reference Card

### Component Complexity Checklist

When writing components:
- [ ] < 200 lines per component
- [ ] Single responsibility (one concern)
- [ ] Extract complex logic to hooks
- [ ] Separate UI modes into different components
- [ ] No more than 5 props
- [ ] No more than 10 state variables

### Code Duplication Detection

```bash
# Find duplicate code
npx jscpd src/

# Find duplicate route handlers
grep -r "router\.(get|post|put|delete)" server/src/routes/ | \
  awk '{print $2}' | sort | uniq -d

# Find duplicate components
find client/src/components -name "*.tsx" -exec basename {} \; | \
  sort | uniq -d
```

### ADR Quick Reference

Before making changes, check:
- **ADR-001:** snake_case for all API responses
- **ADR-006:** Dual auth pattern (normal + PIN/demo)
- Other ADRs in `docs/explanation/architecture/`

### Documentation Organization

```markdown
# When to put docs where:

tutorials/        - Step-by-step learning (getting started)
how-to/           - Specific problems (how to deploy, debug X)
reference/        - Technical specs (API, DB schema)
explanation/      - Concepts and decisions (ADRs, architecture)
postmortems/      - Investigation reports (AFTER resolution)

# NOT in main docs:
- Random notes (delete or organize)
- AI-generated content (without human curation)
- Temporary investigation files (move to postmortems)
```

---

## When to Reference This Lesson

**Symptoms:**
- ✅ Bug hard to find in large component
- ✅ Duplicate implementations of same feature
- ✅ Fix applied to one place but not another
- ✅ Confusion about which code is canonical
- ✅ Architecture changes conflict with existing patterns
- ✅ Can't find useful docs in the noise
- ✅ Code review comments about complexity

**Red Flags:**
- File > 200 lines (component) or > 500 lines (module)
- Multiple implementations of same feature
- Violating ADR conventions
- Investigation files in main docs folder
- AI-generated docs without curation

---

## Prevention

### 1. Complexity Linting

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'max-lines': ['warn', {
      max: 200,
      skipBlankLines: true,
      skipComments: true
    }],
    'max-lines-per-function': ['warn', {
      max: 50,
      skipBlankLines: true,
      skipComments: true
    }],
    'complexity': ['warn', 10],
    'max-params': ['warn', 4],
    'max-depth': ['warn', 3]
  }
}
```

### 2. Duplicate Detection in CI

```yaml
# .github/workflows/code-quality.yml
- name: Detect Duplicate Code
  run: |
    npx jscpd src/ --threshold 5
    # Fails if more than 5% duplication
```

### 3. Documentation Structure Enforcement

```bash
#!/bin/bash
# scripts/validate-docs-structure.sh

# Check for investigation files in main docs
investigations=$(find docs/ -name "*investigation*" -not -path "*/postmortems/*")
if [ -n "$investigations" ]; then
  echo "❌ Investigation files should be in docs/postmortems/"
  echo "$investigations"
  exit 1
fi

# Check for ADRs outside architecture folder
adrs=$(find docs/ -name "ADR-*" -not -path "*/architecture/*")
if [ -n "$adrs" ]; then
  echo "❌ ADRs should be in docs/explanation/architecture/"
  echo "$adrs"
  exit 1
fi
```

### 4. Component Extraction Refactoring

```typescript
// Pattern: When component > 200 lines
// 1. Identify distinct concerns
const concerns = [
  'voice ordering logic',
  'touch ordering logic',
  'cart management',
  'modal state',
  'UI rendering'
]

// 2. Extract each concern
// voice logic → useVoiceOrdering() hook
// touch logic → useTouchOrdering() hook
// cart → useCart() hook (already exists)
// modal state → useModalState() hook
// UI → separate VoiceUI and TouchUI components

// 3. Main component becomes thin orchestrator
export function OrderModal({ show, table, seat, onClose }) {
  const mode = useOrderMode()
  return (
    <AnimatePresence>
      {show && table && seat && (
        <ModalContainer onClose={onClose}>
          <OrderUI mode={mode} table={table} seat={seat} />
        </ModalContainer>
      )}
    </AnimatePresence>
  )
}
```

---

## Code Review Checklist

When reviewing code:
- [ ] No files > 200 lines (components) or > 500 lines (modules)
- [ ] No duplicate implementations found via search
- [ ] ADR compliance checked (snake_case, dual auth, etc.)
- [ ] Changes based on evidence, not assumptions
- [ ] New docs organized into correct category
- [ ] Investigation reports moved to postmortems
- [ ] AI-generated content reviewed and curated
- [ ] Complexity metrics acceptable (ESLint)
- [ ] Clear separation of concerns

---

## Related Lessons

- [React Hydration Bug](./react-hydration-early-return-bug.md) - Bug hiding in 515-line component
- [Testing & Debugging Strategies](./testing-debugging-strategies.md) - Evidence-based debugging

---

## Related ADRs

- **ADR-001:** Snake Case API Convention - Follow consistently
- **ADR-006:** Dual Authentication Pattern - Don't remove "duplicate" auth code

---

## TL;DR

**Problem:** Complex code, duplicates, ignoring ADRs, unfocused fixes, doc bloat
**Solutions:**
1. **Break up large files** - < 200 lines per component
2. **Delete duplicates** - DRY principle, search before creating
3. **Follow ADRs** - Or update them project-wide
4. **Evidence-based fixes** - Read errors, gather data, then fix
5. **Organize docs** - Diátaxis framework, archive investigations

**Remember:**
- Large files hide bugs (hydration bug in 515-line component)
- Duplicate code = double maintenance and drift
- ADRs are intentional, not bloat (ADR-006 dual auth)
- Don't fix without evidence (wasted time removing UnifiedCartProvider)
- 89,387 lines of docs → 79 hours wasted ($7,900)

**Quick Fix Pattern:**
```typescript
// ✅ Component < 200 lines, extract hooks
// ✅ Search for existing code before creating new
// ✅ Check ADRs before architectural changes
// ✅ Read error messages, gather evidence, then fix
// ✅ Organize docs: tutorials, how-to, reference, explanation
```
