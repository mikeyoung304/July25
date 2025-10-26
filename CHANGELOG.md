# Changelog

All notable changes to Restaurant OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.0.11] - 2025-10-24

### Added
- **Payment audit logging infrastructure** - Added `payment_audit_logs` table to production database
  - PCI DSS compliant immutable audit log for all payment transactions
  - Includes payment_audit_summary view for reporting
  - Includes get_payment_stats() function for analytics
  - RLS policies enforce multi-tenancy security
  - Required for payment.service.ts fail-fast compliance checks
  - Migration: 20251023000000_add_payment_audit_logs.sql

### Fixed
- **Payment processing blocker resolved** - payment_audit_logs table missing from production
  - Root cause: Server requires audit logging for PCI compliance (ADR-009, SECURITY.md)
  - Impact: All payments returned HTTP 500 when attempting to log audit entries
  - Solution: Deployed migration directly to production via psql
  - Status: Database ready, Square API configuration needed next

### Notes
- **Next step:** Configure SQUARE_ACCESS_TOKEN in Render (demo or production mode)
- **Payment endpoint:** Still returns 500 until Square credentials configured
- **Security fixes:** Ready to proceed with multi-tenancy and auth vulnerability fixes

## [6.0.10] - 2025-10-23

### Fixed
- **CRITICAL:** Fixed RBAC middleware blocking demo users from payment endpoints
  - Demo users (server, cashier, kitchen, etc.) were getting 403 "No access to this restaurant" errors when attempting to process payments
  - Root cause: RBAC middleware only bypassed database lookup for `customer` and `kiosk_demo` roles, causing other demo roles to fail
  - Solution: Changed bypass logic from role-specific check to ID prefix check - all users with `demo:*` ID format now bypass database lookup
  - Impact: Unblocks all demo user payment flows, fixes server role demo authentication
  - Commit: fecf6d7
  - Files: server/src/middleware/rbac.ts

### Technical Details
**Bug Timeline:**
- **Introduced:** October 18, 2025 (commit 822d3e8)
- **Discovered:** October 23, 2025
- **Fixed:** October 23, 2025
- **Deployed:** October 23, 2025

**Why It Happened:**
Demo users are ephemeral JWT-based sessions that don't exist in the `user_restaurants` database table. The RBAC middleware was attempting to look up demo users in the database, which failed for all roles except `customer` and `kiosk_demo` that had explicit bypass logic.

**The Fix:**
Changed from:
```typescript
if (req.user.role === 'customer' || req.user.role === 'kiosk_demo') {
  // Only these two roles bypass
}
```

To:
```typescript
if (req.user.id?.startsWith('demo:')) {
  // ALL demo users bypass database lookup
  // Authorization still enforced via JWT role scopes
}
```

**Testing:**
- Verified locally with automated test suite
- Production tested after deployment
- Payment endpoint changed from 403 Forbidden → 500 Internal Server Error (confirming RBAC no longer blocking)

## [6.0.9] - 2025-10-23

### Added
- E2E smoke test infrastructure using Playwright
- Production verification test scripts
- Automated test suite for RBAC and authentication flows

### Infrastructure
- Prisma ORM integration for database schema introspection
- CI/CD workflows for migration automation
- Pre-commit hooks for TypeScript validation
- GitHub Actions workflows for deployment automation

### Documentation
- Root cause analysis documentation system
- Production test result tracking
- Comprehensive investigation documentation

---

## Notes

### Deployment Process
- Main branch auto-deploys to Render production environment
- Typical deployment time: 5-10 minutes
- Health check available at: https://july25.onrender.com/health

### Testing
- Local tests: `npm test`
- Production tests: `./scripts/test-production-flows.sh`
- E2E tests: `npm run test:e2e`
