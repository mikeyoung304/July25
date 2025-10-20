# Version Information

**Last Updated**: 2025-10-19

This document serves as the single source of truth for all version information in the Restaurant OS system.

## Current Versions

| Component | Version | Notes |
|-----------|---------|-------|
| **Application** | 6.0.10 | Main application version (P0 Audit Fixes) |
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