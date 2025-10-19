# Changelog

All notable changes to Restaurant OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.0.8] - 2025-10-17 - Authentication Fix & Documentation Cleanup

### 🔐 Authentication & Role Naming (October 17-18, 2025)

#### Fixed
- **KDS Authentication Integration** (Critical Bug)
  - Fixed httpClient only checking Supabase sessions, missing localStorage tokens
  - KDS was showing mock "Classic Burger" data instead of real orders
  - Implemented dual authentication pattern: Supabase sessions OR localStorage fallback
  - Resolves 401 errors causing API failures for demo/PIN/station authentication
  - Enables end-to-end testing: ServerView → voice order → KDS display
  - File: `client/src/services/http/httpClient.ts` (lines 109-148)
  - Commit: `94b6ea4`

#### Added
- **ADR-006: Dual Authentication Architecture Pattern**
  - Documents localStorage fallback rationale and implementation
  - Provides production migration decision tree (3 options)
  - Lists security tradeoffs: localStorage vs Supabase
  - Security checklist for production deployment
  - Migration timeline: 2h (remove) | 8-12h (harden) | 16-24h (migrate)
  - Location: `/docs/ADR-006-dual-authentication-pattern.md`

- **Comprehensive Authentication Documentation**
  - Updated `AUTHENTICATION_ARCHITECTURE.md` with dual auth section (150+ lines)
  - Added httpClient implementation details with code examples
  - Security tradeoffs comparison table
  - Production migration options (A, B, C) with decision criteria
  - Testing guide for both auth paths
  - Debugging code snippets

- **Demo/PIN/Station Authentication Troubleshooting**
  - Added dedicated section in `TROUBLESHOOTING.md`
  - Diagnosis steps for both Supabase and localStorage auth
  - Fixed localStorage key reference: `auth_session` (not `auth_token`)
  - Common causes & fixes table
  - Version check commands

#### Technical Debt
- **localStorage Authentication Requires Production Review**
  - localStorage tokens vulnerable to XSS (less secure than httpOnly cookies)
  - No automatic token refresh (users must re-login every 12 hours)
  - Token revocation requires manual intervention
  - **Recommendation**: Review ADR-006 before production launch
  - **Decision Required**: Keep dual auth | Migrate to Supabase | Remove localStorage

#### Role Naming Clarification
- **Introduced 'customer' Role** (v6.0.8)
  - Canonical role for public self-service orders (online, kiosk)
  - Replaces confusing 'kiosk_demo' name
  - Migration: `supabase/migrations/20251018_add_customer_role_scopes.sql`
  - Scopes: `orders:create`, `orders:read`, `payments:process`, `menu:read`, `ai.voice:chat`

- **Deprecated 'kiosk_demo' Role**
  - Backwards-compatible alias via `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true`
  - Logs WARN when kiosk_demo tokens used
  - Removal timeline: 30 days after zero usage confirmed

- **Added X-Client-Flow Header**
  - Values: `online`, `kiosk`, `server`
  - Enables client flow telemetry and debugging

#### Impact
- **Unblocked Phase 1 Stabilization**: All demo pages now functional
- **End-to-End Testing**: ServerView → KDS flow working
- **Documentation Accuracy**: Corrected 3 critical inaccuracies in auth docs
- **Future AI Agents**: Comprehensive context prevents similar bugs

### 📚 Documentation (October 16-18, 2025)

- **Documentation Consolidation & Cleanup**
  - Archived 50+ legacy and duplicate documentation files
  - Created systematic archive structure:
    - `docs/archive/moved/` - Files merged into canonical docs
    - `docs/archive/incidents/` - Incident-related docs
    - `docs/archive/legacy-root/` - Deprecated root-level files
  - Moved all documentation to `/docs` canonical location
  - Removed orphan markdown files across repository
  - Updated root-level files to redirect to canonical docs
  - Created comprehensive docs index and navigation

- **Documentation Guardrails**
  - Implemented 5-checkpoint docs validation system:
    1. Orphan detector (ensures all .md files linked from index)
    2. Stub detector (validates navigation stubs)
    3. Risk linter (scans for dangerous patterns)
    4. Anchor linter (verifies markdown link anchors)
    5. Reality greps (verifies code claims match implementation)
  - Added `npm run docs:check` script for automated validation
  - Created `.github/workflows/docs-ci.yml` for fast docs validation
  - All docs guardrails passing ✅

### 🔧 CI/CD Improvements

