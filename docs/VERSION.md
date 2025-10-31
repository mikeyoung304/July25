# Version Information

**Last Updated**: 2025-10-30

This document serves as the single source of truth for all version information in the Restaurant OS system.

## Current Versions

| Component | Version | Notes |
|-----------|---------|-------|
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
- 2025-10-17: Version 6.0.8 - KDS Authentication Fix & Documentation Cleanup
  - Fixed critical authentication bug in httpClient (dual auth pattern implementation)
  - Created ADR-006: Dual Authentication Architecture Pattern
  - Comprehensive documentation updates across AUTHENTICATION_ARCHITECTURE, PRODUCTION_STATUS, TROUBLESHOOTING, and CHANGELOG
  - See docs/CHANGELOG.md for complete details
  - Commit: `94b6ea4`
- 2025-09-26: Initial version truth established