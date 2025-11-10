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

## Comprehensive Analysis

### [Git History Lessons - Complete Analysis](./LESSONS_SUMMARY.md)
**20 major incidents** analyzed from 1,648 commits (Oct-Nov 2025)
- **Structured JSON data:** [git-history-lessons.json](./git-history-lessons.json)
- **Human-readable summary:** [LESSONS_SUMMARY.md](./LESSONS_SUMMARY.md)
- **Estimated cost impact:** $50,000+ in preventable delays and bloat
- **Prevention rate:** 86% preventable through automation

**Categories analyzed:**
- Errors causing delays (7 incidents)
- AI agent mistakes (12 incidents)
- Unresolved/incomplete fixes (8 incidents)
- Code bloat and technical debt (7 incidents)
- Performance regressions (11 incidents)
- Breaking changes (14 incidents)
- Revert patterns (7 incidents)

---

## Lessons Index

### React & Hydration

#### [React Hydration - Early Return Bug](./react-hydration-early-return-bug.md)
**Error:** React #318 "Hydration failed because initial UI does not match server"
**Pattern:** Early return before AnimatePresence/Suspense
**Fix:** Move conditionals inside wrappers
**Date:** 2025-11-10
**Severity:** CRITICAL
**Time Lost:** 3+ days

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

### Database & Schema

#### Multi-tenancy Security Vulnerability
**Pattern:** Header validation AFTER using header values
**Fix:** Validate headers BEFORE business logic
**Commit:** `df228afd` (2025-10-25)
**Severity:** CRITICAL
**Time Lost:** 2-3 days

#### RPC Schema Mismatches (Recurring)
**Pattern:** Table migrations don't update RPC functions
**Fix:** Step-by-step RPC validation workflow
**Commits:** `554d7d56`, `cb02f9ad` (2025-10-29)
**Severity:** HIGH
**Time Lost:** 3+ days across multiple incidents

### Authentication & State Management

#### Auth Race Condition
**Pattern:** Async cleanup after state changes
**Fix:** Call async operations BEFORE state updates
**Commits:** `60e76993`, `3aacbfd5`, `55640a06` (2025-10-27)
**Severity:** HIGH
**Time Lost:** 2+ days

### Environment & Configuration

#### Environment Variable Newlines
**Pattern:** API keys with literal `\n` from CLI
**Fix:** Always `.trim()` environment variables
**Commit:** `03011ced` (2025-11-07)
**Severity:** HIGH
**Time Lost:** 1-2 days

#### Vite VITE_ Prefix Requirement
**Pattern:** Env vars without VITE_ prefix silently fail
**Fix:** Use root `.env` with VITE_ prefix + startup validation
**Commit:** `2fa772a4` (2025-10-05)
**Severity:** CRITICAL
**Time Lost:** 1 day

### React Hooks & Performance

#### Infinite Loop - Unstable Hook Returns
**Pattern:** Hook returns new object every render
**Fix:** Wrap hook returns in `useMemo`
**Commit:** `982c7cd2` (2025-11-08)
**Severity:** CRITICAL
**Time Lost:** 1 day

---

## Lesson Categories

### 🔴 Critical Patterns (7 Production Blockers)
- React Hydration - Early Return Bug (3+ days)
- Multi-tenancy Security Vulnerability (2-3 days)
- Checkout Flow Cart Emptying (1-2 days)
- Infinite Loop - useToast (1 day)
- React Production Crash - Unstable Version (1 day)
- Blank Page - CommonJS Contamination (1 day)
- Login Blank - Environment Config (1 day)

### 🟡 High Severity (9 incidents)
- Auth Race Condition (2+ days)
- RPC Schema Mismatches (3+ days recurring)
- Test Quarantine Crisis (4+ days)
- Environment Variable Newlines (1-2 days)
- AI Parsing Confusion (2-3 days)
- Database Schema Drift (1-2 days)
- Security Bypass - test-token (ongoing until fixed)
- Auth Scopes Column Mismatch (1-2 days)

### 🟢 Technical Debt (4 patterns)
- Documentation Bloat (79 hours / $7,900)
- Dead Code Accumulation (123 hours / $12,300)
- API Client Proliferation (50 hours / $5,000)
- Test Infrastructure Gaps

### 🔧 Debugging Strategies Learned
- Trust error messages first (React #318 told us exactly what was wrong)
- Test production builds locally (dev mode too forgiving)
- Trace full execution paths (don't assume single implementation)
- Validate schema consistency (code vs database)
- Quick revert feedback loop (3-minute turnaround on restaurant ID)

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

**Total Lessons Documented:** 20 (from comprehensive git history analysis)
**Individual Lesson Files:** 1
**Critical Severity Incidents:** 7 (production-blocking)
**High Severity Incidents:** 9 (feature-breaking, security)
**Technical Debt Patterns:** 4
**Total Development Time Lost:** 15-20 days (~$50,000)
**Preventable Through Automation:** 86% (17/20 incidents)

**Most Costly Patterns:**
1. React Hydration Bug - 3+ days
2. Test Quarantine Crisis - 4+ days
3. RPC Schema Mismatches - 3+ days (recurring)
4. Documentation Bloat - 79 hours ($7,900)
5. Dead Code Accumulation - 123 hours ($12,300)

**Quick Wins (High ROI):**
- Production build testing in CI (prevents 6/20 incidents)
- Schema validation (prevents 3/20 incidents)
- Environment validation (prevents 3/20 incidents)
- Security scanning (prevents 2/20 incidents)

---

Last Updated: 2025-11-10
