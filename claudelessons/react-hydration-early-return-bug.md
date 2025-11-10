# Lesson: React Hydration Bug - Early Return Before AnimatePresence

**Date:** 2025-11-10
**Severity:** CRITICAL
**Time to Find:** 3+ days
**Fix Complexity:** 2 lines changed

---

## The Bug Pattern

```typescript
// ❌ BREAKS HYDRATION
if (!show || !table || !seat) return null

return (
  <AnimatePresence>
    {show && <Content />}
  </AnimatePresence>
)
```

**Why It Breaks:**
- Server renders `null` when condition is false
- Client renders `AnimatePresence` wrapper (always renders a `<div>`)
- Server HTML ≠ Client HTML → React Error #318

---

## The Fix

```typescript
// ✅ CORRECT - AnimatePresence always in render tree
return (
  <AnimatePresence>
    {show && table && seat && <Content />}
  </AnimatePresence>
)
```

**Why It Works:**
- AnimatePresence renders consistently on server and client
- Conditional logic moved INSIDE the wrapper
- Server and client both render the same wrapper element

---

## Key Lessons

### 1. Trust Error Messages
- **React Error #318** = Hydration mismatch
- Don't ignore console errors - investigate them FIRST
- We wasted days chasing wrong assumptions instead of reading the error

### 2. The Golden Rule
**Never early return before components that must render consistently:**
- ❌ AnimatePresence
- ❌ Suspense boundaries
- ❌ Context Providers (in some cases)
- ❌ Error Boundaries (in some cases)

### 3. Why We Missed It

**Red Herrings We Chased:**
1. Nested UnifiedCartProvider (was actually correct)
2. Deployment caching (wasn't the issue)
3. Context accessibility (wasn't the problem)

**What Delayed Us:**
- Component was 515 lines (easy to overlook one line)
- `suppressHydrationWarning` masked the symptom
- Confirmation bias from previous Date.now() hydration fixes
- Focused on architecture instead of error message

### 4. Investigation Strategy That Worked

**What Finally Found It:**
- User provided screenshot with React #318 error
- Launched 4 parallel subagent investigations
- Used Sequential Thinking MCP to synthesize findings
- Focused specifically on hydration patterns

**Better Debugging Process:**
```bash
# When you see hydration errors:
1. Read the actual error message (don't assume)
2. Search for early returns before wrappers
3. Check for non-deterministic values (Date.now, Math.random)
4. Look for browser API calls without SSR guards
5. Test with production build, not just dev mode
```

---

## Quick Reference Card

### Hydration-Safe Patterns

**✅ SAFE:**
```typescript
return (
  <Wrapper>
    {condition && <Content />}
  </Wrapper>
)
```

**❌ UNSAFE:**
```typescript
if (!condition) return null
return <Wrapper><Content /></Wrapper>
```

### Common Hydration Bugs
1. Early returns before AnimatePresence/Suspense
2. `Date.now()` or `new Date()` in initial state
3. `Math.random()` in render
4. `window` / `localStorage` access without guards
5. Different render on server vs client

### SSR Guards
```typescript
// Client-only code
useEffect(() => {
  if (typeof window === 'undefined') return
  // Browser API access here
}, [])

// Client-only initial state
const [value, setValue] = useState('')  // Empty on server
useEffect(() => {
  setValue(localStorage.getItem('key'))  // Set on client
}, [])
```

---

## When to Reference This Lesson

**You're experiencing a similar bug if:**
- ✅ React Error #318 in console
- ✅ Modal/dialog fails to load
- ✅ "Hydration failed" error message
- ✅ Component works in dev, breaks in production
- ✅ suppressHydrationWarning is being used

**Debug checklist:**
1. [ ] Check for early returns before AnimatePresence
2. [ ] Search for early returns before Suspense
3. [ ] Look for non-deterministic initial state
4. [ ] Check for browser API access without guards
5. [ ] Remove suppressHydrationWarning to see real errors
6. [ ] Test with `npm run build && npm run start`

---

## Code Review Checklist

When reviewing code with SSR/hydration:
- [ ] No early returns before AnimatePresence
- [ ] No early returns before Suspense
- [ ] No Date.now(), Math.random() in initial state
- [ ] No window/localStorage without SSR guards
- [ ] AnimatePresence/Suspense render consistently
- [ ] Test with production build

---

## Prevention

### ESLint Rule (Future)
```javascript
// Add to .eslintrc.js
{
  "rules": {
    "react/no-early-return-before-wrapper": ["error", {
      "wrappers": ["AnimatePresence", "Suspense"]
    }]
  }
}
```

### Component Template
```typescript
// Template for modals with AnimatePresence
export function Modal({ show, onClose, children }) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="modal"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

---

## Related Resources

- **Full Post-Mortem:** `docs/postmortems/2025-11-10-react-318-hydration-bug.md`
- **Fix Commit:** `3949d61a`
- **React Error #318:** https://react.dev/errors/418
- **Framer Motion AnimatePresence:** https://www.framer.com/motion/animate-presence/

---

## TL;DR

**Problem:** Early return before AnimatePresence causes hydration mismatch
**Solution:** Move conditional inside AnimatePresence
**Remember:** Wrappers must render consistently on server and client
**Error:** React #318 = "Hydration failed because initial UI does not match server"

**The Pattern:**
```typescript
// ❌ WRONG: return null before wrapper
// ✅ RIGHT: return <Wrapper>{condition && content}</Wrapper>
```

**Trust the error message. Don't chase assumptions.**
