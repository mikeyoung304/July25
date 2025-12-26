# Rebuild 6.0 Monorepo - Complete File Structure Map

## Repository Overview
**Location:** `/Users/mikeyoung/CODING/rebuild-6.0`
**Type:** Multi-workspace React 18.3.1 + Node.js Express TypeScript Monorepo
**Architecture:** Snake_case convention throughout (DB, API, client)
**Test Coverage:** 119 test files distributed across workspaces

---

## 1. MONOREPO ROOT STRUCTURE

```
rebuild-6.0/
├── client/                    # React 18.3.1 + Vite frontend (port 5173)
├── server/                    # Express + TypeScript backend (port 3001)
├── shared/                    # Shared types, contracts, utilities
├── supabase/                  # Database migrations (remote-first)
├── prisma/                    # Prisma schema & migrations
├── tests/                     # End-to-end Playwright tests
├── test-quarantine/           # Quarantined test files
├── scripts/                   # Development & build scripts
├── docs/                      # Documentation (97.4% link health)
├── claude-lessons3/           # 600+ hours debugging knowledge
├── .github/                   # GitHub Actions CI/CD workflows
└── package.json               # Root monorepo config
```

---

## 2. CLIENT WORKSPACE: /Users/mikeyoung/CODING/rebuild-6.0/client/src

### 2.1 Core Application Files

```
client/src/
├── App.tsx                    # Root application component
├── main.tsx                   # Entry point (Vite)
├── main.performance.tsx       # Performance monitoring entry
├── index.css                  # Global styles
├── App.css                    # App-level styles
└── test/                      # Client-specific test config
    └── import-meta-setup.js
```

### 2.2 Authentication Subsystem

**Directory:** `client/src/contexts/` + `client/src/components/auth/` + `client/src/services/auth/`

**Contexts & Providers:**
```
contexts/
├── AuthContext.tsx            # Core auth state management
├── RoleContext.tsx            # Role-based access control
├── UnifiedCartContext.tsx      # Cart state management
├── auth.hooks.ts              # useAuth, useUser, useAuthStatus hooks
├── auth.index.ts              # Auth context exports
├── cart.hooks.ts              # useCart, useCartItems hooks
└── __tests__/
    └── AuthContext.test.tsx   # Auth context tests
```

**Components:**
```
components/auth/
├── DevAuthOverlay.tsx         # Demo login overlay (VITE_DEMO_PANEL)
├── WorkspaceAuthModal.tsx      # Workspace selection modal
├── RoleSelector.tsx           # Role selection UI
├── ProtectedRoute.tsx          # Route protection wrapper
├── RoleGuard.tsx              # Role-based access guard
├── UserMenu.tsx               # User menu dropdown
├── withProtectedRoute.tsx      # HOC for protected routes
└── __tests__/
    └── WorkspaceAuthModal.test.tsx
```

**Services:**
```
services/auth/
├── index.ts                   # Auth service exports
├── pinAuth.ts                 # PIN-based authentication
└── stationAuth.ts             # Station/KDS authentication
```

### 2.3 Orders & Order System Subsystem

**Module Location:** `client/src/modules/orders/` + `client/src/modules/order-system/`

**Order System (Checkout Flow):**
```
modules/order-system/
├── __tests__/
│   ├── checkout.e2e.test.tsx
│   ├── checkout-simple.test.tsx
│   └── accessibility.test.tsx
├── components/
│   └── index.ts               # Checkout-related components
├── hooks/
│   └── useRestaurantData.ts   # Restaurant config hook
└── types/
    └── index.ts               # Order system types
```

**Orders Module (Management & Display):**
```
modules/orders/
├── __tests__/                 # (in components/)
├── components/
│   ├── __tests__/
│   │   └── OrderCard.test.tsx
│   ├── OrderActions/          # Order action components
│   ├── OrderList/             # Order list displays
│   └── index.ts
├── hooks/
│   ├── __tests__/
│   │   └── useOrderData.test.ts
│   ├── useOrderData.ts        # Order data fetching
│   ├── useOrderActions.ts     # Order action handlers
│   ├── useOrderSubscription.ts # WebSocket subscriptions
│   ├── index.ts
│   └── useOrderHistory.test.tsx
├── services/
│   └── OrderParser.ts         # Parse order responses
├── types/
│   └── index.ts
└── index.ts
```

**Order Services (Client):**
```
services/orders/
├── OrderService.ts            # Main order API service
├── OrderHistoryService.ts      # Order history management
└── __tests__/
    └── (order tests)
```

**Related Pages:**
```
pages/
├── CheckoutPage.tsx           # Main checkout UI
├── OrderConfirmationPage.tsx   # Post-order confirmation
├── OrderHistory.tsx           # Order history view
├── ServerView.tsx             # Server perspective view
└── components/
    ├── ItemModifiersModal.tsx # Item customization
    ├── SeatSelectionModal.tsx # Multi-seat selection
    ├── PostOrderPrompt.tsx     # Post-checkout prompts
    └── (order-related components)
```

### 2.4 Menu Subsystem

