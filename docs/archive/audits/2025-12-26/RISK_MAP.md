# Risk Map: rebuild-6.0 Codebase

This document categorizes all major code surfaces by risk level to guide safe automation and change management.

**Legend:**
- **HIGH**: Plan-only changes - require human review, no unattended modifications
- **MEDIUM**: Careful changes - require testing validation, limited automation
- **LOW**: Safe for automation - eligible for unattended diffs with standard validation

---

## HIGH RISK - Plan Only (No Unattended Changes)

### 1. Authentication & Authorization

| Path | Risk | Justification |
|------|------|---------------|
| `server/src/routes/auth.routes.ts` | HIGH | JWT generation, PIN/email/station login, token refresh. Security-critical credential handling. |
| `server/src/middleware/auth.ts` | HIGH | JWT verification, STRICT_AUTH enforcement, WebSocket auth. Core security boundary. |
| `server/src/middleware/rbac.ts` | HIGH | Role-based access control, scope validation, permission boundaries. |
| `server/src/middleware/authRateLimiter.ts` | HIGH | Brute-force protection, suspicious activity detection. |
| `server/src/middleware/restaurantAccess.ts` | HIGH | Multi-tenant isolation enforcement. |
| `server/src/services/auth/` | HIGH | PIN hashing, station token generation, credential storage. |
| `client/src/contexts/AuthContext.tsx` | HIGH | Client-side session management, token storage, dual-auth pattern (ADR-006). |
| `client/src/services/http/httpClient.ts` | HIGH | Auth header injection, token retrieval from Supabase/localStorage. |

**Why HIGH:** Authentication code directly controls access to the entire system. A single bug can expose all customer data, allow unauthorized payments, or enable complete system takeover.

---

### 2. Payment Processing

| Path | Risk | Justification |
|------|------|---------------|
| `server/src/routes/payments.routes.ts` | HIGH | Stripe integration, payment intent creation, refunds, webhooks. Financial transactions. |
| `server/src/services/payment.service.ts` | HIGH | Server-side amount validation, idempotency keys, audit logging. PCI compliance. |
| `server/src/routes/webhook.routes.ts` | HIGH | External payment webhook handling, signature verification. |
| `server/src/middleware/webhookSignature.ts` | HIGH | HMAC signature verification for webhooks. |
| `client/src/services/payments/PaymentStateMachine.ts` | HIGH | Client-side payment flow state management. |

**Why HIGH:** Payment code handles real money. Double-charging, refund failures, or audit log gaps have direct financial and legal consequences.

---

### 3. Database Migrations

| Path | Risk | Justification |
|------|------|---------------|
| `supabase/migrations/*.sql` | HIGH | Schema changes, RLS policies, stored procedures. Irreversible in production. |
| `supabase/migrations/20251202_comprehensive_rls.sql` | HIGH | Row Level Security policies - core multi-tenant isolation. |
| `supabase/migrations/20251023000000_add_payment_audit_logs.sql` | HIGH | Payment audit table - compliance requirement. |

**Why HIGH:** Database migrations are irreversible in production. RLS policy errors can expose tenant data across restaurants.

---

### 4. Realtime & Voice Ordering

| Path | Risk | Justification |
|------|------|---------------|
| `server/src/routes/realtime.routes.ts` | HIGH | OpenAI API integration, ephemeral token generation, voice session config. |
| `server/src/routes/voiceConstants.ts` | HIGH | Voice AI configuration constants affecting behavior. |
| `client/src/services/websocket/WebSocketService.ts` | HIGH | Real-time connection management, first-message auth, reconnection logic. |
| `client/src/services/websocket/orderUpdates.ts` | HIGH | Live order synchronization. |
| `server/src/utils/websocket.ts` | HIGH | WebSocket server utilities, broadcast functions. |

**Why HIGH:** Real-time code affects live kitchen operations. Voice ordering involves third-party AI API costs and potential prompt injection risks.

---

### 5. Deployment Configuration

| Path | Risk | Justification |
|------|------|---------------|
| `vercel.json` | HIGH | Client deployment config, security headers, rewrites. |
| `.github/workflows/deploy-*.yml` | HIGH | CI/CD pipelines, production deployments. |
| `.github/workflows/security.yml` | HIGH | Security scanning configuration. |
| `.github/workflows/migration-integration.yml` | HIGH | Database migration CI. |
| `server/package.json` (scripts) | HIGH | Server build and start commands. |

