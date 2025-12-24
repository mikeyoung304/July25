# Solutions Knowledge Base

**Last Updated:** 2025-12-24

This directory contains codified solutions to problems encountered during development. Each solution documents:
- Problem symptoms and root cause
- Step-by-step resolution
- Prevention strategies for the future

## Purpose

Following the **Compounding Engineering** philosophy: each problem solved makes future work easier by documenting the solution for reference.

## Categories

### Build & Deployment
- [Build Errors](./build-errors/) — TypeScript compilation, Vercel deployment, pre-commit hook issues
- [Type Safety Issues](./type-safety-issues/) — Schema mismatches, type assertions

### Testing
- [Test Failures](./test-failures/) — Mock drift, test isolation, E2E infrastructure
- [Performance Issues](./performance-issues/) — Vitest hanging, memory leaks

### Security & Auth
- [Security Issues](./security-issues/) — Rate limiting, WebSocket auth, RLS policies
- [Auth Issues](./auth-issues/) — Dual authentication pattern, station auth

### Data & Database
- [Database Issues](./database-issues/) — Schema problems, migrations, column fixes

### Code Quality
- [Code Quality](./code-quality/) — Logger migration, structured logging
- [Code Quality Issues](./code-quality-issues/) — Multi-layer hardening

### Process & Tooling
- [Process Issues](./process-issues/) — Parallel agents, Claude Code, documentation cleanup
- [Prevention](./prevention/) — Proactive prevention patterns

### Accessibility
- [Accessibility Issues](./accessibility-issues/) — KDS code review, multi-phase fixes

## How to Add Solutions

Use the `/workflows:codify` command after solving a non-trivial problem:

```bash
/workflows:codify Brief description of what was fixed
```

This will:
1. Analyze the conversation for problem/solution details
2. Create a properly structured solution document
3. Add appropriate YAML frontmatter for searchability
4. Place it in the correct category

## Solution Document Structure

Each solution should include:

```markdown
---
title: "Problem Title"
slug: problem-slug
category: category-name
severity: low|medium|high|critical
date_solved: YYYY-MM-DD
---

# Problem Title

## Problem Summary
What was happening and why it was a problem.

## Symptoms
Observable indicators of the problem.

## Root Cause
Technical explanation of why it happened.

## Solution
Step-by-step fix with code examples.

## Prevention
How to avoid this in the future.
```

## Related

- [Claude Lessons](./.claude/lessons/) — Lessons learned from incidents
- [Prevention Strategies](./.claude/prevention/) — Proactive prevention patterns
- [Post-Mortems](./docs/postmortems/) — Incident post-mortems