**Module Location:** `client/src/modules/menu/`

```
modules/menu/
├── hooks/
│   └── useMenuItems.ts        # Menu data hook
└── (menu-related components)
```

**Menu Services:**
```
services/menu/
├── MenuService.ts             # Menu API operations
├── ResponseCache.ts           # Menu response caching
└── (menu utilities)
```

**Shared Utilities:**
```
utils/
├── fuzzyMenuMatcher.ts        # Fuzzy matching for menu search
├── fuzzyMenuMatcher.example.ts
└── __tests__/
    ├── fuzzyMenuMatcher.test.ts
    └── fuzzyMenuMatcher.manual-test.ts
```

### 2.5 Kitchen Display System (KDS)

**Module Location:** `client/src/modules/kitchen/`

**Components:**
```
modules/kitchen/
├── __tests__/
│   └── KDSOrderCard.test.tsx
├── components/
│   ├── VirtualizedOrderGrid.tsx # Virtual scrolling for orders
│   ├── OrderCard.tsx            # Individual order cards
│   ├── OrderGroupCard.tsx        # Grouped orders view
│   ├── TableGroupCard.tsx        # Table-grouped view
│   ├── TouchOptimizedOrderCard.tsx # Touch-optimized card
│   ├── StationStatusBar.tsx       # Station status indicator
│   ├── ConnectionStatusBar.tsx    # Connection status
│   ├── ScheduledOrdersSection.tsx # Scheduled orders
│   └── (KDS-specific components)
└── (module structure)
```

**Kitchen Pages:**
```
pages/
├── KitchenDisplayOptimized.tsx # Main KDS view (23KB - optimized)
└── (kitchen-related components)
```

**Kitchen Hooks:**
```
hooks/
├── useKitchenOrdersRealtime.ts # WebSocket kitchen updates
└── useKitchenOrdersOptimized.ts # Optimized order fetching
```

### 2.6 Voice Ordering Subsystem

**Module Location:** `client/src/modules/voice/`

**Components:**
```
modules/voice/
├── components/
│   ├── TranscriptionDisplay.test.tsx # Transcription UI
│   ├── MicrophonePermission.test.tsx # Permission prompt
│   └── (voice UI components)
├── contexts/
│   └── (voice-specific contexts)
├── hooks/
│   ├── __tests__/
│   │   └── useVoiceCommerce.test.ts
│   ├── useVoiceCommerce.ts    # Main voice ordering hook
│   ├── useVoiceOrder.ts       # Voice-to-order conversion
│   ├── useWebRTCVoice.ts      # WebRTC connection hook
│   └── (voice hooks)
├── services/
│   ├── __tests__/
│   │   ├── PromptConfigService.test.ts
│   │   ├── VoiceCheckoutOrchestrator.test.ts
│   │   ├── VoiceSessionConfig.test.ts
│   │   ├── VoiceStateMachine.test.ts
│   │   ├── WebRTCConnection.test.ts
│   │   └── VoiceEventHandler.test.ts
│   ├── WebRTCVoiceClient.ts   # WebRTC client implementation
│   ├── WebRTCConnection.ts    # Connection management
│   ├── VoiceSessionConfig.ts  # Session configuration
│   ├── VoiceStateMachine.ts   # Voice state management
│   ├── VoiceEventHandler.ts   # Event handling
│   ├── VoiceCheckoutOrchestrator.ts # Checkout orchestration
│   ├── VoiceOrderProcessor.ts # Order processing
│   ├── orderIntegration.ts    # Order integration
│   └── orderIntegration.test.ts
├── types/
│   └── index.ts
└── index.ts
```

**Voice Config Service (Client):**
```
services/voice/
└── VoiceConfigService.ts      # Voice configuration management
```

**Voice Pages:**
```
pages/
├── KioskDemo.tsx              # Kiosk demo with voice
└── components/
    └── VoiceOrderModal.tsx     # Voice ordering modal
```

**Kiosk Components:**
```
components/kiosk/
├── KioskCheckoutPage.tsx       # Kiosk checkout
├── KioskModeSelector.tsx       # Mode selection
├── VoiceOrderingMode.tsx       # Voice mode
├── KioskErrorBoundary.tsx      # Error handling
├── accessibility.ts            # A11y utilities
└── (kiosk components)
```

### 2.7 Payments Subsystem

**Components:**
```
components/payments/
├── TenderSelection.tsx         # Tender type selection
├── CardPayment.tsx             # Card payment flow
├── CashPayment.tsx             # Cash payment flow
└── index.ts
```

**Pages:**
```
pages/
├── CheckoutPage.tsx            # Integrated checkout
└── (payment flows embedded)
```

### 2.8 Tables & Floor Plan Subsystem

**Module Location:** `client/src/modules/floor-plan/`

**Components:**
```
modules/floor-plan/
├── __tests__/
│   └── chip-monkey.test.tsx    # Floor plan tests
├── components/
│   ├── (floor plan UI components)
│   └── __tests__/
├── hooks/
│   ├── useFloorPlanLayout.ts  # Layout calculations
│   ├── useCanvasControls.ts   # Canvas control logic
│   ├── useTableManagement.ts  # Table management
│   └── index.ts
├── services/
│   └── TablePersistenceService.ts # Table persistence
├── types/
│   └── index.ts
└── (floor plan components)
```

