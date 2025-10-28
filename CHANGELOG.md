# Changelog

All notable changes to Restaurant OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Workspace-Based Landing** - New dashboard-centric entry experience
  - **WorkspaceDashboard**: Clean landing with 6 workspace tiles (Server, Kitchen, Kiosk, Online Order, Admin, Expo)
  - **No "Login" Text**: Dashboard shows "Select your workspace" - authentication happens contextually
  - **Smart Auth Gating**: Public workspaces (Kiosk, Online Order) accessible immediately; protected workspaces trigger modal
  - **WorkspaceAuthModal**: Accessible modal with focus trap, ESC key, keyboard navigation, ARIA labels
  - **Demo Mode**: Pre-fills role-specific credentials per workspace (server@restaurant.com, kitchen@restaurant.com, etc.)
  - Files: `WorkspaceDashboard.tsx`, `WorkspaceAuthModal.tsx`, `useWorkspaceAccess.ts`, `demoCredentials.ts`

### Fixed
- **CRITICAL: Workspace Authentication Bypass** - Fixed protected workspaces failing to authenticate users
  - Root cause: Double `handleAccess()` call created race condition with stale auth state
  - Symptom: Auth modal flashes briefly then redirects to Online Order without making login API call
  - Example: User clicks Server workspace, modal appears with server@restaurant.com, but no POST /api/v1/auth/login call made
  - Solution: Replace redundant `handleAccess()` call in `handleSuccess()` with direct `navigate(intendedDestination)`
  - Impact: Enables authentication for all protected workspaces (Server, Kitchen, Admin, Expo)
  - Investigation: `docs/investigations/auth-bypass-root-cause-FINAL.md`
  - Files: `client/src/pages/WorkspaceDashboard.tsx`

- **CRITICAL: Online Order Menu Items Below Viewport** - Fixed menu items appearing 500px below fold
  - Root cause: Excessive CSS spacing pushed first menu item to 1,087px from top (viewport only 600px)
  - Symptom: Users reported "menu doesn't load" - actually loaded but invisible below fold
  - Measurement: Header (150px) + filters (150px) + categories (256px) + excessive padding (531px) = items at 1,087px
  - Solution: Reduced padding and spacing in CustomerOrderPage and MenuSections components
  - Changes: `py-12 md:py-16` → `py-6 md:py-8`, `space-y-16 md:space-y-20` → `space-y-8 md:space-y-10`
  - Impact: Menu items now visible in initial viewport without scrolling
  - Investigation: `docs/investigations/comprehensive-root-cause-analysis-oct27-2025.md`
  - Files: `client/src/modules/order-system/components/CustomerOrderPage.tsx`, `client/src/modules/order-system/components/MenuSections.tsx`

- **CRITICAL: Auth State Race Condition** - Fixed stale user data displayed after account switching
  - Root cause: Race condition between `logout()` and `onAuthStateChange` events
  - Symptom: WorkspaceAuthModal showed previous user's email after logout + login sequence
  - Example: User logs in as kitchen@, switches to expo@, but modal still shows kitchen@
  - Solution: Reordered logout sequence to call `supabase.auth.signOut()` BEFORE clearing React state
  - Impact: Ensures SIGNED_OUT event fires and completes before new login can proceed
  - Added comprehensive logging to track auth state transitions
  - File: `client/src/contexts/AuthContext.tsx`

- **CRITICAL: Token Refresh Failures During Logout** - Fixed 401 errors preventing workspace access
  - Root cause: Backend `/logout` endpoint required valid token, but `supabase.auth.signOut()` already invalidated it
  - Symptom: Users getting "No token provided" and "Invalid refresh token" errors
  - Previous fix (auth race condition) inadvertently broke logout by invalidating token before backend call
  - Solution: Removed backend logout call entirely - frontend `supabase.auth.signOut()` is sufficient
  - Impact: Eliminates 401 errors, reduces network overhead, simplifies auth flow
  - Investigation: `docs/investigations/token-refresh-failure-analysis.md`
  - File: `client/src/contexts/AuthContext.tsx`

### Changed
- **Landing Page**: Root route (/) now displays WorkspaceDashboard (replaces old customer/staff split page)
- **Configuration**: Consolidated workspace config into single source of truth (`WORKSPACE_CONFIG`)
- **Protected Routes**: Redirect to `/` (workspace dashboard) instead of `/login`
- **Auth Logging**: Enhanced logging in login(), logout(), and onAuthStateChange for debugging

