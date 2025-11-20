# react ui ux issues

## Files in this category:
- **LESSONS.md** - Incidents, patterns, and quick reference
- **PREVENTION.md** - How to prevent these issues

# React UI/UX Issues - Executive Summary

## Overview

This folder documents 5 critical React bugs that cost **$5,500-8,000** in developer time and caused a **3-day production outage** affecting voice and touch ordering systems. The incidents reveal subtle SSR/hydration issues and React patterns that are difficult to detect but catastrophic in production.

## The Cost of Subtle Bugs

### By the Numbers
- **Total Time Lost**: 40-51 hours across 5 incidents
- **Lines of Code Changed**: ~30 lines total
- **Time-to-Fix Ratio**: 1.3-1.7 hours per line changed
- **Production Downtime**: 72+ hours (React #318 incident)
- **Components Affected**: 2 major (VoiceOrderModal: 528 lines, FloorPlanEditor: 224 lines)
- **Developer Cost**: $5,500-8,000 at $100-150/hour

### Why These Bugs Were So Expensive
1. **Minimal code changes** masked by **massive component complexity**
2. **SSR/hydration issues** invisible in development builds
3. **Misleading error messages** (React #318, #418 minified)
4. **Testing limitations** (canvas elements, manual reproduction required)
5. **Pattern subtlety** (early returns before AnimatePresence look normal)

## The 5 Critical Incidents

### 1. React #318 Hydration Bug (40-51 hours, $4,000-7,650)
- **Impact**: 3-day production outage, voice/touch ordering broken
- **Root Cause**: Line 81 in VoiceOrderModal.tsx - early return before AnimatePresence
- **Fix**: 1 line removed, 1 line modified
- **Lesson**: AnimatePresence must always be in render tree

**Cost Breakdown**:
- Initial investigation: 8-12 hours
- Wrong fixes attempted: 12-16 hours (nested provider theory)
- Parallel investigation: 12-15 hours (4 subagents)
- Final fix + testing: 8-8 hours
- **Total**: 40-51 hours

### 2. Infinite Loop Bug (8-10 hours, $800-1,500)
- **Impact**: "Loading floor plan..." infinite state, React error #310
- **Root Cause**: useToast hook returned unstable object reference
- **Fix**: Added useMemo wrapper (2 lines)
- **Lesson**: Always stabilize hook return values

### 3. Cart Provider Isolation (6-8 hours, $600-1,200)
- **Impact**: Touch ordering showed "Added!" but cart stayed empty
- **Root Cause**: Two UnifiedCartProvider instances with different persistKeys
- **Fix**: Changed persistKey to match root provider (1 line)
- **Lesson**: Nested providers of same type need shared persistKey

### 4. React #418 Bug (4-6 hours, $400-900)
- **Impact**: "This section couldn't be loaded" error on modal open
- **Root Cause**: `new Date().toISOString()` generating different timestamps each render
- **Fix**: Removed non-deterministic values (4 locations, 8 lines)
- **Lesson**: No Date.now(), Math.random() in render or props

### 5. Auth Hang (2-3 hours, $200-450)
- **Impact**: Login stuck at "Signing in..." since Nov 2, 2025
- **Root Cause**: Missing setCurrentRestaurantId() after demo code removal
- **Fix**: Added 5 setCurrentRestaurantId() calls
- **Lesson**: Dual auth pattern requires explicit state sync

## Common Patterns Across All Incidents

### 1. Small Changes, Big Impact
All 5 bugs fixed with <30 total lines of code, but took 40-51 hours to find.

### 2. Component Complexity Hides Bugs
- VoiceOrderModal: 528 lines - early return on line 81 easily overlooked
- Multiple rendering modes (voice/touch) increased cognitive load
- Nested modals and state management obscured root cause

### 3. SSR/Hydration Invisibility
- Development builds don't show hydration mismatches
- Production builds minify error messages
- Need `npm run build && npm run preview` to reproduce

### 4. Testing Limitations
- Canvas elements can't be automated with Playwright
- Manual user testing required for floor plan interactions
- Slower feedback loop for attempted fixes

### 5. Misleading Error Messages
- React #318: "Hydration failed" (doesn't say WHERE)
- React #418: "Values are different" (doesn't show which values)
- React #310: "Too many re-renders" (doesn't identify hook)

## Prevention Strategies

### 1. Pattern Recognition (This Guide)
Learn the 5 anti-patterns documented here:
- Early returns before AnimatePresence
- Unstable hook returns (missing useMemo)
- Non-deterministic values in render
- Nested providers with different keys
- Prop-to-state sync without useEffect

### 2. Component Size Limits
- **Warning at 200 lines**: Consider decomposition
- **Hard limit at 500 lines**: Mandatory refactor
- VoiceOrderModal (528 lines) needs splitting into:
  - VoiceOrderModal (container, 100 lines)
  - TouchOrderView (200 lines)
  - VoiceOrderView (200 lines)

### 3. Pre-Commit Checks
```bash
# 1. Test with production build
npm run build && npm run preview

# 2. Check for non-deterministic values
git diff --cached | grep -E "Date\.now|Math\.random|new Date\(\)"

# 3. Check for unstable hooks
git diff --cached client/src/hooks/ | grep "return {" -A 5 | grep -v useMemo

# 4. Check component line counts
git diff --name-only --cached | xargs wc -l | awk '$1 > 200'
```

### 4. AI Agent Guidelines
When Claude Code (or any AI agent) works on React components:
1. **Always check for early returns** before AnimatePresence/Suspense
2. **Flag components >200 lines** for decomposition discussion
3. **Search for non-deterministic patterns** (Date.now, Math.random)
4. **Test with production builds** for hydration issues
5. **Ask about SSR** if touching modals or animated components

### 5. Code Review Checklist
- [ ] No early returns before wrapper components
- [ ] All hook returns wrapped in useMemo/useCallback
- [ ] No Date.now(), Math.random() in render or props
- [ ] Nested providers use same persistKey if same type
- [ ] Prop-to-state sync uses useEffect
- [ ] Component under 200 lines (or justified)
- [ ] Tested with production build

## File Structure

This folder contains:

1. **README.md** (this file) - Executive summary and cost analysis
2. **PATTERNS.md** - The 5 anti-patterns with code examples
3. **INCIDENTS.md** - Detailed timeline of each incident
4. **PREVENTION.md** - How to avoid these bugs (with examples)
5. **QUICK-REFERENCE.md** - React error codes and checklists
6. **AI-AGENT-GUIDE.md** - Instructions for Claude Code and other AI tools

## Quick Navigation

### I'm debugging a React error
→ See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for error code meanings

### I'm reviewing a PR with React components
→ See [PREVENTION.md](./PREVENTION.md) for code review checklist

### I'm an AI agent working on React code
→ See [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) for guardrails

### I want to understand what went wrong
→ See [INCIDENTS.md](./INCIDENTS.md) for complete incident timelines

### I need to learn the anti-patterns
→ See [PATTERNS.md](./PATTERNS.md) for before/after code examples

## Key Takeaways

1. **React #318 is almost always an early return issue** - Check for returns before AnimatePresence first
2. **Hook return values must be stable** - Wrap objects/arrays in useMemo
3. **No non-deterministic values** - Date.now(), Math.random() cause hydration mismatches
4. **Component size matters** - >200 lines = bugs hiding in plain sight
5. **Test with production builds** - Development mode hides SSR issues

## Related Documentation

- `/docs/postmortems/2025-11-10-react-318-hydration-bug.md` - Full React #318 post-mortem
- `/docs/archive/2025-11/investigations/TOUCH_ORDERING_CART_BUG_ANALYSIS.md` - Cart provider investigation
- `commit 3949d61a` - React #318 fix
- `commit 982c7cd2` - Infinite loop fix
- `commit 3c3009b8` - React #418 fix
- `commit 3740c782` - Cart provider fix
- `commit acd6125c` - Auth hang fix

## Statistics

### Bug Distribution by Type
- SSR/Hydration issues: 2 incidents (60% of time)
- Hook stability issues: 1 incident (15% of time)
- Context/Provider issues: 1 incident (15% of time)
- State sync issues: 1 incident (10% of time)

### Time Distribution
- Investigation: 60% of time (misleading symptoms)
- Wrong fixes: 25% of time (incorrect theories)
- Actual fix: 10% of time (once understood)
- Testing/verification: 5% of time

### Detection Time
- React #318: 3 days
- Infinite loop: Same day
- Cart provider: 1 day
- React #418: Same day (recurrence)
- Auth hang: 8 days (low priority)

---

**Created**: 2025-11-19
**Last Updated**: 2025-11-19
**Authority**: Based on production incidents Nov 2-10, 2025
**Status**: Active - prevent recurrence