**Table Services (Client):**
```
services/tables/
└── TableService.ts             # Table API operations
```

**Related Pages:**
```
pages/
├── ServerView.tsx              # Server-side view
└── components/
    ├── ServerFloorPlan.tsx
    ├── ServerMenuGrid.tsx
    ├── ServerHeader.tsx
    ├── ServerStats.tsx
    └── (server components)
```

### 2.9 Core Infrastructure

**Restaurant Context & Configuration:**
```
core/
├── RestaurantContext.tsx       # Restaurant context provider
├── restaurant-hooks.ts         # useRestaurant hook
├── restaurant-types.ts         # Restaurant type definitions
├── supabase.ts                 # Supabase client
├── api/                        # (API-related utilities)
└── index.ts
```

**HTTP Client (Unified):**
```
services/http/
├── httpClient.ts              # Main HTTP client (uses Supabase + localStorage)
├── hooks.ts                   # useHttp hook
├── RequestBatcher.ts          # Request batching utility
├── __mocks__/                 # Mock implementations
├── __tests__/                 # HTTP tests
└── index.ts
```

**WebSocket Infrastructure:**
```
services/websocket/
├── WebSocketService.ts        # Main WebSocket service
├── ConnectionManager.ts       # Connection pooling
├── orderUpdates.ts            # Order update handling
├── index.ts
└── WebSocketService.test.ts
```

**Realtime Services:**
```
services/realtime/
└── orderSubscription.ts       # Order subscription service
```

### 2.10 Shared UI Components

**Base UI Components:**
```
components/ui/
├── button.tsx
├── card.tsx
├── input.tsx
├── label.tsx
├── select.tsx
├── dropdown-menu.tsx
├── tooltip.tsx
├── popover.tsx
├── alert.tsx
├── badge.tsx
├── slider.tsx
├── ActionButton.tsx
├── NavigationCard.tsx
├── PageLayout.tsx
├── PageHeader.tsx
├── Typography.tsx
└── (shadcn/ui components)
```

**Shared Components:**
```
components/shared/
├── __tests__/
│   └── LoadingSpinner.test.tsx
├── accessibility/
│   └── (a11y utilities)
├── badges/
│   └── (badge components)
├── buttons/
│   ├── StatusActionButton.tsx
│   └── (button variants)
├── controls/
│   ├── SoundControl.tsx
│   └── SoundControl.test.tsx
├── debug/
│   └── (debug utilities)
├── display/
│   └── (display components)
├── errors/
│   ├── __tests__/
│   │   └── ErrorBoundary.test.tsx
│   └── (error boundaries)
├── filters/
│   └── SortControl.tsx
├── inputs/
│   ├── OrderInputSelector.tsx
│   └── (input components)
├── lists/
│   ├── VirtualizedOrderList.tsx # Virtual list
│   ├── OrderItemRow.tsx
│   └── (list components)
├── timers/
│   ├── ElapsedTimer.tsx
│   └── ElapsedTimer.test.tsx
├── EmptyState.tsx
├── ErrorDisplay.tsx
├── IconButton.tsx
├── LoadingSpinner.tsx
├── MenuItemGrid.tsx
├── MenuItemGrid.example.tsx
├── OptimizedImage.tsx
└── index.ts
```

**Error Boundaries:**
```
components/errors/
├── AppErrorBoundary.tsx
├── GlobalErrorBoundary.tsx
├── KDSErrorBoundary.tsx
├── KitchenErrorBoundary.tsx
├── OrderStatusErrorBoundary.tsx
├── PaymentErrorBoundary.tsx
├── UnifiedErrorBoundary.tsx
└── WebSocketErrorBoundary.tsx
```

**Layout Components:**
```
components/layout/
├── AppContent.tsx
├── AppRoutes.tsx
├── Navigation.tsx
├── BrandHeader.tsx
└── BrandHeaderPresets.ts
```

**Navigation:**
```
components/navigation/
├── BackToDashboard.tsx
└── FloatingDashboardButton.tsx
```

**Brand:**
```
components/brand/
└── MaconLogo.tsx
```

### 2.11 Hooks & State Management

**Authentication Hooks:**
```
contexts/
├── auth.hooks.ts              # useAuth, useUser, etc.
└── cart.hooks.ts              # useCart hooks
```

