# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Component Unification (Phase 3)**: Consolidated duplicate components
  - Created `BaseOrderCard` with variant support (standard, KDS, compact)
  - Built `UnifiedVoiceRecorder` replacing VoiceControl/VoiceCapture
  - Added shared UI components: LoadingSpinner, EmptyState, ErrorDisplay, IconButton
  - Standardized urgency calculation with `useOrderUrgency` hook
- **Shared Types Module (Phase 2)**: Unified type definitions
  - Created `/shared/types/` with Order, Menu, Customer, Table, WebSocket types
  - Single source of truth across client/server boundary
  - Full TypeScript support with backward compatibility
- **Voice Ordering Enhancements**: Hardened audio pipeline
  - Flow control with max 3 unacknowledged chunks
  - Automatic reconnection with exponential backoff
  - WebSocket heartbeat and overrun detection
- **Developer Tools**: Quality gates and monitoring
  - Prometheus metrics endpoint at `/metrics`
  - Scripts: `lint:fix`, `typecheck`, `verify:ports`
  - Component migration guide

### Changed
- **Documentation Overhaul (Phase 1)**: Reduced from 61 to ~20 files
  - Consolidated into ARCHITECTURE.md, QUICK_START.md, DOCUMENTATION.md
  - Deleted 27 outdated files from /docs/archive/pre-backend/
  - Removed duplicate architecture and setup guides
- **Service Architecture**: Eliminated duplication
  - Consolidated OrderService and MenuService implementations
  - Services now support both API and mock data modes
- **Unified Backend**: Single service on port 3001
  - Merged AI Gateway into main backend
  - Simplified from 2 servers to 1
  - All WebSocket, API, and AI in one Express.js server

### Fixed
- Environment variable loading (OpenAI API key issue)
- TypeScript errors in WebSocket ArrayBuffer handling
- Import path issues in server middleware
- Component prop drilling and duplication issues

### Removed
- Docker dependencies and configuration
- AI Gateway service (port 3002)
- Duplicate component implementations
- 27 outdated documentation files

## [0.5.0] - 2024-01-15

### Added
- Kitchen Display System (KDS) with real-time updates
- Voice ordering kiosk with speech recognition
- Order history and analytics dashboard
- Performance monitoring dashboard
- Sound notifications for order events
- Multi-tenant support with RestaurantContext

### Changed
- Migrated from Create React App to Vite
- Updated to React 18
- Switched to Tailwind CSS + shadcn/ui

### Fixed
- Memory leaks in real-time subscriptions
- Mobile responsiveness issues
- Accessibility compliance

## [0.4.0] - 2023-12-01

### Added
- Initial Supabase integration
- Real-time order synchronization
- Basic authentication system

### Changed
- Replaced local state with Supabase backend
- Updated routing structure

### Security
- Added row-level security policies
- Implemented secure API key handling

## [0.3.0] - 2023-10-15

### Added
- Order management system
- Table management
- Basic reporting

### Changed
- UI redesign with modern components
- Improved mobile experience

## [0.2.0] - 2023-08-01

### Added
- Menu management
- Customer ordering interface
- Basic kitchen display

### Fixed
- Performance issues with large menus
- Order calculation bugs

## [0.1.0] - 2023-06-01

### Added
- Initial project setup
- Basic React application structure
- Mock data service
- Development environment configuration

[Unreleased]: https://github.com/username/rebuild-6.0/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/username/rebuild-6.0/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/username/rebuild-6.0/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/username/rebuild-6.0/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/username/rebuild-6.0/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/username/rebuild-6.0/releases/tag/v0.1.0