**Why HIGH:** Deployment misconfigurations can cause downtime, security header omissions, or expose development endpoints.

---

### 6. Security Middleware

| Path | Risk | Justification |
|------|------|---------------|
| `server/src/middleware/security.ts` | HIGH | CSP headers, XSS detection, SQL injection detection, security monitoring. |
| `server/src/middleware/security-headers.ts` | HIGH | HTTP security headers. |
| `server/src/middleware/rateLimiter.ts` | HIGH | DDoS protection, rate limiting. |
| `server/src/middleware/requestSanitizer.ts` | HIGH | Input sanitization. |

**Why HIGH:** Security middleware is the first line of defense. Bypasses enable injection attacks, DDoS, or data exfiltration.

---

## MEDIUM RISK - Careful Changes Required

### 7. Order Processing

| Path | Risk | Justification |
|------|------|---------------|
| `server/src/routes/orders.routes.ts` | MEDIUM | Order CRUD operations, voice order processing. |
| `server/src/services/orders.service.ts` | MEDIUM | Order creation with tax calculation, optimistic locking, WebSocket broadcasts. |
| `server/src/services/orderStateMachine.ts` | MEDIUM | Order status transitions, validation rules. |
| `server/src/services/scheduledOrders.service.ts` | MEDIUM | Scheduled order firing logic. |

**Why MEDIUM:** Order processing involves financial calculations and state machine logic. Errors affect operations but don't directly compromise security.

---

### 8. Menu Management

| Path | Risk | Justification |
|------|------|---------------|
| `server/src/routes/menu.routes.ts` | MEDIUM | Menu CRUD operations. |
| `server/src/services/menu.service.ts` | MEDIUM | Menu data retrieval with caching. |
| `server/src/services/voice-config.service.ts` | MEDIUM | Voice AI menu context generation. |

**Why MEDIUM:** Menu changes affect customer-facing data and voice ordering accuracy.

---

### 9. Table Management

| Path | Risk | Justification |
|------|------|---------------|
| `server/src/routes/tables.routes.ts` | MEDIUM | Table CRUD and status updates. |
| `server/src/services/table.service.ts` | MEDIUM | Table state management. |

**Why MEDIUM:** Table state affects service operations but has less financial/security impact.

---

### 10. Client Contexts & State

| Path | Risk | Justification |
|------|------|---------------|
| `client/src/contexts/RoleContext.tsx` | MEDIUM | Client-side role management. |
| `client/src/contexts/UnifiedCartContext.tsx` | MEDIUM | Shopping cart state, local total calculations. |

**Why MEDIUM:** State management bugs cause UX issues but client-side calculations are validated server-side.

---

### 11. API Validation

| Path | Risk | Justification |
|------|------|---------------|
| `server/src/middleware/validation.ts` | MEDIUM | Request body validation. |
| `server/src/middleware/validate.ts` | MEDIUM | Schema validation middleware. |
| `server/src/middleware/fileValidation.ts` | MEDIUM | File upload validation. |
| `shared/contracts/*.ts` | MEDIUM | API contract definitions (Zod schemas). |

**Why MEDIUM:** Validation logic prevents bad data but validation bypass doesn't directly cause security issues if backend services also validate.

---

## LOW RISK - Eligible for Unattended Changes

### 12. Pure Documentation

| Path | Risk | Justification |
|------|------|---------------|
| `docs/**/*.md` | LOW | Documentation files - no code execution. |
| `.claude/lessons/*.md` | LOW | Lessons learned documentation. |
| `*.md` (root level) | LOW | README, CHANGELOG, contributing guides. |
| `CLAUDE.md` | LOW | AI assistant instructions. |

**Eligible for unattended diffs:** Yes, with link validation.

---

### 13. Test Files

| Path | Risk | Justification |
|------|------|---------------|
| `**/*.test.ts` | LOW | Test files don't affect production. |
| `**/*.test.tsx` | LOW | Component tests. |
| `**/__tests__/**` | LOW | Test directories. |
| `**/__mocks__/**` | LOW | Mock files for tests. |
| `e2e/**/*.spec.ts` | LOW | E2E test specs. |
| `playwright.config.ts` | LOW | E2E test configuration. |
| `vitest.config.ts` | LOW | Unit test configuration. |

**Eligible for unattended diffs:** Yes, with test suite validation (must pass).

---

### 14. Linting & Formatting