**Custom Hooks:**
```
hooks/
├── __tests__/
│   ├── useAsyncState.test.ts
│   ├── useSoundNotifications.test.ts
│   ├── useKitchenOrdersRealtime.test.ts
│   └── useWorkspaceAccess.test.tsx
├── keyboard/
│   ├── __tests__/
│   │   ├── useKeyboardShortcut.test.ts
│   │   └── useAriaLive.test.ts
│   └── (keyboard hooks)
├── kiosk/
│   └── (kiosk hooks)
├── useAsyncState.ts           # Async state management
├── useConnectionStatus.ts      # Connection monitoring
├── useDebounce.ts
├── useErrorHandler.ts
├── useFocusManagement.ts
├── useGlobalKeyboardShortcuts.tsx
├── useIntersectionObserver.ts
├── useKitchenOrdersOptimized.ts
├── useKitchenOrdersRealtime.ts
├── useOrderFilters.ts
├── useOrderGrouping.ts
├── useOrderHistory.ts
├── useOrderHistory.test.tsx
├── usePerformanceMonitor.ts
├── useRestaurantConfig.ts
├── useScheduledOrders.ts
├── useSoundNotifications.ts
├── useSoundNotifications.test.tsx
├── useSquareTerminal.ts
├── useTableGrouping.ts
├── useTaxRate.ts
├── useToast.ts
├── useVirtualization.ts
├── useWebSocketConnection.ts
└── useWorkspaceAccess.ts
```

**Filter Hooks:**
```
modules/filters/
├── hooks/
│   ├── __tests__/
│   │   └── useOrderFilters.test.ts
│   └── useOrderFilters.ts
└── types/
    └── index.ts
```

### 2.12 Pages & Routing

**Pages:**
```
pages/
├── __tests__/
│   ├── CheckoutPage.demo.test.tsx
│   └── (page tests)
├── hooks/
│   ├── __tests__/
│   │   └── useVoiceOrderWebRTC.test.tsx
│   └── (page-specific hooks)
├── components/
│   └── (page sub-components)
├── AdminDashboard.tsx          # Admin view
├── CheckoutPage.tsx            # Checkout flow
├── Dashboard.tsx               # Main dashboard
├── DriveThruPage.tsx
├── ExpoPage.tsx                # Expo station
├── HomePage.tsx
├── KioskDemo.tsx
├── KioskPage.tsx
├── KitchenDisplayOptimized.tsx # KDS main page
├── Login.tsx
├── OrderConfirmationPage.tsx
├── OrderHistory.tsx
├── PerformanceDashboard.tsx
├── PinLogin.tsx
├── ServerView.tsx
├── SetupRequiredScreen.tsx
├── SplashScreen.tsx
├── StationLogin.tsx
└── UnauthorizedPage.tsx
```

**Routes:**
```
routes/                         # Route definitions
```

### 2.13 Configuration & Constants

**Config:**
```
config/
├── checkoutValidation.ts       # Checkout validation rules
├── demoCredentials.ts          # Demo credentials
├── env-validator.ts            # Environment validation
├── env.schema.ts               # Environment schema
└── index.ts
```

**Constants:**
```
constants/
└── stations.ts                 # Station constants
```

### 2.14 Utilities & Services

**Services:**
```
services/
├── audio/
│   └── soundEffects.ts
├── auth/
│   └── index.ts
├── cache/
│   └── ResponseCache.ts
├── featureFlags/
│   ├── __tests__/
│   │   └── (feature flag tests)
│   ├── FeatureFlagService.ts
│   ├── useFeatureFlag.ts
│   └── index.ts
├── http/                       # (see earlier)
├── menu/                       # (see earlier)
├── metrics/
│   ├── useVoiceOrderingMetrics.ts
│   ├── VoiceOrderingMetrics.ts
│   └── index.ts
├── monitoring/
│   ├── localStorage-manager.ts
│   ├── logger.ts
│   ├── performance.ts
│   └── index.ts
├── orders/                     # (see earlier)
├── performance/
│   └── performanceMonitor.ts
├── realtime/                   # (see earlier)
├── statistics/
│   └── OrderStatisticsService.ts
├── tables/                     # (see earlier)
├── types/
│   └── index.ts
├── utils/
│   ├── __tests__/
│   │   └── caseTransform.test.ts
│   ├── caseTransform.ts
│   ├── EventEmitter.ts
│   └── index.ts
├── voice/                      # (see earlier)
├── websocket/                  # (see earlier)
├── logger.ts
├── secureApi.ts
├── stationRouting.ts
├── stationRouting.test.ts
└── index.ts
```

**Client Utilities:**
```
utils/
├── __tests__/
│   └── fuzzyMenuMatcher.test.ts
├── env.ts
├── fuzzyMenuMatcher.ts
├── fuzzyMenuMatcher.example.ts
├── index.ts
├── motion.ts
├── orderStatusUtils.ts
├── orderStatusValidation.ts
└── validation.ts
```

### 2.15 Test Utils & Setup

```
test-utils/
├── index.tsx                   # Test utilities
├── TestRestaurantProvider.tsx   # Test provider
└── import-meta-setup.js        # Import meta setup
```

**Styles:**
```
styles/
└── design-tokens.css           # Design tokens
```

**Assets:**
```
assets/
└── react.svg
```

### 2.16 Client Test Files Summary

**Total Test Files:** ~40 in client/src + Playwright E2E

**Distribution:**
- Auth: 1 test file
- Contexts: 1 test file  
- Hooks: 8+ test files
- Components: 10+ test files
- Modules: 15+ test files (voice, orders, kitchen, floor-plan)
- Services: 5+ test files
- Utils: 3+ test files

