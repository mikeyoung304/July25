# Version Information

**Last Updated**: 2025-10-16

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

- 2025-10-16: Version 6.0.8 - Documentation cleanup and CI improvements
- 2025-09-26: Initial version truth established