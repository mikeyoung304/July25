# Claude Lessons - Quick Reference Guide

This directory contains lessons learned from debugging sessions with Claude Code. Each lesson is a distilled, actionable reference for future debugging.

---

## How to Use This Directory

**When to reference lessons:**
1. You encounter a similar error pattern
2. You need debugging strategy inspiration
3. You want to avoid past mistakes
4. Onboarding new developers

**Format:**
- Each lesson is a standalone markdown file
- Includes the bug pattern, fix, and prevention
- Quick reference cards for fast lookup
- Links to full post-mortems in `/docs/postmortems/`

---

## Lessons Index

### React & Hydration

#### [React Hydration - Early Return Bug](./react-hydration-early-return-bug.md)
**Error:** React #318 "Hydration failed because initial UI does not match server"
**Pattern:** Early return before AnimatePresence/Suspense
**Fix:** Move conditionals inside wrappers
**Date:** 2025-11-10
**Severity:** CRITICAL

**Quick Pattern:**
```typescript
// ❌ WRONG
if (!show) return null
return <AnimatePresence>{show && content}</AnimatePresence>

// ✅ RIGHT
return <AnimatePresence>{show && content}</AnimatePresence>
```

**When to reference:**
- React Error #318
- Modal/dialog loading failures
- "Hydration failed" errors
- Works in dev, breaks in production

---

## Lesson Categories

### 🔴 Critical Patterns (Production Blockers)
- React Hydration - Early Return Bug

### 🟡 Common Pitfalls
- (Future lessons)

### 🟢 Best Practices
- (Future lessons)

### 🔧 Debugging Strategies
- (Future lessons)

---

## Contributing New Lessons

When adding a new lesson, include:

1. **Bug Pattern** - Code that causes the issue
2. **Why It Breaks** - Technical explanation
3. **The Fix** - Corrected code
4. **Key Lessons** - What we learned
5. **Quick Reference** - Checklist/patterns
6. **When to Reference** - Symptoms to look for
7. **Prevention** - How to avoid it

**Template:**
```markdown
# Lesson: [Short Title]

**Date:** YYYY-MM-DD
**Severity:** CRITICAL/HIGH/MEDIUM/LOW
**Time to Find:** X days/hours
**Fix Complexity:** X lines changed

## The Bug Pattern
[Code showing the bug]

## The Fix
[Code showing the solution]

## Key Lessons
[Numbered list of takeaways]

## Quick Reference Card
[Checklists and patterns]

## When to Reference This Lesson
[Symptoms and error messages]
```

---

## Quick Search

**By Error Message:**
- React Error #318 → [React Hydration - Early Return Bug](./react-hydration-early-return-bug.md)

**By Symptom:**
- Modal won't load → [React Hydration - Early Return Bug](./react-hydration-early-return-bug.md)
- "Hydration failed" → [React Hydration - Early Return Bug](./react-hydration-early-return-bug.md)

**By Technology:**
- React SSR/Hydration → [React Hydration - Early Return Bug](./react-hydration-early-return-bug.md)
- Framer Motion → [React Hydration - Early Return Bug](./react-hydration-early-return-bug.md)

---

## Related Documentation

- **Full Post-Mortems:** `/docs/postmortems/`
- **Architecture Docs:** `/docs/explanation/architecture/`
- **How-To Guides:** `/docs/how-to/`

---

## Philosophy

**"The fix was simple. Finding it was hard. Learning from it is invaluable."**

These lessons exist to:
- Reduce debugging time on similar issues
- Share knowledge across sessions
- Build pattern recognition
- Prevent repeated mistakes
- Help future Claude instances help you better

**When you add a lesson:** Make it actionable, concise, and searchable.

**When you reference a lesson:** Update it if you learn something new.

---

## Statistics

**Total Lessons:** 1
**Critical Severity:** 1
**Average Time Saved:** TBD (will track over time)

---

Last Updated: 2025-11-10
