# Version Information


**Last Updated:** 2025-11-01

**Last Updated**: 2025-10-30

This document serves as the single source of truth for all version information in the Restaurant OS system.

## Current Versions

| Component | Version | Notes |
| --- | --- | --- |
| **Application** | 6.0.14 | Main application version (Technical Debt Reduction & Test Coverage Sprint) |
| **Client (React)** | 18.3.1 | Frontend framework |
| **Server (Express)** | 4.21.2 | Backend framework |
| **Node.js** | 20.x | Runtime requirement |
| **npm** | 10.7.0 | Package manager |

## Version Policy

- **DO NOT** hardcode version numbers in other documentation files
- **DO** link to this file when referencing versions
- **DO** update this file when versions change

## Version Sources

Version information is sourced from:
- Application version: `package.json` (root, client/, server/)
- React version: `client/package.json` dependencies
- Express version: `server/package.json` dependencies
- Node.js version: `package.json` engines field

## Update History

- 2025-10-30: Version 6.0.14 - Technical Debt Reduction & Test Coverage Sprint
  - **Test Coverage**: Added 155 new tests (37 regression + 118 unit tests)
  - **Code Quality**: 70% reduction in WebRTCVoiceClient complexity (1,312 → 396 lines)
  - **Service Extraction**: 3 new focused services (AudioStreaming, MenuIntegration, VoiceOrderProcessor)
  - **Documentation**: Migration best practices guide to prevent future churn
  - **All tests passing**: Zero TypeScript errors, all quality gates met
  - See docs/CHANGELOG.md v6.0.14 for complete technical details
  - Commits: `74e0659e`, `c95a4adf`, `bffbc803`, `58578b1b`, `80fcf0bb`

- 2025-10-27: Version 6.0.13 - Voice Ordering Hybrid AI Parsing
  - **AI Parsing Restored**: Hybrid approach with fallback to OpenAI
  - **Menu API Fixes**: Resolved 400 errors in menu endpoints
  - **Workspace Loading**: Removed loading state from workspace tiles
  - See docs/CHANGELOG.md v6.0.13 for details

- 2025-10-25: Version 6.0.12 - Test Suite Phase 2 Complete
  - **Test Restoration**: 98.5% success rate (restored 135 of 137 quarantined tests)
  - **Pass Rate**: Improved from 73% to 85%+ (365+ tests passing)
  - **Quarantined**: Only 2 tests remaining (down from 137!)
  - **Production Readiness**: Improved from 65-70% to 90%
  - See SOURCE_OF_TRUTH.md for complete phase 2 results

- 2025-10-24: Version 6.0.11 - Payment Audit Logging Infrastructure
  - **PCI Compliance**: Payment audit logging table deployed to production
  - **Square Integration**: Demo mode configuration support
  - **Menu Loading**: Fixed optionalAuth middleware to support public browsing
  - See docs/CHANGELOG.md v6.0.11 for details

