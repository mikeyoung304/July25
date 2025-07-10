# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Project Janus**: Complete API integration layer for Express.js backend
  - HTTP client with automatic Supabase JWT authentication
  - Multi-tenant support via X-Restaurant-ID header
  - Automatic case transformation (camelCase ↔ snake_case)
  - Service adapter pattern for gradual migration from mock to real API
- **WebSocket Service**: Real-time order updates infrastructure
  - Automatic reconnection with exponential backoff
  - Message queueing for offline resilience
  - Event-based architecture for order state changes
- **Floor Plan Service**: Save/load functionality with localStorage fallback
- Comprehensive modular architecture with 7 feature-based modules
  - analytics: Metrics and performance tracking
  - filters: Reusable filtering functionality
  - floor-plan: Interactive floor plan management
  - kitchen: Kitchen Display System
  - orders: Order management with components, hooks, and types
  - sound: Audio management for notifications
  - voice: Voice capture and ordering
- New `useAsyncState` hook for standardized async state management
- Keyboard navigation system with 5 specialized hooks
- Domain-specific service layer with dependency injection
- Comprehensive test suite (229 tests passing)
- Code analysis script for metrics tracking
- Extensive documentation (6 new docs)

### Changed
- **BREAKING**: Refactored `App.tsx` from 522 lines to 28 lines with component extraction
- **BREAKING**: Split monolithic `api.ts` (409 lines) into domain services
- Migrated keyboard navigation from single file to modular hooks
- Updated project structure to feature-based modules
- Improved TypeScript typing throughout the codebase
- Enhanced accessibility with ARIA labels and keyboard navigation

### Fixed
- Kitchen Display performance issues with memoization and stable callbacks
- WebSocket import error in tests
- Performance issues with unnecessary re-renders
- Complexity issues in keyboard navigation (reduced from 55 to <15)
- Duplicate code patterns across components
- Missing error boundaries in critical paths

### Security
- Added input validation and sanitization
- Implemented rate limiting for API calls
- Added XSS prevention measures

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