---

## 3. SERVER WORKSPACE: /Users/mikeyoung/CODING/rebuild-6.0/server/src

### 3.1 Entry Point

```
server/src/
└── server.ts                   # Express app initialization
```

### 3.2 Routes (API Endpoints)

```
routes/
├── __tests__/
│   ├── ai.health.test.ts       # AI route tests
│   ├── orders.rctx.test.ts     # Order tests
│   ├── rctx-comprehensive.test.ts
│   ├── payments.test.ts
│   └── security.test.ts
├── index.ts                    # Route aggregation
├── ai.routes.ts                # AI/Voice endpoints
│   └── GET/POST /api/voice/*
│   └── WebSocket /api/realtime
├── auth.routes.ts              # Authentication
│   └── POST /api/auth/login, register, etc.
├── health.routes.ts            # Health checks
│   └── GET /api/health
├── menu.routes.ts              # Menu operations
│   └── GET /api/menu/*
├── metrics.ts                  # Metrics collection
├── orders.routes.ts            # Order management
│   └── GET/POST/PUT /api/orders/*
├── payments.routes.ts          # Payment processing
│   └── POST /api/payments/*
├── realtime.routes.ts          # WebSocket real-time
│   └── WS /api/realtime
├── restaurants.routes.ts       # Restaurant config
├── security.routes.ts          # Security endpoints
├── tables.routes.ts            # Table management
├── terminal.routes.ts          # Terminal (Stripe) operations
├── voice-config.routes.ts      # Voice configuration
└── webhook.routes.ts           # Webhook handlers
```

### 3.3 Services (Business Logic)

```
services/
├── auth/
│   ├── pinAuth.ts              # PIN-based authentication
│   └── stationAuth.ts          # Station authentication
├── ai.service.ts               # AI operations (voice, NLP, TTS)
├── menu.service.ts             # Menu management
├── menu-id-mapper.ts           # Menu ID mapping
├── OrderMatchingService.ts     # Order matching logic
├── orders.service.ts           # Order operations
├── orderStateMachine.ts        # Order state transitions
├── payment.service.ts          # Payment processing
├── scheduledOrders.service.ts  # Scheduled orders
├── table.service.ts            # Table operations
└── voice-config.service.ts     # Voice config management
```

### 3.4 Middleware

**Authentication & Authorization:**
```
middleware/
├── auth.ts                     # JWT/Supabase auth
├── __tests__/
│   ├── auth.test.ts
│   └── restaurantAccess.test.ts
├── rbac.ts                     # Role-based access control
├── restaurantAccess.ts         # Restaurant isolation
└── (middleware tests)
```

**Request Processing:**
```
middleware/
├── validation.ts               # Request validation
├── validate.ts                 # Zod validation middleware
├── fileValidation.ts           # File upload validation
├── requestLogger.ts            # Request logging
├── requestSanitizer.ts         # Request sanitization
└── responseTransform.ts        # Response transformation
```

**Security:**
```
middleware/
├── security.ts                 # General security
├── security-headers.ts         # Security headers
├── csrf.ts                     # CSRF protection
├── webhookSignature.ts         # Webhook verification
├── rateLimiter.ts              # Rate limiting
├── authRateLimiter.ts          # Auth rate limiting
└── metrics.ts                  # Metrics collection
```

**Error Handling:**
```
middleware/
├── errorHandler.ts             # Error handling
└── asyncHandler.ts             # Async wrapper
```

**Other:**
```
middleware/
└── slugResolver.ts             # Slug resolution
```

### 3.5 Configuration

```
config/
├── env.ts                      # Environment loading
├── env.schema.ts               # Environment schema validation
├── database.ts                 # Database connection
├── environment.ts              # Environment-specific config
└── sentry.ts                   # Error tracking
```

### 3.6 AI Subsystem

**Core AI Interfaces:**
```
ai/core/
├── chat.ts                     # Chat interface
├── transcriber.ts              # Speech-to-text interface
├── tts.ts                      # Text-to-speech interface
└── order-nlp.ts                # Natural language order parsing
```

**OpenAI Adapters:**
```
ai/adapters/openai/
├── openai-chat.ts             # GPT chat implementation
├── openai-transcriber.ts       # Whisper/gpt-4o-transcribe
├── openai-tts.ts               # Text-to-speech implementation
├── openai-order-nlp.ts         # Order NLP via GPT
└── utils.ts                    # OpenAI utilities
```

**Stubs (for testing):**
```
ai/stubs/
├── chat.stub.ts
├── transcriber.stub.ts
├── tts.stub.ts
└── order-nlp.stub.ts
```

**Functions & Tools:**
```
ai/functions/
├── realtime-menu-tools.ts      # Menu interaction tools
├── realtime-menu-tools.test.ts
└── tests/
    └── realtime-menu-tools.spec.ts
```

**WebSocket:**
```
ai/voice/                       # Voice WebSocket handling
```

**Main Export:**
```
ai/
└── index.ts                    # AI factory
```

### 3.7 Models

```
models/
└── order.model.ts              # Order data model
```