- 2025-10-19: Version 6.0.10 - P0 Audit Fixes (7/8 Complete - 87.5%)
  - **Security & Compliance**: Payment audit fail-fast (PCI), tax rate centralization (Fix #119, #120)
  - **Data Integrity**: Transaction wrapping for createOrder, optimistic locking for updateOrderStatus (Fix #117, #118)
  - **Performance**: Batch table updates (40x improvement), ElapsedTimer fix (Fix #121, #122)
  - **Code Quality**: FloorPlanEditor refactored from 940→225 lines, 76% reduction (Fix #123)
  - **Documentation**: Created ADR-007 (Per-Restaurant Configuration), ADR-009 (Error Handling Philosophy)
  - **Remaining**: Fix #124 (WebRTCVoiceClient refactor, 1311 lines) - 8-12 hours estimated
  - See docs/audit/P0-FIX-ROADMAP.md for complete progress tracking
  - See docs/CHANGELOG.md v6.0.10 for technical details
  - Commits: `b072908`, `f349a04`, `7473fb7`
- 2025-10-18: Version 6.0.9 - Online Order Flow Fix (CORS & Auth)
  - **Critical Fix**: Added `X-Client-Flow` header to CORS allowedHeaders
  - Resolved "failed to fetch" errors on checkout for online orders
  - Header identifies order origin: `online`, `kiosk`, or `server`
  - See docs/CHANGELOG.md v6.0.9 for details

- 2025-10-17: Version 6.0.8 - KDS Authentication Fix & Documentation Cleanup
  - Fixed critical authentication bug in httpClient (dual auth pattern implementation)
  - Created ADR-006: Dual Authentication Architecture Pattern
  - Comprehensive documentation updates across AUTHENTICATION_ARCHITECTURE, PRODUCTION_STATUS, TROUBLESHOOTING, and CHANGELOG
  - See docs/CHANGELOG.md for complete details
  - Commit: `94b6ea4`

- 2025-10-14: Version 6.0.7 - Payment System Operational
  - **Square Payment Integration Complete**: Payment processing fully operational end-to-end
  - Square SDK v43 Migration: Updated authentication format and API method names
  - Updated `accessToken` to `token` property, `createPayment()` to `create()`
  - Removed `.result` wrapper from responses
  - See docs/CHANGELOG.md v6.0.7 for details

- 2025-09-13: Version 6.0.6 - Performance & Stability Sprint
  - **WebSocket Memory Leak Fixes**: Fixed server/client-side heartbeat interval memory leaks
  - Added proper cleanup on server shutdown, implemented exponential backoff with jitter
  - Fixed WebRTC voice client memory leaks
  - **Image Optimization**: Performance improvements
  - See docs/CHANGELOG.md v6.0.6 for details

- 2025-09-12: Version 6.0.5 - Critical Security Sprint
  - **Fixed JWT Authentication Bypass** (CVE-pending): Removed fallback to public `anonKey`
  - Now requires proper `jwtSecret` configuration
  - **Fixed 11 XSS Vulnerabilities**: Added HTML escaping for all user inputs
  - Implemented `escapeHtml()` sanitization function in voice debug dashboard
  - See docs/CHANGELOG.md v6.0.5 for details

- 2025-09-01: Version 6.0.3 - Critical Loading Fix & Guard Systems
  - **Runtime Smoke Gate**: Production-ready health check (`scripts/smoke.mjs`)
  - **TypeScript Freeze Check**: Prevents regression with `tools/check-ts-freeze.mjs`
  - **Shared Directory Guard**: Automated check to prevent compiled JS in /shared
  - **Puppeteer E2E Suite**: Comprehensive browser testing (10/10 tests passing)
  - See docs/CHANGELOG.md v6.0.3 for details

- 2025-02-01: Version 6.0.3 - Authentication & RBAC MVP Complete
  - **Complete Authentication System**: JWT token infrastructure via Supabase with RS256 signing
  - Email/password login with MFA support for managers
  - PIN-based authentication for servers/cashiers (bcrypt + pepper)
  - Station login for kitchen/expo staff (device-bound tokens)
  - Protected route wrapper components with role validation
  - See docs/CHANGELOG.md v6.0.3 for details

- 2025-01-30: Version 6.0.2 - TypeScript & Documentation Overhaul
  - Comprehensive security documentation (SECURITY.md)
  - Complete API reference documentation with examples
  - Architecture documentation with diagrams
  - CSRF protection, rate limiting documentation
  - Naming convention guidelines (snake_case DB, camelCase API)
  - See docs/CHANGELOG.md v6.0.2 for details

- 2025-01-27: Version 6.0.1 - Order Flow Stability Update
  - Fixed Dashboard navigation links to valid routes
  - Fixed KioskCheckoutPage payment button props
  - Added proper type casting for Square Terminal
  - Ensured all 7 order statuses handled
  - Fixed WebSocket real-time order propagation
  - See docs/CHANGELOG.md v6.0.1 for details

- 2025-01-26: Version 6.0.0 - Major Release - Complete Rebuild
  - **Unified Backend Architecture**: Single Express server on port 3001
  - **AI Voice Ordering**: WebRTC + OpenAI Realtime API integration
  - **UnifiedCartContext**: Single source of truth for cart operations
  - **Multi-tenant Support**: Restaurant context isolation
  - **Real-time WebSocket**: Live order updates and kitchen display
  - See docs/CHANGELOG.md v6.0.0 for details

- 2024-12-15: Version 5.0.0 - Previous Major Version
  - Legacy multi-server architecture
  - Separate WebSocket server
  - Multiple cart providers
  - Mixed naming conventions
  - See docs/CHANGELOG.md v5.0.0 for details

- 2025-09-26: Initial version truth established