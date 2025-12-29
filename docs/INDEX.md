# rebuild-6.0 Documentation Index

> **Start here** to find what you need.

## Learning the System

| Topic | Document | Description |
|-------|----------|-------------|
| Project overview | [CLAUDE.md](/CLAUDE.md) | Commands, patterns, architecture |
| Architecture | See "Architectural Decisions" below | Key patterns and conventions |
| Testing | [.github/TEST_DEBUGGING.md](/.github/TEST_DEBUGGING.md) | Test strategy and debugging |

## Architectural Decisions

Key decisions are documented in CLAUDE.md:
- **ADR-001**: Snake case convention (database, API, client)
- **ADR-006**: Dual authentication pattern (Supabase + localStorage JWT)
- **ADR-010**: Remote-first database (Supabase as source of truth)
- **ADR-015**: Order state machine (8 states, server-side validation)

## Security

| Document | Purpose |
|----------|---------|
| [SECURITY.md](/SECURITY.md) | Security policies and contacts |
| [Risk Register](/docs/RISK_REGISTER.md) | Known risks and mitigations |
| [Audit Summary](/docs/archive/2025-12/security-audit/01_EXEC_SUMMARY.md) | 2025-12 hostile audit |

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
| [Deployment](/docs/DEPLOYMENT_BEST_PRACTICES.md) | Deploy to Render |

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
| [process-issues](/docs/solutions/process-issues/) | Workflow and tooling fixes |
| [code-quality](/docs/solutions/code-quality/) | Code quality improvements |
| [code-quality-issues](/docs/solutions/code-quality-issues/) | Code review findings |
| [accessibility-issues](/docs/solutions/accessibility-issues/) | Accessibility improvements |
| [type-issues](/docs/solutions/type-issues/) | TypeScript type fixes |
| [type-safety-issues](/docs/solutions/type-safety-issues/) | Type safety patterns |

## Prevention Strategies

| Document | Purpose |
|----------|---------|
| [README](/docs/prevention/README.md) | Prevention overview |
| [Executive Summary](/docs/prevention/EXECUTIVE_SUMMARY.md) | High-level prevention summary |
| [Issues Mapping](/docs/prevention/ISSUES_MAPPING.md) | Issue categorization |
| [Auth Dual Pattern Prevention](/docs/prevention/AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md) | Auth pattern guardrails |
| [KDS Prevention Strategies](/docs/prevention/KDS_PREVENTION_STRATEGIES.md) | KDS-specific prevention |
| [KDS Quick Reference](/docs/prevention/KDS_QUICK_REFERENCE.md) | KDS prevention cheatsheet |
| [KDS ESLint Automation](/docs/prevention/KDS_ESLINT_AUTOMATION.md) | Automated KDS checks |

## Testing Guides

| Document | Purpose |
|----------|---------|
| [README](/docs/guides/testing/README.md) | Testing guide overview |
| [Quick Reference](/docs/guides/testing/QUICK-REFERENCE.md) | Testing cheatsheet |
| [Testing Standards](/docs/guides/testing/TESTING-STANDARDS.md) | Test quality standards |
| [Test Isolation Strategy](/docs/guides/testing/TEST-ISOLATION-STRATEGY.md) | Isolation best practices |
| [State Isolation Patterns](/docs/guides/testing/state-isolation-patterns.md) | State management in tests |
| [Test Isolation Prevention](/docs/guides/testing/test-isolation-prevention.md) | Preventing test pollution |

## Reference Documentation

### API Reference

| Document | Purpose |
|----------|---------|
| [WebSocket Events](/docs/reference/api/WEBSOCKET_EVENTS.md) | WebSocket event reference |
| [Payment API](/docs/reference/api/api/PAYMENT_API_DOCUMENTATION.md) | Payment API documentation |
| [Stripe Setup](/docs/reference/api/api/STRIPE_API_SETUP.md) | Stripe integration guide |

### Configuration Reference

| Document | Purpose |
|----------|---------|
| [Environment Variables](/docs/reference/config/ENVIRONMENT.md) | Environment configuration |
| [Auth Roles](/docs/reference/config/AUTH_ROLES.md) | Role definitions |
| [Hardcoded Values](/docs/reference/config/HARDCODED_VALUES_TO_MIGRATE.md) | Values to externalize |
| [Vercel/Render Deployment](/docs/reference/config/VERCEL_RENDER_DEPLOYMENT.md) | Deployment configuration |
| [Vercel/Render Quick Reference](/docs/reference/config/VERCEL_RENDER_QUICK_REFERENCE.md) | Deployment cheatsheet |

### Schema Reference

| Document | Purpose |
|----------|---------|
| [Database Schema](/docs/reference/schema/DATABASE.md) | Database schema reference |

### Testing Reference

| Document | Purpose |
|----------|---------|
| [Test Health](/docs/reference/testing/TEST_HEALTH.md) | Test suite health metrics |

## How-To Guides

### Development

| Guide | Purpose |
|-------|---------|
| [Contributing](/docs/how-to/development/CONTRIBUTING.md) | Contribution guidelines |
| [Development Process](/docs/how-to/development/DEVELOPMENT_PROCESS.md) | Development workflow |
| [Auth Development](/docs/how-to/development/AUTH_DEVELOPMENT_GUIDE.md) | Auth implementation guide |
| [CI/CD Workflows](/docs/how-to/development/CI_CD_WORKFLOWS.md) | CI/CD pipeline guide |
| [Feature Flags](/docs/how-to/development/FEATURE_FLAGS.md) | Feature flag usage |

### Operations

