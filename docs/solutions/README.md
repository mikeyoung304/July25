# Solutions Knowledge Base

**Last Updated:** 2025-12-24

This directory contains codified solutions to problems encountered during development. Each solution documents:
- Problem symptoms and root cause
- Step-by-step resolution
- Prevention strategies for the future

## Purpose

Following the **Compounding Engineering** philosophy: each problem solved makes future work easier by documenting the solution for reference.

## Solution Index

### Accessibility Issues

| Solution | Description |
|----------|-------------|
| [KDS Code Review Multi-Phase Fixes](./accessibility-issues/kds-code-review-multi-phase-fixes.md) | Multi-phase accessibility improvements for Kitchen Display System |

### Auth Issues

| Solution | Description |
|----------|-------------|
| [Strict Auth Environment Drift](./auth-issues/strict-auth-environment-drift.md) | STRICT_AUTH env var drift causing auth loops ($20K incident) |
| [WebSocket Station Auth Dual Pattern](./auth-issues/websocket-station-auth-dual-pattern.md) | Dual authentication pattern for WebSocket station connections |

### Build Errors

| Solution | Description |
|----------|-------------|
| [Pre-Commit xargs False Positive](./build-errors/pre-commit-xargs-false-positive.md) | BSD xargs empty input causing false positive failures |
| [TypeScript Mismatched Braces Vercel](./build-errors/typescript-mismatched-braces-vercel.md) | TypeScript compilation failures on Vercel deployment |
| [Vercel Production Flag Cascade](./build-errors/vercel-production-flag-cascade.md) | Production flag cascade causing devDeps unavailable ($900 incident) |

### Code Quality

| Solution | Description |
|----------|-------------|
| [Console to Structured Logger Migration](./code-quality/console-to-structured-logger-migration.md) | Migration from console.log to structured logger |

### Code Quality Issues

| Solution | Description |
|----------|-------------|
| [Multi-Layer Hardening P2 Backlog](./code-quality-issues/multi-layer-hardening-p2-backlog.md) | Multi-layer code hardening for P2 backlog items |

### Cross References

| Solution | Description |
|----------|-------------|
| [2025-12-24 Parallel Resolution](./cross-references/2025-12-24-parallel-resolution.md) | Cross-reference documentation for parallel resolution session |

### Database Issues

| Solution | Description |
|----------|-------------|
| [Constraint Drift Enum Mismatch](./database-issues/constraint-drift-enum-mismatch.md) | TypeScript enum vs DB CHECK constraint drift ($5K incident) |
| [Menu Service Wrong Column 86 Item](./database-issues/menu-service-wrong-column-86-item.md) | Menu service querying wrong column for 86'd items |
| [Migration Bifurcation Schema Drift](./database-issues/migration-bifurcation-schema-drift.md) | Remote vs local migration divergence ($67K incident) |

### Integration Issues

| Solution | Description |
|----------|-------------|
| [OpenAI Silent Model Deprecation](./integration-issues/openai-silent-model-deprecation.md) | Silent API deprecation causing missing transcription ($1.2K incident) |

### Performance Issues

| Solution | Description |
|----------|-------------|
| [Interval Memory Leaks](./performance-issues/interval-memory-leaks.md) | Untracked setInterval causing memory growth ($2K incident) |
| [Optimistic WebSocket Timer Memory Leak](./performance-issues/optimistic-websocket-timer-memory-leak.md) | setTimeout without stored ID causing memory growth |
| [Vitest Hanging Output Buffering](./performance-issues/vitest-hanging-output-buffering.md) | Vitest test runner hanging due to output buffering |
| [WebRTC Handler Timing Race](./performance-issues/webrtc-handler-timing-race.md) | DataChannel handler race condition ($1K incident) |

### Prevention

| Solution | Description |
|----------|-------------|
| [Parallel Resolution Learnings 2025-12-24](./prevention/parallel-resolution-learnings-2025-12-24.md) | Lessons learned from parallel resolution approaches |

### Process Issues