### 3.8 Mappers (Data Transformation)

```
mappers/
├── cart.mapper.ts              # Cart DTO mapping
└── menu.mapper.ts              # Menu DTO mapping
```

### 3.9 Utilities

```
utils/
├── logger.ts                   # Structured logging
├── websocket.ts                # WebSocket utilities
├── case.ts                     # Case conversion utilities
└── env.ts                      # Environment utilities
```

### 3.10 Validation

```
validation/
└── ai.validation.ts            # AI request validation
```

### 3.11 Test Utils

```
test-utils/
└── index.ts                    # Testing utilities
```

### 3.12 Server Test Distribution

**Total Test Files:** ~60 in server

**Locations:**
- `/server/tests/` - Integration & contract tests
  - `config/` - 1 file (env validation)
  - `security/` - 9 files (auth, CSRF, CORS, RLS, etc.)
  - `contracts/` - 3 files (order, payment, boundary)
  - `services/` - 3 files (payment, audit, etc.)
  - `routes/` - 1 file (order auth)
  - `guards/` - 1 file
  - `enhanced/` - 1 file (login diagnostic)
  - Other: 3+ files (memory, multi-tenancy, rate limit)

- `/server/src/` - Unit tests co-located
  - `middleware/__tests__/` - 2 files
  - `routes/__tests__/` - 5 files
  - `ai/functions/` - 2 files (tests & specs)

---

## 4. SHARED WORKSPACE: /Users/mikeyoung/CODING/rebuild-6.0/shared

### 4.1 Main Source Files

```
shared/src/
├── voice-types.ts              # Voice typing definitions
└── voice/
    └── PromptConfigService.ts  # Voice prompt configuration
```

### 4.2 Type Definitions

```
shared/types/
├── index.ts                    # Type exports
├── api.types.ts                # API contract types
├── customer.types.ts           # Customer types
├── events.types.ts             # Event types
├── filters.types.ts            # Filter types
├── menu.types.ts               # Menu types
├── order.types.ts              # Order types
├── orders.ts                   # Order list types
├── station.types.ts            # Station types
├── table.types.ts              # Table types
├── unified-order.types.ts      # Unified order structure
├── validation.ts               # Validation types
├── voice.types.ts              # Voice types
└── websocket.types.ts          # WebSocket event types
```

### 4.3 API Contracts

```
shared/contracts/
├── order.ts                    # Order contract/shape
└── payment.ts                  # Payment contract/shape
```

### 4.4 Utilities

```
shared/utils/
├── browser-only.ts             # Browser-only utilities
├── cleanup-manager.ts          # Cleanup management
├── error-handling.ts           # Error handling utilities
├── memory-monitoring.ts        # Memory monitoring
├── performance-hooks.ts        # Performance hooks
├── react-performance.ts        # React performance utils
├── websocket-pool.ts           # WebSocket pooling
├── websocket-pool.browser.ts   # Browser WebSocket pool
└── index.ts
```

### 4.5 Constants

```
shared/constants/                # Shared constants
```

### 4.6 Configuration

```
shared/config/                   # Shared configuration
```

### 4.7 Validation

```
shared/validation/               # Shared validation rules
```

### 4.8 Monitoring

```
shared/monitoring/               # Monitoring utilities
```

### 4.9 Root Level Exports

```
shared/
├── index.ts                    # Main export file
├── runtime.ts                  # Runtime utilities
├── cart.ts                     # Cart utilities
└── env.ts                      # Environment utilities
```

---

## 5. END-TO-END TEST SUITE: /Users/mikeyoung/CODING/rebuild-6.0/tests

### 5.1 Structure

```
tests/
├── a11y/
│   └── accessibility.spec.ts
├── api/
│   └── restaurant-api.spec.ts
├── e2e/                         # Main E2E tests (Playwright)
│   ├── auth/
│   │   ├── login.smoke.spec.ts
│   │   └── login.spec.ts
│   ├── kds/
│   │   └── kitchen-display.smoke.spec.ts
│   ├── orders/
│   │   └── server-order-flow.smoke.spec.ts
│   ├── basic-routes.spec.ts     # Smoke test
│   ├── card-payment.spec.ts
│   ├── cash-payment.spec.ts
│   ├── checkout-flow.spec.ts
│   ├── checkout-smoke.spec.ts
│   ├── debug-blank-page.spec.ts
│   ├── e2e-kds-realtime.spec.ts
│   ├── kds-websocket-race-conditions.spec.ts
│   ├── multi-seat-ordering.spec.ts
│   ├── production-auth-test.spec.ts
│   ├── production-auth-test-v2.spec.ts
│   ├── production-complete-flow.spec.ts
│   ├── production-serverview-detailed.spec.ts
│   ├── production-serverview-interaction.spec.ts
│   ├── production-serverview-test.spec.ts
│   ├── server-touch-voice-ordering.spec.ts
│   ├── viewport-test.spec.ts
│   ├── voice-order.spec.ts
│   ├── voice-ordering-debug.spec.ts
│   ├── voice-ordering.spec.ts
│   ├── workspace-auth-flow.spec.ts
│   └── workspace-landing.spec.ts
├── performance/
│   ├── lighthouse.spec.ts
│   └── ordering-performance.spec.ts
└── visual/
    └── homepage.spec.ts
```