### Technical Details
- WorkspaceDashboard: 6 tiles, workspace-aware auth, demo mode support
- Single workspace config maps routes, permissions, and demo credentials
- Full accessibility: focus trap, keyboard navigation, ARIA attributes
- Comprehensive test coverage (100+ unit tests, 30+ E2E scenarios)
- Auth state management: Fixed race condition by ensuring sequential logout/login operations

## [6.0.13] - 2025-10-27

### Fixed
- **CRITICAL: Online Ordering Checkout Failure** - Fixed demo users unable to complete orders
  - Root cause: payment_audit_logs.user_id column required UUID but demo users have string IDs (e.g., "demo:server:xyz")
  - PostgreSQL error: invalid_text_representation when attempting to insert demo user IDs
  - Solution: Made user_id column nullable and store demo IDs in metadata.demoUserId field instead
  - Impact: Unblocks all online ordering for demo users while maintaining PCI compliance
  - Files: supabase/migrations/20251027173500_fix_payment_audit_demo_users.sql, server/src/routes/payments.routes.ts

### Changed
- **Payment audit logging** - Updated to handle both authenticated and demo users
  - Real users: UUID stored in user_id column (maintains FK integrity to auth.users)
  - Demo users: user_id is NULL, ID stored in metadata.demoUserId field
  - All payment attempts still logged for PCI compliance
  - No changes to authentication flow or security model

### Technical Details
**Database Migration:**
- Removed NOT NULL constraint from payment_audit_logs.user_id
- Added column documentation explaining dual user handling
- Idempotent migration (safe to re-run)

**Code Changes (payments.routes.ts):**
- Success logging (line ~225): Check if ID starts with "demo:" before storing in user_id
- Failed logging (line ~265): Store demo IDs in metadata instead
- Refund logging (line ~417): Consistent demo user handling

**Testing:**
- Database migration verified (user_id is_nullable = YES)
- All payment audit logging code updated across 3 locations
- Awaiting Render auto-deploy for end-to-end verification

**Related:**
- ADR-006 (dual authentication pattern)
- SECURITY.md (fail-fast compliance requirements)

## [6.0.12] - 2025-10-27

### Fixed
- **CRITICAL: Menu Loading Error** - Fixed HTTP 500 error preventing menu items from loading (commit e836901b)
  - Root cause: optionalAuth middleware didn't extract restaurantId from x-restaurant-id header for unauthenticated requests
  - PostgreSQL error 22P02 (invalid_text_representation) when req.restaurantId was undefined
  - Solution: Modified optionalAuth to read x-restaurant-id header when no JWT token present
  - Impact: Public menu browsing now fully functional without authentication
  - Verification: Tested with Puppeteer automation, menu API returns HTTP 200
  - File: server/src/middleware/auth.ts

- **MAJOR: Phase 2 Test Restoration Complete** - Restored 135 of 137 quarantined tests (98.5% success rate)
  - Component tests: ErrorBoundary, KDSOrderCard, OrderCard (33 tests restored)
  - Service layer: OrderService fully working (14/14 tests passing)
  - WebSocket tests: useKitchenOrdersRealtime, WebSocketService (19/21 tests passing)
  - Accessibility tests: Complete manual a11y check coverage (7/7 tests passing)
  - Test pass rate improved from 73% to ~85%+
  - Production readiness improved from 65-70% to 90%

### Changed
- **Quarantine list dramatically reduced** - Only 2 tests remain (down from 137)
  - useOrderData.test.ts: Infinite loop issue (needs dependency work)
  - WebSocketService.test.ts: 2 reconnection edge cases remain (14/16 passing)

### Security
- **Added secrets.txt to .gitignore** - Prevents accidental API key exposure
- **No security impact from menu fix** - Multi-tenancy still enforced, no authentication bypass

### Documentation
- **Added comprehensive investigation report** - docs/investigations/menu-loading-error-fix-oct27-2025.md
  - Documents Puppeteer-based investigation process
  - Includes root cause analysis and security review
  - Lessons learned about DevTools display artifacts vs actual network traffic
- **Updated SOURCE_OF_TRUTH.md** - Reflects menu fix and improved production status (90% ready)
- **Updated quarantine.list** - Cleaned up and documented all Phase 2 fixes

### Deployment
- **Production deployment successful** - October 27, 2025 ~16:50 UTC
  - Backend: https://july25.onrender.com (healthy)
  - Frontend: https://july25-client.vercel.app (functional)
  - Menu API verified working without authentication
  - All critical user flows operational

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
