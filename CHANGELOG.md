# Changelog

All notable changes to the Restaurant OS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0] - 2025-01-25

### 🎯 Summary

Major performance optimizations and TypeScript compilation fixes, reducing bundle size by 91% and memory usage by 67%.

### ✨ Added

- UnifiedCartContext for consistent cart management across all components
- Code splitting with React.lazy() for all routes
- Intelligent Vite bundle chunking strategy
- Browser environment checks in shared modules
- Comprehensive error boundaries for payment flows
- Square Terminal checkout integration with polling
- WebSocket connection status hook
- Audio alerts system for kitchen notifications
- Test coverage configuration (60% threshold)

### 🔧 Fixed

- TypeScript compilation errors (reduced from 670+ to 482)
- Cart type compatibility between UnifiedCartItem and KioskCartItem
- WebSocket event handler cleanup patterns (on/off instead of subscribe return)
- API response type handling in useSquareTerminal
- Memory monitoring export types in shared module
- Export ambiguity between runtime and utils modules
- Browser API usage in Node environments
- WebSocket test suite hanging issues

### ⚡ Improved

- Bundle size reduced from 1MB to 93KB (91% reduction)
- Memory usage decreased from 12GB to 4GB (67% reduction)
- Build time improved with incremental TypeScript compilation
- WebSocket reconnection logic with exponential backoff
- React component performance with memoization
- Test execution speed with proper async handling

### 📦 Dependencies

- Added react-window@1.8.11 for virtualized lists
- Updated all build scripts to use 4GB memory limit

### 📚 Documentation

- Updated README with current project status
- Enhanced CLAUDE.md with latest patterns and fixes
- Archived outdated planning documents
- Added comprehensive feature guides

### 🔄 Changed

- WebSocket event handlers now use on/off pattern consistently
- API requests use type casting instead of generic parameters
- All routes use lazy loading for code splitting
- Memory allocation reduced from 8GB to 4GB for builds

### 🗑️ Deprecated

- WebSocket subscribe pattern (use on/off instead)
- API generic type parameters (use type casting)

### 🔒 Security

- Added browser environment checks to prevent Node execution errors
- Implemented proper WebSocket authentication token handling

## [5.0.0] - 2024-08-24

### Added

- WebRTC voice ordering with OpenAI Realtime API
- Square Terminal payment integration
- Multi-tenant architecture
- Kitchen Display System (KDS)

## [4.0.0] - 2024-08-20

### Added

- Supabase authentication
- Real-time order tracking
- Menu management system
- QR code ordering

## [3.0.0] - 2024-08-15

### Added

- Initial React frontend
- Express backend API
- Basic order management

---

_For more details on recent improvements, see [docs/CODE_SPLITTING_IMPLEMENTATION.md](docs/CODE_SPLITTING_IMPLEMENTATION.md) and [docs/WEBSOCKET_TEST_FIX.md](docs/WEBSOCKET_TEST_FIX.md)_