**Total E2E Tests:** 31 Playwright spec files

---

## 6. TEST QUARANTINE: /Users/mikeyoung/CODING/rebuild-6.0/test-quarantine

```
test-quarantine/
├── auth/
├── shared/
├── voice/
└── orders/
```

(Temporarily disabled tests being debugged)

---

## 7. SUBSYSTEM SUMMARY WITH CLIENT/SERVER SPLIT

### Authentication

**Client:** 
- `/client/src/contexts/AuthContext.tsx`, `RoleContext.tsx`
- `/client/src/components/auth/*` (UI)
- `/client/src/services/auth/` (service layer)

**Server:**
- `/server/src/routes/auth.routes.ts` (endpoints)
- `/server/src/services/auth/` (pinAuth, stationAuth)
- `/server/src/middleware/auth.ts` (JWT verification)
- `/server/src/middleware/rbac.ts` (role checks)

### Orders Management

**Client:**
- `/client/src/modules/orders/` (display & interactions)
- `/client/src/pages/CheckoutPage.tsx`
- `/client/src/services/orders/` (OrderService, OrderHistoryService)
- `/client/src/modules/order-system/` (checkout flow)

**Server:**
- `/server/src/routes/orders.routes.ts` (CRUD endpoints)
- `/server/src/services/orders.service.ts` (business logic)
- `/server/src/services/orderStateMachine.ts` (state transitions)
- `/server/src/models/order.model.ts` (data model)

### Menu System

**Client:**
- `/client/src/modules/menu/` (display)
- `/client/src/services/menu/MenuService.ts` (API)
- `/client/src/utils/fuzzyMenuMatcher.ts` (search/matching)

**Server:**
- `/server/src/routes/menu.routes.ts` (endpoints)
- `/server/src/services/menu.service.ts` (operations)
- `/server/src/services/menu-id-mapper.ts` (ID mapping)
- `/server/src/mappers/menu.mapper.ts` (DTO transformation)

### Kitchen Display System (KDS)

**Client:**
- `/client/src/modules/kitchen/` (UI components)
- `/client/src/pages/KitchenDisplayOptimized.tsx` (main view)
- `/client/src/hooks/useKitchenOrdersRealtime.ts` (real-time)

**Server:**
- `/server/src/routes/orders.routes.ts` (order endpoints)
- `/server/src/routes/realtime.routes.ts` (WebSocket)
- WebSocket order updates via realtime channel

### Voice Ordering

**Client:**
- `/client/src/modules/voice/` (comprehensive module)
  - Components, hooks, services, types
- `/client/src/pages/components/VoiceOrderModal.tsx`
- `/client/src/components/kiosk/VoiceOrderingMode.tsx`

**Server:**
- `/server/src/routes/ai.routes.ts` (voice endpoints)
- `/server/src/routes/voice-config.routes.ts` (config)
- `/server/src/services/ai.service.ts` (AI operations)
- `/server/src/ai/` (AI core + adapters + functions)
  - Core: chat, transcriber, TTS, order-NLP
  - Adapters: OpenAI implementations
  - Functions: menu tools for voice
- `/server/src/services/voice-config.service.ts`

### Payments

**Client:**
- `/client/src/components/payments/` (UI)
  - TenderSelection, CardPayment, CashPayment

**Server:**
- `/server/src/routes/payments.routes.ts` (endpoints)
- `/server/src/services/payment.service.ts` (logic)
- `/server/src/routes/terminal.routes.ts` (Square terminal)
- Webhook handlers in `/server/src/routes/webhook.routes.ts`

### Tables & Floor Plan

**Client:**
- `/client/src/modules/floor-plan/` (visualization)
  - Components, hooks, services
- `/client/src/services/tables/TableService.ts` (API)

**Server:**
- `/server/src/routes/tables.routes.ts` (CRUD)
- `/server/src/services/table.service.ts` (business logic)

### Real-time Updates (WebSocket)

**Client:**
- `/client/src/services/websocket/` (WebSocket management)
  - WebSocketService, ConnectionManager, orderUpdates
- `/client/src/services/realtime/orderSubscription.ts`

**Server:**
- `/server/src/routes/realtime.routes.ts` (WS handler)
- `/server/src/utils/websocket.ts` (utilities)

---

## 8. COMPREHENSIVE TEST DISTRIBUTION

### Client Tests (40+ files)

| Category | Count | Location |
|----------|-------|----------|
| Auth | 1 | contexts/__tests__ |
| Hooks | 8+ | hooks/__tests__, modules/*/hooks/__tests__ |
| Components | 10+ | components/*/__tests__, modules/*/components/__tests__ |
| Modules | 15+ | modules/voice, modules/orders, modules/kitchen, modules/floor-plan |
| Services | 5+ | services/**/__tests__ |
| Utils | 3+ | utils/__tests__ |
| Pages | 3+ | pages/__tests__ |

