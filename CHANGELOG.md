# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-08-16

### Security
- 🔒 **CRITICAL**: Removed test-token bypass from production (only works in local dev now)
- 🔒 Activated rate limiting for AI endpoints (50/5min) and transcription (20/min)
- 🔒 Fixed CORS configuration to use strict allowlist for Vercel deployments
- 🔒 Added abuse logging for rate limit violations

### Fixed
- 🐛 Resolved 250+ TypeScript errors by removing double transformation layer
- 🐛 Fixed type system chaos - unified to single camelCase transformation at server
- 🐛 Fixed VoiceSocketManager missing properties and phantom inheritance
- 🐛 Connected AI chat to actual restaurant menu (28 items)
- 🐛 Fixed production API URL routing for Vercel deployments
- 🐛 Resolved ApiMenuCategory object vs string type mismatches
- 🐛 Fixed Cart type circular import issues

### Changed
- ♻️ Removed client-side case transformation (server handles it)
- ♻️ Optimized AI voice agent for speed (1-2 sentences max)
- ♻️ Hardcoded API URL in Vercel build configuration for reliability
- ♻️ Changed all components to use camelCase properties (imageUrl, isAvailable)

### Architecture
- 🏗️ Established single source of truth for types (@rebuild/shared)
- 🏗️ Eliminated multiple transformation layers causing type confusion
- 🏗️ Fixed monorepo boundaries between client/server/shared

## [1.1.0] - 2025-08-12

### Added
- **OpenAI Adapters**: Direct OpenAI integration replacing BuildPanel proxy
  - Transcription via Whisper API
  - Chat via GPT models  
  - TTS via OpenAI Speech API
  - Order parsing with structured prompts
- **Environment Policy Enforcement**: Fail-fast validation for missing `OPENAI_API_KEY`
- **Degraded Mode**: Graceful fallbacks when `AI_DEGRADED_MODE=true` for development
- **Error Mapping**: OpenAI errors mapped to user-friendly messages
- **Provider Health Monitoring**: AI service availability tracking
- **Prometheus Metrics**: Request counters, error rates, and latency for AI routes at `/internal/metrics`

### Removed
- **BuildPanel Integration**: Removed all external BuildPanel service dependencies
- **BuildPanel Scripts**: Removed health checks, security scripts, and streaming tests  
- **BuildPanel Documentation**: Archived all BuildPanel-specific docs to `docs/_archive/2025-08-12-buildpanel/`

### Changed
- **AI Integration**: Migrated from BuildPanel proxy to direct OpenAI integration in backend
- **Configuration**: Replaced `USE_BUILDPANEL`/`BUILDPANEL_URL` with `OPENAI_API_KEY`
- **Security Model**: Updated to secure OpenAI API key in backend environment only

### Migration Notes
- Remove `USE_BUILDPANEL`, `BUILDPANEL_URL`, `BUILDPANEL_BASE_URL` from environment
- Add `OPENAI_API_KEY` to backend environment  
- Ensure `VITE_API_BASE_URL` points to backend service (not BuildPanel)
- Public API contracts (`/api/v1/*` and `/api/v1/ai/*`) remain unchanged

## [1.0.0] - 2025-01-08

### Added
- ✅ Unified backend architecture on port 3001
- ✅ AI integration for voice ordering (now uses OpenAI directly)
- ✅ Real-time WebSocket updates for kitchen display
- ✅ Multi-tenant restaurant support
- ✅ Comprehensive TypeScript types via @rebuild/shared

### Changed
- 🔄 Migrated from microservices to unified backend (97.4% complexity reduction)
- 🔄 AI service moved to integrated backend modules
- 🔄 Consolidated documentation from 61 to 20 files
- 🔄 Simplified API structure with single backend proxy

### Fixed
- 🐛 Circular dependency in OrderService
- 🐛 Type system alignment (is_available → available)
- 🐛 React Hooks violations
- 🐛 WebSocket connection handling
- 🐛 Menu synchronization with AI service

### Removed
- 🗑️ Separate AI Gateway service (port 3002)
- 🗑️ Over-engineered MCP implementation
- 🗑️ Redundant documentation files
- 🗑️ Debug and test files from production

## [Unreleased]

### Added
- **AI Integration**: External AI service architecture
  - Replaced direct OpenAI integration with service proxy (later reverted to direct integration)
  - AI service was isolated on port 3003 (now integrated in backend)
  - All AI processing proxied through unified backend (port 3001)
  - Enhanced security boundary with no direct frontend-to-AI communication
  - Restaurant context propagation through all AI operations
  - Service health monitoring and graceful degradation
- **Production Monitoring (Phase 6)**: Basic monitoring infrastructure
  - Created monitoring service with Web Vitals tracking
  - Added performance monitor for tracking render and API metrics
  - Added metrics collection endpoint at `/api/v1/metrics`
  - Health check endpoints for uptime monitoring
  - NOTE: External services (Sentry, DataDog, LogRocket) were documented but not implemented
- **Performance Optimization (Phase 6)**: Bundle configuration
  - Enhanced Vite config with chunk splitting
  - Added terser minification
  - Configured asset optimization and modern browser targeting
  - NOTE: Console stripping has been removed to maintain debugging capability
- **Technical Debt Resolution (Phase 5)**: Code quality improvements
  - Created logger service replacing console statements
  - Fixed TypeScript strict mode issues (missing utils, imports)
  - Implemented comprehensive error boundary with monitoring integration
  - Added proper error reporting to production services
- **Test Infrastructure (Phase 4)**: Testing foundations
  - Created test utilities with custom render and providers
  - Added mock data factories for consistent testing
  - Built test helpers for API and WebSocket testing
  - Added tests for unified components
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
- **AI Architecture Migration**: OpenAI service integration
  - Migrated from direct OpenAI API integration to service proxy (later reverted)
  - Updated security model from API key protection to service boundary isolation
  - Enhanced authentication flow with restaurant context validation
  - Improved monitoring and error handling for AI operations
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
- **OpenAI Direct Integration**: Replaced with service proxy (later reverted to direct integration)
  - Removed OpenAI client imports from frontend code
  - Eliminated direct API key exposure to browser
  - Archived OpenAI-specific security documentation
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