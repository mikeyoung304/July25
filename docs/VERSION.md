# Version Information

**Last Updated**: 2025-10-17

This document serves as the single source of truth for all version information in the Restaurant OS system.

## Current Versions

| Component | Version | Notes |
|-----------|---------|-------|
| **Application** | 6.0.8 | Main application version |
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

- 2025-10-17: Version 6.0.8 - KDS Authentication Fix & Documentation Cleanup
  - Fixed critical authentication bug in httpClient (dual auth pattern implementation)
  - Created ADR-006: Dual Authentication Architecture Pattern
  - Comprehensive documentation updates across AUTHENTICATION_ARCHITECTURE, PRODUCTION_STATUS, TROUBLESHOOTING, and CHANGELOG
  - See docs/CHANGELOG.md for complete details
  - Commit: `94b6ea4`
- 2025-09-26: Initial version truth established