### Server Tests (60+ files)

| Category | Count | Location |
|----------|-------|----------|
| Security | 9 | tests/security/ |
| Config | 1 | tests/config/ |
| Contracts | 3 | tests/contracts/ |
| Services | 3 | tests/services/ |
| Routes | 5 | src/routes/__tests__, tests/routes/ |
| Middleware | 2 | src/middleware/__tests__ |
| AI | 2 | src/ai/functions/ |
| Other | 10+ | Various |

### E2E Tests (31 Playwright specs)

| Category | Count |
|----------|-------|
| Auth | 2 |
| Checkout | 3 |
| Kitchen (KDS) | 2 |
| Voice Ordering | 4 |
| Payments | 2 |
| Full Flows | 6 |
| Performance | 2 |
| Other | 8 |

**Total:** 119 test files

---

## 9. KEY ARCHITECTURAL PATTERNS

### 1. Dual Auth Pattern (ADR-006)

**Client:**
- Checks Supabase auth (primary)
- Falls back to localStorage JWT (demo users, PIN, station)

**Server:**
- Validates both sources
- Enforces restaurant_id isolation via RLS policies

### 2. Snake_case Convention (ADR-001)

**All layers:** Database, API, Client
- No camelCase transformations
- Enforced by: `ResponseTransform` middleware + mappers

### 3. Remote-First Database (ADR-010)

**Source of Truth:** Supabase remote DB
- Prisma schema generated via `npx prisma db pull`
- Migrations document history
- Never manually edit schema

### 4. Multi-Tenancy (Every operation includes restaurant_id)

**Enforcement Points:**
- Database: RLS policies
- API: restaurantAccess middleware
- Client: Restaurant context provider

### 5. Unified HTTP Client

**Single source:** `services/http/httpClient.ts`
- No direct fetch() calls
- Request batching support
- Unified error handling

### 6. WebSocket Pooling

**Implementation:** `shared/utils/websocket-pool.ts`
- Connection pooling for performance
- Single WebSocket per app instance
- Event-based subscriptions

---

## 10. MAJOR MODULES & FILE COUNTS

| Module | Client Files | Server Files | Tests | Notes |
|--------|--------------|--------------|-------|-------|
| Auth | 8 | 3 | 2 | Dual auth pattern |
| Orders | 45+ | 8 | 12+ | Complex state machine |
| Menu | 8 | 4 | 3 | Fuzzy matching, caching |
| KDS | 15 | 2 | 4+ | Virtual scrolling, real-time |
| Voice | 35+ | 18 | 10+ | WebRTC, AI, state machine |
| Payments | 5 | 3 | 3 | Card, cash, webhooks |
| Tables/FloorPlan | 18 | 3 | 2 | Canvas-based, persistence |
| WebSocket | 6 | 2 | 1 | Pooling, subscriptions |
| AI Core | - | 12 | 2 | Chat, TTS, transcriber, NLP |
| Middleware | - | 15 | 2 | Auth, RBAC, security |

---

## 11. DATABASE MIGRATION & SCHEMA

**Remote-First Approach:**

```
supabase/
└── migrations/
    └── (history only)

prisma/
├── schema.prisma               # GENERATED from remote
└── migrations/
    └── (local history)
```

**Commands:**
```bash
npx prisma db pull             # Sync schema from Supabase
npm run db:push                # Push migrations
npm run db:seed                # Seed data
```

---

## 12. DOCUMENTATION STRUCTURE

```
docs/
├── API Documentation (95% accuracy)
├── Architecture Decisions (ADRs)
├── Operational Guide
├── Incident Response
├── Monitoring
└── (69 doc files)

Link Health: 97.4% (161 links repaired in phase-1)
```

---

## 13. SUMMARY STATISTICS

- **Total TypeScript/TSX Files:** 400+
- **Total Test Files:** 119
- **Test Pass Rate:** 85%+
- **Lines of Type Definitions:** 3,000+
- **Monorepo Workspaces:** 4 (client, server, shared, supabase)
- **API Routes:** 15 route files
- **Services:** 15+ services per workspace
- **Components:** 100+ UI components
- **Modules:** 9 major feature modules
- **Hooks:** 40+ custom hooks

---

## 14. QUICK REFERENCE: KEY FILE LOCATIONS

| Task | Files |
|------|-------|
| Add new API endpoint | `/server/src/routes/*.ts` → service in `/server/src/services/` |
| Add new page | `/client/src/pages/NewPage.tsx` → route in `/client/src/routes/` |
| Add new component | `/client/src/components/` → with optional `__tests__/` subdirectory |
| Add new type | `/shared/types/new.types.ts` → export in `/shared/types/index.ts` |
| Add voice feature | `/client/src/modules/voice/` → `/server/src/ai/` |
| Add middleware | `/server/src/middleware/new.ts` → register in `/server/src/server.ts` |
| Add hook | `/client/src/hooks/useNewHook.ts` → optional test in `__tests__/` |
| Add test | Colocate with code: `.test.ts` or in `__tests__/` subdirectory |

