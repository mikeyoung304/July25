# Changelog - Restaurant OS

## [6.0.4] - 2025-09-14

### ⚠️ Breaking Changes & Regressions
- Authentication middleware now blocking valid roles (401/403 errors)
- Order creation broken for authenticated users
- Test suite timing out after 2 minutes
- 100+ TypeScript compilation errors introduced

### Attempted Improvements (Currently Broken)
- Enforced explicit restaurant context for staff writes (causing failures)
- Added 403 status for staff membership denial (rejecting valid users)
- Attempted strict authentication enforcement (blocking legitimate requests)
- Added structured telemetry logging for auth events

### Known Issues
- Vitest migration incomplete (missing Jest compatibility shim)
- Manager role cannot create orders despite having scope
- requireRole() middleware rejecting valid roles
- Mixed legacy/new auth code causing conflicts
- Feature flags defined but not wired up

### Documentation
- Documentation incorrectly claims production readiness
- Critical audit findings show "SHIP-BLOCK" status
- Multiple contradictory reports about system state

## [6.0.3] - 2025-01-30

### Security
- Removed all authentication bypasses and demo fallbacks
- Implemented strict authentication on all routes
- Added proper logout UI with UserMenu component
- Enforced JWT token validation with RS256/HS256 signing
- Added CSRF protection headers
- Implemented rate limiting on auth endpoints

### Features
- **Multi-tier Authentication System**
  - Manager/Owner: Email + password with Supabase JWT (RS256)
  - Staff: PIN-based authentication (4-6 digits, bcrypt hashed)
  - Station: Shared device tokens for kitchen/expo (HS256)
  - Kiosk: Anonymous customer sessions with limited scope (HS256)
- **Kiosk Endpoint** (`/api/v1/auth/kiosk`)
  - Production feature for self-service ordering
  - 1-hour session tokens with customer role
  - Limited scope: menu reading, order creation, payments
- **User Management**
  - Visible logout button in all authenticated pages
  - Quick user switching for shared terminals
  - Current user and role display
  - Friends & Family demo panel (development only)

### Improvements
- Single-panel login page design (removed 2-panel layout)
- WebSocket connection management with ConnectionManager
- Added specialized error boundaries (WebSocket, KDS)
- Memory monitoring for long-running KDS/Expo sessions
- React Fast Refresh compatibility improvements

### Performance
- TypeScript errors reduced from ~500 to near zero
- Bundle optimization with Vite chunking strategy
- Added performance budget configuration
- Memory leak prevention for 8+ hour sessions
- React.memo optimization for OrderCard components

### Documentation
- Updated to version 6.0.3 (from incorrect 6.0.4)
- Created API_REFERENCE.md with all endpoints
- Created AUTH_TIERS.md explaining authentication levels
- Updated AUTHENTICATION.md to reflect actual implementation
- Added production deployment guide and checklist

### Database
- Added comprehensive SQL optimization script
- Performance indexes for common queries
- Materialized views for analytics
- Connection pooling configuration

### Developer Experience
- Added bundle size checking script
- Security headers middleware
- Production environment template
- Blue-green deployment strategy
- Emergency contact templates

### Bug Fixes
- Fixed nested setTimeout memory leak in AnimatedStatusBadge
- Fixed timer leak in SplashScreen
- Improved timer cleanup in useModal hook
- Fixed WebSocket test cleanup issues
- Fixed CORS headers for preflight requests

### Removed
- VITE_DISABLE_AUTO_AUTH environment variable
- force-logout.html and clear-auth.html workarounds
- force_logout URL parameter handling
- Silent demo token fallback from httpClient
- All authentication bypass code

## [6.0.2] - 2025-01-28

### Features
- Comprehensive production deployment infrastructure
- Security headers implementation (CSP, HSTS, XSS protection)
- Database optimization with indexes and materialized views
- Web Vitals monitoring (LCP <2.5s, FID <100ms)

### Improvements
- Production readiness score increased from 6/10 to 9.5/10
- Bundle size optimization (main chunk target <80KB)
- Test coverage at 60% statements
- ESLint issues reduced from 952 to 573 warnings

## [6.0.1] - 2025-01-27

### Features
- Cart system unification with UnifiedCartContext
- 7-status order system (new, pending, confirmed, preparing, ready, completed, cancelled)
- WebRTC voice ordering with OpenAI Realtime API
- Kitchen Display System with real-time updates
- Expo display for order completion

### Architecture
- Unified backend on port 3001
- Supabase integration for auth and database
- WebSocket events for real-time updates
- Row-level security in database

## [6.0.0] - 2025-01-26

### Initial Release
- Multi-tenant restaurant management system
- Point of Sale functionality
- Menu management with QR codes
- AI-powered voice ordering
- Analytics dashboard
- Real-time order tracking

---

## Version History

- **6.0.3** - Current stable version with production-ready authentication
- **6.0.2** - Production infrastructure and optimization
- **6.0.1** - Cart unification and voice system
- **6.0.0** - Initial major release