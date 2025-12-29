# Risk Register

**Last updated:** 2025-12-28

## Active Risks

### P0 - Launch Blockers

| ID | Risk | Mitigation | Status |
|----|------|------------|--------|
| SEC-001 | Demo user bypass allows full auth bypass | Remove bypass in production or validate against whitelist | Open |
| SEC-002 | localStorage token exposure to XSS | Migrate to HTTPOnly cookies | Open |
| SEC-003 | Weak station secret fallback | Require env var, crash on missing | Open |
| SEC-004 | Missing refund idempotency | Add idempotency key to Stripe calls | Open |
| SEC-005 | Refund without restaurant validation | Enforce restaurant_id check on refunds | Open |
| SEC-006 | KIOSK_JWT_SECRET optional in schema | Make required, fail loudly | Open |
| SEC-007 | PIN_PEPPER weak default | Remove default, require explicit config | Open |
| SEC-008 | Session expiration client-side | Use server JWT `exp` claim only | Open |
| SEC-009 | Webhook idempotency missing | Track processed event IDs in database | Open |

### P1 - High Priority

| ID | Risk | Mitigation | Status |
|----|------|------------|--------|
| SEC-010 | PIN timing attack for user enumeration | Constant-time comparison, fixed response delay | Open |
| SEC-011 | Webhook replay vulnerability | Verify timestamps, reject >5min old | Open |
| SEC-012 | STRICT_AUTH not default | Make STRICT_AUTH default in production | Open |
| SEC-013 | In-memory rate limiting | Migrate to Redis for distributed state | Open |
| SEC-014 | PIN lockout per-user only | Add IP/device-level rate limiting | Open |
| SEC-015 | Weak PIN validation rules | Require 6+ digits, reject patterns | Open |
| SEC-016 | Device fingerprint easily spoofed | Consider hardware-backed keys | Open |
| SEC-017 | Restaurant header fallback | Only allow on explicit public endpoints | Open |

### P2 - Medium Priority

| ID | Risk | Mitigation | Status |
|----|------|------------|--------|
| SEC-018 | PIN attempt counter race condition | Use PostgreSQL atomic increment | Open |
| SEC-019 | No CSRF protection | Add CSRF middleware to sensitive endpoints | Open |
| SEC-020 | Inconsistent rate limit windows | Unify Express/DB rate limiting config | Open |
| SEC-021 | Suspicious activity threshold too high | Reduce threshold from 5-10 to 3-5 | Open |

## Resolved Risks

| ID | Risk | Resolution | Date |
|----|------|------------|------|
| (none yet) | | | |

## Risk Assessment Criteria

- **P0**: Block launch, fix immediately (24 hours)
- **P1**: Fix before production traffic (1 week)
- **P2**: Fix before scale (2-4 weeks)
- **P3**: Nice to have (backlog)

## Source

Risks extracted from hostile enterprise audit conducted 2025-12-28.
Full audit: `audit_output/02_RISK_REGISTER.md`

---

*Aligned with: Compound Engineering North Star*