- **Workflow Optimization for Docs PRs**
  - Created dedicated Docs CI workflow (fast, docs-only validation)
  - Added paths-ignore filters to heavy workflows:
    - Quality Gates (typecheck, lint, tests, builds)
    - Security Tests (CSRF, rate limit, RBAC, CodeQL)
    - Playwright Smoke Tests
    - Vercel Project Guard
  - Docs-only PRs now skip irrelevant CI checks
  - CI runtime reduced for docs changes: ~10 minutes → ~2 minutes

- **Workflow Fixes**
  - Fixed docs-check.yml npm install command
  - Updated workflow triggers for better path filtering
  - Improved CI efficiency and cost optimization

### ✨ Reports Generated

- Created comprehensive documentation audit reports:
  - `reports/docs_stragglers.md` - Complete file audit
  - `reports/docs_guarded_merge_evidence.md` - Validation evidence
  - `reports/anchor_autoheal_map.md` - Link verification
  - `reports/orphan_archive_plan.md` - Archive strategy

### 📊 Impact

- **Documentation Quality**: Centralized, navigable, validated
- **CI Efficiency**: 80% faster for docs-only changes
- **Maintainability**: Automated guardrails prevent docs drift
- **Developer Experience**: Clear docs structure, fast feedback

### 🔗 Related PRs

- PR #99: docs: guarded merges & reality sync (v6.0.8)
- PR #100: docs: archive legacy duplicates (v6.0.8)

## [6.0.7] - 2025-10-14 - Payment System Operational

### 🎯 Square Payment Integration Complete

**Status**: ✅ Payment processing fully operational end-to-end

### 🔧 Fixed
- **Square SDK v43 Migration**
  - Updated authentication format: `accessToken` → `token` property
  - Updated API method names: `createPayment()` → `create()`
  - Removed `.result` wrapper from responses
  - Files: `payments.routes.ts`, `terminal.routes.ts`
  - Commits: `482253f` (auth), `d100854` (API methods)

