# Changelog

All notable changes to Restaurant OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 📚 Documentation Cleanup (September 9-10, 2025)
- **Major Documentation Cleanup**: Comprehensive audit and cleanup of project documentation
  - Archived 50+ outdated documentation files to reduce confusion
  - Removed obsolete reports, analysis files, and teaching materials
  - Consolidated architecture decisions into ADR format
  - Updated core documentation to reflect v6.0.4 reality
  - Fixed version inconsistencies and outdated information
  - Removed demo/test authentication documentation

### 🔒 Security
- **Critical Authentication Security Improvements** (January 30, 2025)
  - Applied rate limiting to all authentication endpoints (5 attempts/15 minutes)
  - Removed all hardcoded secret fallbacks from codebase
  - Enforced strict JWT token verification (no unverified tokens accepted)
  - Enhanced production environment configuration template
  - Fixed token verification in WebSocket connections
  - Added runtime validation for required environment variables
  - Result: Risk level reduced from CRITICAL to MEDIUM

### 📚 Documentation
- **Comprehensive Documentation Audit** (September 2, 2025) - SUPERSEDED by September 9-10 cleanup
  - Unified scattered documentation into single sources of truth
  - Created `/docs/api/` and `/docs/architecture/` unified directories
  - Added Architecture Decision Records (ADRs) for key decisions:
    - ADR-002: Unified Backend Architecture
    - ADR-003: Cart System Unification  
    - ADR-004: Voice System Consolidation
  - Generated comprehensive documentation index at `/docs/DOCS_INDEX.md`
  - Archived 15+ outdated documents to `/docs/archive/2025-09-02/`
  - Updated all core documentation with current version (6.0.3) and dates
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

## [6.0.3] - 2025-09-01 - Critical Loading Fix & Guard Systems (Historical Reference)

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
- **Test Coverage**: Maintained ≥60/50/60 thresholds
- **Puppeteer Tests**: 10/10 passing (100% success rate)

## [6.0.3] - 2025-02-01 - Authentication & RBAC MVP Complete (Future Release)

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

## [6.0.4] - 2025-01-30 - Authentication Security Hardening (Current Version)

### 🔐 Security Enhancement
- **Removed All Demo/Test Authentication Bypasses**: Complete removal of DemoAuthService and test token systems
  - All authentication now flows through Supabase JWT tokens only
  - Restaurant ID validation required for all authenticated requests
  - No more `getDemoToken()` or `DEMO_AUTH_TOKEN` session storage
  - Breaking change: Test tokens and demo mode authentication no longer supported
  - Enhanced security posture by eliminating authentication bypass mechanisms

### ⚠️ Breaking Changes
- Demo/test authentication tokens no longer work - all auth must use Supabase
- Restaurant ID is now required in all authenticated API requests
- Session storage keys for demo tokens have been removed

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
  - React 19.1.0 with new JSX transform
  - TypeScript 5.8.3 strict mode
  - Vite 5.4.19 for blazing fast builds
  - Express 4.18.2 unified backend
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
- Test coverage: 60% statements
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
| 6.0.4 | 2025-01-30 | Current | Demo auth removal, security hardening |
| 6.0.3 | 2025-02-01 | Stable | Authentication & RBAC complete |
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