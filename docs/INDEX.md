# rebuild-6.0 Documentation Index

> **Start here** to find what you need.

## Learning the System

| Topic | Document | Description |
|-------|----------|-------------|
| Project overview | [CLAUDE.md](/CLAUDE.md) | Commands, patterns, architecture |
| Architecture | [docs/adrs/](/docs/adrs/) | Architectural decision records |
| Testing | [.github/TEST_DEBUGGING.md](/.github/TEST_DEBUGGING.md) | Test strategy and debugging |

## Architectural Decisions (ADRs)

| ADR | Decision |
|-----|----------|
| [ADR-001](/docs/adrs/001-snake-case-convention.md) | Snake case everywhere |
| [ADR-006](/docs/adrs/006-dual-auth-pattern.md) | Dual authentication |
| [ADR-010](/docs/adrs/010-remote-first-database.md) | Remote-first database |
| [ADR-015](/docs/adrs/015-order-state-machine.md) | Order state machine |

## Security

| Document | Purpose |
|----------|---------|
| [SECURITY.md](/SECURITY.md) | Security policies and contacts |
| [Risk Register](/docs/RISK_REGISTER.md) | Known risks and mitigations |
| [Audit Summary](/audit_output/01_EXEC_SUMMARY.md) | 2025-12 hostile audit |

## Prevention Strategies (Top 10)

| Pattern | When to Use | Document |
|---------|-------------|----------|
| Multi-tenant isolation | All database queries | [multi-tenant-isolation-rls-cache](/docs/solutions/security-issues/multi-tenant-isolation-rls-cache.md) |
| Dual auth handling | Auth middleware changes | [websocket-station-auth](/docs/solutions/auth-issues/websocket-station-auth-dual-pattern.md) |
| Strict auth | Production configuration | [strict-auth-drift](/docs/solutions/auth-issues/strict-auth-environment-drift.md) |
| Demo bypass prevention | Demo mode changes | [demo-bypass-prevention](/docs/solutions/security-issues/demo-bypass-prevention.md) |
| HTTPOnly cookies | Token storage | [httponly-cookie-auth](/docs/solutions/security-issues/httponly-cookie-auth.md) |
| Idempotency keys | Stripe API calls | [idempotency-key-pattern](/docs/solutions/security-issues/idempotency-key-pattern.md) |
| CSRF protection | State-changing endpoints | [csrf-protection](/docs/solutions/security-issues/csrf-protection.md) |
| Timing-safe comparison | Auth comparison | [timing-safe-comparison](/docs/solutions/security-issues/timing-safe-comparison.md) |
| Atomic rate limiting | Rate limit counters | [atomic-rate-limiting](/docs/solutions/security-issues/atomic-rate-limiting.md) |
| Schema drift prevention | Database migrations | [migration-bifurcation](/docs/solutions/database-issues/migration-bifurcation-schema-drift.md) |

## Operations

| Guide | Purpose |
|-------|---------|
| [Deployment](/docs/DEPLOYMENT.md) | Deploy to Render |
| [Incident Response](/docs/INCIDENT_RESPONSE.md) | Handle production issues |

## Solution Categories

| Category | Description |
|----------|-------------|
| [auth-issues](/docs/solutions/auth-issues/) | Authentication patterns |
| [security-issues](/docs/solutions/security-issues/) | Security vulnerabilities |
| [build-errors](/docs/solutions/build-errors/) | Build and deployment fixes |
| [database-issues](/docs/solutions/database-issues/) | Migration and schema drift |
| [performance-issues](/docs/solutions/performance-issues/) | Memory leaks, race conditions |
| [test-failures](/docs/solutions/test-failures/) | Test infrastructure fixes |
| [integration-issues](/docs/solutions/integration-issues/) | External API issues |

---

*Last updated: 2025-12-28*
*Aligned with: Compound Engineering North Star*