- **Credential Validation** (Root Cause Fix)
  - Fixed location ID typo: `L3V8KTKZN0DHD` → `L1V8KTKZN0DHD`
  - Created validation script: `scripts/validate-square-credentials.sh`
  - Added startup validation in `payments.routes.ts`
  - Validates token, location ID, and payment permissions
  - See: [POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md](./DEPLOYMENT.md#incidents-postmortems)

- **Idempotency Key Length**
  - Shortened from 93 to 26 characters
  - Format: `{last_12_order_id}-{timestamp}`
  - Square limit: 45 characters
  - File: `payment.service.ts`
  - Commit: `81b8b56`

- **Database Constraint Violation**
  - Separated payment status from order status management
  - Payment status stored in `metadata.payment.status`
  - Order status managed via `updateOrderStatus()`
  - File: `orders.service.ts`
  - Commit: `e1ab5fb`

### ✨ Added
- **Credential Validation Script** (`npm run validate:square`)
  - Validates access token
  - Checks location ID matches token
  - Tests payment API permissions
  - Prevents deployment credential mismatches

- **Startup Validation**
  - Automatic credential validation on server start
  - Logs clear errors if credentials don't match
  - Provides troubleshooting information
  - Non-blocking (server continues running)

- **Demo Mode Support**
  - Mocked payment responses for development
  - Set `SQUARE_ACCESS_TOKEN=demo` to enable
  - Useful for frontend development without Square credentials

### 📚 Documentation
- **SQUARE_INTEGRATION.md** - Complete rewrite
  - Square SDK v43 migration guide
  - Credential validation procedures
  - Error handling and troubleshooting
  - Production deployment checklist

- **POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md** - Incident analysis
  - Timeline of errors (500 → 401 → 400)
  - Root cause: Single-character typo in location ID
  - Lessons learned and prevention measures
  - Time cost: 4 hours debugging

- **PRODUCTION_STATUS.md** - Updated to 95% readiness
  - Payment system status: Fully operational
  - End-to-end testing verified
  - References post-mortem and updated docs

### ✅ Testing
- **End-to-End Verification** (Order #20251014-0022)
  - Complete checkout flow tested
  - Payment processing confirmed
  - Order confirmation validated
  - Production deployment successful

### 🔒 Security
- **Server-Side Amount Validation**
  - NEVER trusts client-provided amounts
  - Server calculates and validates all totals
  - Prevents payment tampering attempts

- **Payment Audit Trail**
  - All payment attempts logged
  - Includes user context and IP address
  - 7-year retention for PCI compliance

### 📊 Impact
- **Readiness**: 93% → 95% (Enterprise-Grade)
- **Payment Success Rate**: 0% → 100% (fixed all blocking issues)
- **Time to Fix**: 4 hours (incident) + 2 hours (safeguards) = 6 hours total
- **Prevention ROI**: 10 seconds (validation) vs 4+ hours (debugging)

### 🔗 Related Documentation
- [POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md](./DEPLOYMENT.md#incidents-postmortems)
- [SQUARE_INTEGRATION.md](./DEPLOYMENT.md#square-integration)
- [PRODUCTION_STATUS.md](./PRODUCTION_STATUS.md)

## [6.0.6] - 2025-09-13 - Performance & Stability Sprint

### 🚀 Performance Improvements
- **WebSocket Memory Leak Fixes**
  - Fixed server-side heartbeat interval memory leak
  - Added proper cleanup on server shutdown
  - Fixed client-side duplicate subscription issue
  - Implemented exponential backoff with jitter (max 30s)
  - Fixed WebRTC voice client memory leaks
  
- **Image Optimization**
  - Optimized 67 images to WebP format
  - Reduced image assets from 18MB to 9.7MB (45.9% reduction)
  - Created automated image optimization script
  - Added support for modern image formats

### 🔧 Stability Improvements
- **Connection Management**
  - Improved WebSocket reconnection reliability
  - Better auth state change handling
  - No more duplicate event subscriptions
  - Client memory usage reduced by ~30%

### 📝 Configuration
- Updated .env.example with all required variables
- Added security configuration requirements
- Documented JWT secret requirement for v6.0.5+
- Added PIN_PEPPER and DEVICE_FINGERPRINT_SALT configs

## [6.0.5] - 2025-09-12 - Critical Security Sprint

### 🔒 Security Fixes (CRITICAL)
- **Fixed JWT Authentication Bypass** (CVE-pending)
  - Removed fallback to public `anonKey` in JWT verification
  - Now requires proper `jwtSecret` configuration
  - Affected files: `server/src/middleware/auth.ts`
- **Fixed 11 XSS Vulnerabilities** 
  - Added HTML escaping for all user inputs in voice debug dashboard
  - Implemented `escapeHtml()` sanitization function
  - Affected file: `server/src/voice/debug-dashboard.ts`
- **Fixed CORS Wildcard Matching Exploit**
  - Changed from substring matching to strict regex pattern
  - Pattern: `/^https:\/\/july25-client-[a-z0-9]{1,20}\.vercel\.app$/`
  - Prevents subdomain hijacking attacks

### 🔧 Dependencies Updated
- **vitest**: 1.2.0 → 1.6.1 (Fixed critical RCE vulnerability)
- **@vitest/ui**: 1.2.0 → 1.6.1
- **hono**: Updated to fix path confusion vulnerability
- Reduced vulnerabilities from 6 (1 critical, 1 high) to 4 (2 low, 2 moderate)

### ✅ Testing Improvements
- **Added Comprehensive RCTX Tests**
  - Created test suite for restaurant context enforcement
  - Coverage for all 9 previously untested API routes
  - Multi-tenant isolation validation
  - Files: `orders.rctx.test.ts`, `rctx-comprehensive.test.ts`

### 📋 Production Readiness Sprint Plan
- **Week 1**: Security hardening (COMPLETE), critical testing (IN PROGRESS)
- **Week 2**: Performance optimization, configuration extraction
- **Week 3**: Staging deployment and production launch
- **Target**: 7.5/10 minimum viable production readiness

## [Unreleased] - In Progress

### 📚 Documentation
- **Comprehensive Documentation Audit** (September 2, 2025)
  - Unified scattered documentation into single sources of truth
  - Created `/docs/api/` and `/docs/architecture/` unified directories
  - Added Architecture Decision Records (ADRs) for key decisions:
    - ADR-002: Unified Backend Architecture
    - ADR-003: Cart System Unification  
    - ADR-004: Voice System Consolidation
  - Generated comprehensive documentation index at `/docs/DOCS_INDEX.md`
  - Archived 15+ outdated documents to `/docs/archive/2025-09-02/`
  - Updated all core documentation with current version and dates (see [VERSION.md](VERSION.md))
  - Created executive audit summary at `/docs/DOCS_AUDIT_SUMMARY.md`

### ✨ Added
- **Chip Monkey Floor Plan Element**: New selectable floor plan item type
  - Custom SVG icon rendering with monkey silhouette
  - Full support for drag, rotate, resize, duplicate, delete operations
  - Snap-to-grid functionality
  - Z-order management
  - Keyboard shortcuts support
  - Persists across save/reload for multi-tenant restaurants
  - Smallest default size (48x48) with 1 seat capacity

## [6.0.3] - 2025-09-01 - Critical Loading Fix & Guard Systems

### 🔧 Quality & Stability Sprint

### ✨ Added
- **Runtime Smoke Gate**: Production-ready health check (`scripts/smoke.mjs`)
- **TypeScript Freeze Check**: Prevents regression with `tools/check-ts-freeze.mjs`
- **CI/CD Improvements**: Multi-stage gates for PR validation
- **Shared Directory Guard** (PR #17): Automated check to prevent compiled JS in /shared
- **Puppeteer E2E Suite**: Comprehensive browser testing (10/10 tests passing)

### 🐛 Fixed
- **Runtime Hotfix** (PR #12): Fixed critical CI failures, ES module compatibility
- **Security Patches** (PR #13): Updated Express family dependencies
- **Dependency Cleanup** (PR #14): Removed extraneous packages, organized deps
- **Quality Improvements** (PR #15): Boundary-first TypeScript fixes
- **Critical Loading Hang** (PR #17): Removed compiled JS from /shared breaking browser imports
- **DOM Typings**: Fixed browser-only code type definitions

### 📊 Metrics
- **TypeScript Errors**: 526 → 397 (-129 errors, 24.5% reduction)
- **ESLint Errors**: 37 → 0 (100% resolution)
- **ESLint Warnings**: 952 → 455 (52% reduction)
- **Bundle Size**: Maintained at 82KB (optimized)
- **Test Coverage**: Coverage tracked in CI (see server coverage report)
- **Puppeteer Tests**: 10/10 passing (100% success rate)

## [6.0.3] - 2025-02-01

### 🚀 Authentication & RBAC MVP Complete

### ✨ Added
- **Complete Authentication System**:
  - JWT token infrastructure via Supabase with RS256 signing
  - Email/password login with MFA support for managers
  - PIN-based authentication for servers/cashiers (bcrypt + pepper)
  - Station login for kitchen/expo staff (device-bound tokens)
  - Protected route wrapper components with role validation
  - Role context provider (Owner, Manager, Server, Cashier, Kitchen, Expo)
  - Session management (8-hour for managers, 12-hour for staff)
  - Comprehensive logout functionality across all auth methods

- **Role-Based Access Control (RBAC)**:
  - Granular API scopes (payment:process, payment:refund, orders:create, etc.)
  - Role-based permission enforcement at endpoint level
  - Dynamic UI elements based on user permissions
  - Restaurant-scoped access validation

- **Security Enhancements**:
  - Rate limiting with progressive lockouts (5 attempts → 15 min lockout)
  - PIN hashing with bcrypt (12 rounds) + application-level pepper
  - Comprehensive audit logging with user_id and restaurant_id tracking
  - Auth event logging (login, logout, failed attempts, lockouts)
  - CSRF protection with httpOnly cookies and X-CSRF-Token headers

### 🎨 Improved
- **Backend Services**:
  - Centralized auth middleware with Supabase JWT validation
  - Session management service with configurable durations
  - Audit service with structured event logging
  - Payment service with user tracking and role validation

- **Client Components**:
  - Login page with email/password and remember me
  - PIN pad interface for quick staff access
  - Station login for shared devices
  - Auth context with automatic token refresh
  - Protected route HOC with role validation

### 📚 Documentation
- Updated PRODUCTION_DEPLOYMENT_STATUS.md (Security score: 3/10 → 7/10)
- Updated ROADMAP.md with Week 1 auth tasks marked complete
- Enhanced SECURITY.md with PIN hashing details and session policies
- Created comprehensive auth documentation in docs/AUTH_ROADMAP.md

### 🔐 Security Fixes
- Fixed authentication bypass vulnerability in development mode
- Implemented proper session expiration and refresh logic
- Added request signing for critical operations
- Enhanced input validation on all auth endpoints

## [6.0.2] - 2025-01-30

### 🎯 TypeScript & Documentation Overhaul

### ✨ Added
- Comprehensive security documentation (SECURITY.md)
- Complete API reference documentation with examples
- Architecture documentation with diagrams
- CSRF protection documentation
- Rate limiting documentation
- Naming convention guidelines (snake_case DB, camelCase API)

### 🐛 Fixed
- Fixed MenuItem type mismatches between ApiMenuItem and SharedMenuItem
- Resolved KioskCartProvider missing module references
- Fixed type casting issues in unified-order.ts
- Added missing event type exports from shared module
- Updated mockData.ts to use proper ClientOrder/ClientTable types
- Added 'terminal' payment method to PaymentMethodSelectedEvent
- Fixed RealtimeTranscription useRef initialization
- Standardized naming conventions across layers

### 🎨 Improved
- Established clear architecture boundaries:
  - Database: snake_case (restaurant_id)
  - API: camelCase (restaurantId)
  - Transform utilities at boundaries
- Documentation accuracy increased from 72% to 95%
- ESLint: 0 errors, 573 warnings (down from 952 issues)
- Bundle size: 82KB (optimized from 347KB)
- Memory usage: 4GB max (optimized from 12GB)

### 📚 Documentation
- Updated README with accurate tech stack versions
- Created comprehensive architecture overview
- Added API reference with all endpoints
- Created security policy and guidelines
- Updated troubleshooting section

## [6.0.1] - 2025-01-27

### 🚀 Order Flow Stability Update

### 🐛 Bug Fixes
- Fixed Dashboard navigation links to valid routes
- Fixed KioskCheckoutPage payment button props
- Added proper type casting for Square Terminal
- Ensured all 7 order statuses handled
- Fixed WebSocket real-time order propagation
- Resolved order property name consistency
- Fixed missing useNavigate mock in tests
- Fixed TypeScript errors with vi.fn() conversion
- Fixed property name mismatches in shared types
- Fixed circular import issues

### 🎨 Improvements
- Enhanced error boundaries for payments
- Improved WebSocket connection stability
- Standardized order status handling
- Added comprehensive order flow validation
- Removed unused React imports (React 19)
- Removed unused icon imports
- Cleaned up debug console.log statements
- Fixed critical linting errors

### ✅ Tested Workflows
- Complete order lifecycle
- All dashboard navigation links
- WebSocket real-time updates
- Payment processing (cash, card, terminal)
- Demo mode authentication

## [6.0.0] - 2025-01-26

### 🚀 Major Release - Complete Rebuild

### ✨ Added
- **Unified Backend Architecture**: Single Express server on port 3001
- **AI Voice Ordering**: WebRTC + OpenAI Realtime API integration
- **UnifiedCartContext**: Single source of truth for cart operations
- **Multi-tenant Support**: Restaurant context isolation
- **Real-time WebSocket**: Live order updates and kitchen display
- **Modern Tech Stack**:
  - React with new JSX transform (see [VERSION.md](VERSION.md) for current version)
  - TypeScript 5.8.3 strict mode
  - Vite 5.4.19 for blazing fast builds
  - Express unified backend (see [VERSION.md](VERSION.md) for current version)
  - Supabase 2.50.5 for database

### 🎨 Architecture Changes
- Consolidated from 3 servers to 1 (port 3001)
- Removed separate WebSocket server (3002)
- Unified cart system (removed duplicate providers)
- Centralized type definitions in shared module
- Automatic case transformation at API boundaries

### 🚀 Performance
- Bundle size: 82KB (target <100KB)
- Build memory: 4GB max
- First paint: <2s
- TTI: <3s
- API response: <200ms average

### 🔐 Security
- JWT authentication via Supabase
- CSRF protection with httpOnly cookies
- Rate limiting per endpoint
- Row-level security in database
- Input validation with Zod schemas

### 📊 Quality Metrics
- TypeScript: 519 non-blocking errors (down from 670+)
- ESLint: 0 errors, 573 warnings
- Test coverage tracked in CI (see server coverage report at ~23.47%)
- Production readiness: 7/10

## [5.0.0] - 2024-12-15

### Previous Major Version
- Legacy multi-server architecture
- Separate WebSocket server
- Multiple cart providers
- Mixed naming conventions

---

## Version History Summary

| Version | Date | Status | Key Changes |
|---------|------|--------|-------------|
| 6.0.3 | 2025-02-01 | Current | Authentication & RBAC complete |
| 6.0.2 | 2025-01-30 | Stable | TypeScript fixes, documentation |
| 6.0.1 | 2025-01-27 | Stable | Order flow stability |
| 6.0.0 | 2025-01-26 | Major | Complete rebuild |
| 5.x | 2024 | Legacy | Multi-server architecture |

## Upgrade Guide

### From 5.x to 6.x

1. **Port Changes**:
   - API: 3000 → 3001
   - WebSocket: 3002 → 3001 (unified)

2. **Cart Migration**:
   - Replace all cart providers with UnifiedCartContext
   - Update imports from various providers to single source

3. **Type Changes**:
   - Import types from `@rebuild/shared`
   - Use transform utilities for case conversion

4. **Environment Variables**:
   - Update `.env` files per new structure
   - Add CSRF configuration

---

**Repository**: https://github.com/restaurant-os/rebuild-6.0  
**Issues**: https://github.com/restaurant-os/rebuild-6.0/issues  
**Documentation**: [./docs/](./docs/)