| Solution | Description |
|----------|-------------|
| [Claude Code Permission Syntax Fix](./process-issues/claude-code-permission-syntax-fix.md) | Fixing Claude Code permission syntax issues |
| [Documentation Orphan Cleanup](./process-issues/documentation-orphan-cleanup.md) | Cleaning up orphaned documentation files |
| [Parallel Agent P2-P3 Backlog Resolution](./process-issues/parallel-agent-p2-p3-backlog-resolution.md) | Parallel agent approach to P2/P3 backlog |
| [Parallel Agent Todo Audit Crash](./process-issues/parallel-agent-todo-audit-crash.md) | Handling parallel agent crashes during todo audit |
| [Parallel Agent Todo Resolution](./process-issues/parallel-agent-todo-resolution.md) | Parallel agent strategy for todo resolution |
| [Parallel Subagent Debt Scanning](./process-issues/parallel-subagent-debt-scanning.md) | Subagent-based technical debt scanning |

### Security Issues

| Solution | Description |
|----------|-------------|
| [API Error Info Disclosure Remediation](./security-issues/api-error-info-disclosure-remediation.md) | Error response leaking internal details |
| [Header Fallback Cross-Tenant Vulnerability](./security-issues/header-fallback-cross-tenant-vulnerability.md) | X-Restaurant-ID fallback allowing cross-tenant access |
| [Multi-Tenant Isolation RLS Cache](./security-issues/multi-tenant-isolation-rls-cache.md) | Multi-tenant isolation via RLS and cache key patterns |
| [P0-P1 Backlog WebSocket Auth UUID Validation](./security-issues/p0-p1-backlog-websocket-auth-uuid-validation.md) | WebSocket authentication and UUID validation fixes |
| [Rate Limiter TOCTOU Race Condition](./security-issues/rate-limiter-toctou-race-condition.md) | Time-of-check to time-of-use race condition in rate limiter |

### Test Failures

| Solution | Description |
|----------|-------------|
| [Canvas Mock Global Setup](./test-failures/canvas-mock-global-setup.md) | Global canvas mock to eliminate jsdom warnings |
| [CI Test Suite Failures Mock Drift](./test-failures/ci-test-suite-failures-mock-drift.md) | CI test failures due to mock interface drift |
| [E2E Infrastructure Overhaul 2025-12](./test-failures/e2e-infrastructure-overhaul-2025-12.md) | Complete E2E test infrastructure overhaul |
| [Env Pollution Test Isolation](./test-failures/env-pollution-test-isolation.md) | Test isolation failures from environment pollution |
| [KDS Test Mock Interface Drift](./test-failures/kds-test-mock-interface-drift.md) | KDS test mock interface drift after refactor |
| [OrderCard Test Drift After Refactor](./test-failures/ordercard-test-drift-after-refactor.md) | OrderCard component test drift post-refactor |
| [Playwright Reporter Deduplication](./test-failures/playwright-reporter-deduplication.md) | Deduplicating Playwright test reporter entries |
| [Shared Package Exports Barrel Imports](./test-failures/shared-package-exports-barrel-imports.md) | Shared package exports and barrel import issues |

### Type Issues

| Solution | Description |
|----------|-------------|
| [Type Schema Mismatch API Shared](./type-issues/type-schema-mismatch-api-shared.md) | Type schema mismatches between API and shared packages |

### Type Safety Issues

| Solution | Description |
|----------|-------------|
| [CL-TYPE-001 Schema Mismatch Type Assertions](./type-safety-issues/CL-TYPE-001-schema-mismatch-type-assertions.md) | Schema mismatch requiring unsafe type assertions |

## Categories Summary

| Category | Count | Description |
|----------|-------|-------------|
| Accessibility Issues | 1 | KDS and UI accessibility improvements |
| Auth Issues | 2 | Authentication patterns, STRICT_AUTH drift |
| Build Errors | 3 | Compilation, deployment, Vercel issues |
| Code Quality | 1 | Logging and code standards |
| Code Quality Issues | 2 | Multi-layer code hardening, menu embedding |
| Cross References | 1 | Session and resolution cross-references |
| Database Issues | 3 | Schema drift, migration bifurcation, constraints |
| Integration Issues | 1 | OpenAI API deprecation |
| Performance Issues | 4 | Memory leaks, timers, WebRTC, Vitest |
| Prevention | 1 | Proactive prevention patterns |
| Process Issues | 7 | Tooling, agents, documentation |
| Security Issues | 5 | Auth, RLS, rate limiting, cross-tenant |
| Test Failures | 8 | Mock drift, canvas mock, E2E |
| Type Issues | 1 | Type system mismatches |
| Type Safety Issues | 1 | Schema and type assertion issues |
| **Total** | **41** | |

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

- [CLAUDE.md](../../CLAUDE.md) — Project configuration and critical patterns
- [Test Debugging](.github/TEST_DEBUGGING.md) — Test debugging reference