| Path | Risk | Justification |
|------|------|---------------|
| `.eslintrc.*` | LOW | Linting configuration. |
| `.prettierrc` | LOW | Formatting configuration. |
| `tsconfig*.json` | LOW | TypeScript configuration (with care for strictness changes). |

**Eligible for unattended diffs:** Yes, with type-check validation.

---

### 15. Code Comments & Logging

| Path | Risk | Justification |
|------|------|---------------|
| JSDoc comments | LOW | Documentation comments. |
| `logger.*` calls | LOW | Logging statements (message-only changes). |
| `// TODO:` comments | LOW | Code annotations. |

**Eligible for unattended diffs:** Yes.

---

### 16. Client UI Components (Presentational)

| Path | Risk | Justification |
|------|------|---------------|
| `client/src/components/ui/**` | LOW | Reusable UI primitives. |
| CSS/Tailwind classes | LOW | Styling changes. |
| Component prop types | LOW | TypeScript interfaces for props. |

**Eligible for unattended diffs:** Yes, with visual regression testing.

---

### 17. Unused Code Removal

| Path | Risk | Justification |
|------|------|---------------|
| Dead code (high confidence) | LOW | Unreachable code paths. |
| Unused imports | LOW | Import cleanup. |
| Deprecated exports (no references) | LOW | Export cleanup. |

**Eligible for unattended diffs:** Yes, with static analysis confirmation (0 references).

---

## Special Considerations

### Multi-Tenancy Critical Paths

The following code MUST always filter by `restaurant_id`:

```
server/src/services/*.ts      - All service methods
server/src/routes/*.ts        - All route handlers
supabase/migrations/*.sql     - RLS policies
```

**Validation Required:** Any change to these files must verify `restaurant_id` filtering is preserved.

---

### Environment Variable Dependencies

| Variable | Used In | Risk |
|----------|---------|------|
| `SUPABASE_JWT_SECRET` | auth.ts, auth.routes.ts | HIGH - Auth fails without it |
| `STRIPE_SECRET_KEY` | payments.routes.ts | HIGH - Payments fail |
| `STRIPE_WEBHOOK_SECRET` | payments.routes.ts | HIGH - Webhook verification |
| `OPENAI_API_KEY` | realtime.routes.ts | HIGH - Voice ordering fails |
| `KIOSK_JWT_SECRET` | auth.ts | HIGH - Kiosk auth fails |
| `STRICT_AUTH` | auth.ts | HIGH - Security mode toggle |

---

### Cross-Cutting Concerns

| Pattern | Files Affected | Risk |
|---------|---------------|------|
| snake_case convention | All API routes, DB queries | MEDIUM - ADR-001 violation |
| Dual-auth pattern | httpClient.ts, AuthContext.tsx, auth.ts | HIGH - ADR-006 |
| Remote-first DB | prisma/, migrations/ | HIGH - ADR-010 |

---

## Change Decision Matrix

| Change Type | Risk Level | Automation Eligible | Required Validation |
|-------------|------------|---------------------|---------------------|
| Auth/Security code | HIGH | No | Manual review + security audit |
| Payment code | HIGH | No | Manual review + PCI checklist |
| Migrations | HIGH | No | Manual review + rollback plan |
| Realtime/Voice | HIGH | No | Manual review + cost analysis |
| Deploy config | HIGH | No | Manual review + staging test |
| Order processing | MEDIUM | Limited | Tests + review |
| Menu/Table APIs | MEDIUM | Limited | Tests + review |
| Documentation | LOW | Yes | Link validation |
| Test files | LOW | Yes | Test suite must pass |
| Lint/Format | LOW | Yes | Type-check must pass |
| UI components | LOW | Yes | Visual regression |
| Comments | LOW | Yes | None |

---

## Quick Reference

### Never Auto-Merge
- `server/src/routes/auth.routes.ts`
- `server/src/routes/payments.routes.ts`
- `server/src/middleware/auth.ts`
- `server/src/middleware/rbac.ts`
- `supabase/migrations/*.sql`
- `.github/workflows/deploy-*.yml`
- Any file with `JWT`, `SECRET`, `TOKEN`, or `STRIPE` in content

### Safe for Auto-Merge (with validation)
- `docs/**/*.md`
- `**/*.test.ts(x)`
- JSDoc/TSDoc comments
- Unused import removal
- Logging message updates
- CSS/Tailwind changes

---

*Generated: 2025-12-26*
*Codebase Version: v6.0.14*