| Guide | Purpose |
|-------|---------|
| [Deployment](/docs/how-to/operations/DEPLOYMENT.md) | Deployment procedures |
| [Deployment Checklist](/docs/how-to/operations/DEPLOYMENT_CHECKLIST.md) | Pre-deployment checklist |
| [Floor Plan Management](/docs/how-to/operations/FLOOR_PLAN_MANAGEMENT.md) | Floor plan configuration |
| [KDS Bible](/docs/how-to/operations/KDS-BIBLE.md) | KDS comprehensive guide |
| [Voice Model Migration](/docs/how-to/operations/VOICE_MODEL_MIGRATION_GUIDE.md) | Voice model updates |
| [Voice Ordering Troubleshooting](/docs/how-to/operations/VOICE_ORDERING_TROUBLESHOOTING.md) | Voice debugging |
| [Production Monitoring](/docs/how-to/operations/monitoring/PRODUCTION_MONITORING.md) | Monitoring setup |

### Runbooks

| Runbook | Purpose |
|---------|---------|
| [Incident Response](/docs/how-to/operations/runbooks/INCIDENT_RESPONSE.md) | Incident handling |
| [Rollback Procedures](/docs/how-to/operations/runbooks/ROLLBACK_PROCEDURES.md) | Rollback steps |
| [Auth Debugging](/docs/how-to/operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md) | Auth issue resolution |
| [Production Deployment Checklist](/docs/how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md) | Production deploy checklist |
| [Production Deployment Plan](/docs/how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_PLAN.md) | Deployment planning |
| [Post Dual Auth Rollout](/docs/how-to/operations/runbooks/POST_DUAL_AUTH_ROLL_OUT.md) | Post-rollout procedures |

### Troubleshooting

| Guide | Purpose |
|-------|---------|
| [Troubleshooting](/docs/how-to/troubleshooting/TROUBLESHOOTING.md) | General troubleshooting |
| [Auth Diagnostic Guide](/docs/how-to/troubleshooting/AUTH_DIAGNOSTIC_GUIDE.md) | Auth issue diagnosis |

## Architecture Documentation

### Architecture Overview

| Document | Purpose |
|----------|---------|
| [Architecture](/docs/explanation/architecture/ARCHITECTURE.md) | System architecture |
| [Authentication Architecture](/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) | Auth system design |
| [Voice Ordering WebRTC](/docs/explanation/architecture/VOICE_ORDERING_WEBRTC.md) | Voice ordering architecture |
| [Auth Flow Diagrams](/docs/explanation/architecture/auth-flow-diagrams.md) | Auth flow visuals |

### Architecture Diagrams

| Diagram | Purpose |
|---------|---------|
| [C4 Context](/docs/explanation/architecture/diagrams/c4-context.md) | System context diagram |
| [C4 Container](/docs/explanation/architecture/diagrams/c4-container.md) | Container diagram |
| [Auth Flow](/docs/explanation/architecture/diagrams/auth-flow.md) | Auth flow diagram |
| [Payment Flow](/docs/explanation/architecture/diagrams/payment-flow.md) | Payment flow diagram |
| [Voice Ordering](/docs/explanation/architecture/diagrams/voice-ordering.md) | Voice ordering diagram |
| [Deployment Pipeline](/docs/explanation/architecture/diagrams/deployment-pipeline.md) | CI/CD pipeline diagram |
| [Migration Workflow](/docs/explanation/architecture/diagrams/migration-workflow.md) | Database migration diagram |
| [Documentation Navigation](/docs/explanation/architecture/diagrams/documentation-navigation.md) | Doc structure diagram |

### Architecture Decision Records (ADRs)

| ADR | Decision |
|-----|----------|
| [ADR-001](/docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md) | Snake case convention |
| [ADR-002](/docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md) | Multi-tenancy architecture |
| [ADR-003](/docs/explanation/architecture-decisions/ADR-003-embedded-orders-pattern.md) | Embedded orders pattern |
| [ADR-004](/docs/explanation/architecture-decisions/ADR-004-websocket-realtime-architecture.md) | WebSocket realtime architecture |
| [ADR-005](/docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md) | Client-side voice ordering |
| [ADR-006](/docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md) | Dual authentication pattern |
| [ADR-007](/docs/explanation/architecture-decisions/ADR-007-per-restaurant-configuration.md) | Per-restaurant configuration |
| [ADR-008](/docs/explanation/architecture-decisions/ADR-008-slug-based-routing.md) | Slug-based routing |
| [ADR-009](/docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md) | Error handling philosophy |
| [ADR-010 (JWT)](/docs/explanation/architecture-decisions/ADR-010-jwt-payload-standards.md) | JWT payload standards |
| [ADR-010 (DB)](/docs/explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md) | Remote database source of truth |
| [ADR-011](/docs/explanation/architecture-decisions/ADR-011-authentication-evolution.md) | Authentication evolution |
| [ADR-012 (Context)](/docs/explanation/architecture-decisions/ADR-012-voice-interaction-pattern-by-context.md) | Voice interaction by context |
| [ADR-012 (State)](/docs/explanation/architecture-decisions/ADR-012-voice-state-machine.md) | Voice state machine |
| [ADR-015](/docs/explanation/architecture-decisions/ADR-015-order-state-machine-enforcement.md) | Order state machine enforcement |
| [ADR-016](/docs/explanation/architecture-decisions/ADR-016-module-system-commonjs.md) | Module system CommonJS |

---

*Last updated: 2025-12-29*
*Aligned with: Compound Engineering North Star*
