# Architecture Analysis Report: rebuild-6.0

**Agent**: C1 - Architecture & North Star Convergence
**Date**: 2025-12-26
**Repository**: rebuild-6.0 (Restaurant OS)

## Executive Summary

The rebuild-6.0 codebase demonstrates **strong architectural foundations** with clear separation of concerns between client/server/shared. The adoption of ADR-001 (snake_case convention) and proper use of the shared workspace for types creates a solid foundation. However, there are opportunities for deeper North Star alignment through better contract enforcement and reducing duplicated logic.

**Overall Architecture Health**: 85/100
**North Star Convergence**: 70/100

---

## Analysis by Category

### 1. Boundaries (Client/Server/Shared Separation)

### [Strong: Shared Types Package]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/`
- **Current State**: Well-organized with unified type exports via barrel files. Types like `Order`, `OrderStatus`, `OrderItem`, `MenuItem` are imported consistently across 79+ files using `from '@rebuild/shared'`.
- **North Star Pattern**: Single source of truth for cross-boundary types
- **Gap**: None significant - this is well implemented
- **Convergence Effort**: N/A (already aligned)
- **Priority**: N/A

### [Strong: API Client Singleton]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/http/httpClient.ts`
- **Current State**: Single unified HTTP client with authentication, restaurant ID injection, caching, and tenant isolation. All client-side API calls go through this client.
- **North Star Pattern**: Single point of integration for API concerns
- **Gap**: None - clean implementation with proper cache invalidation per tenant
- **Convergence Effort**: N/A
- **Priority**: N/A

---

### 2. Duplication Analysis

### [Issue: Duplicate Order State Machine Implementations]
- **Location**:
  - Server: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orderStateMachine.ts`
  - Client: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/payments/PaymentStateMachine.ts`
- **Current State**: Two separate state machine implementations - one for order status (server) and one for payment flow (client). While they serve different purposes, the state machine pattern itself is duplicated.
- **North Star Pattern**: Shared state machine infrastructure in `shared/` with domain-specific configurations
- **Gap**: State machine logic could be abstracted into a shared utility with domain-specific transition tables
- **Convergence Effort**: M
- **Priority**: P3 (nice-to-have, both work correctly)

### [Issue: Duplicate Tax Rate Lookup]
- **Location**:
  - `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orders.service.ts` (lines 87-152)
  - `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/payment.service.ts` (lines 39-76)
- **Current State**: Both services implement their own `getRestaurantTaxRate()` method with slightly different fallback logic. OrdersService throws on missing tax rate; PaymentService returns a default.
- **North Star Pattern**: Single tax rate lookup function in a shared service or util
- **Gap**: Divergent behavior could cause pricing inconsistencies. Comment in PaymentService acknowledges this: "MUST match OrdersService.getRestaurantTaxRate()"
- **Convergence Effort**: S
- **Priority**: P1 (financial logic must be consistent)

### [Issue: Logger Import Path Inconsistency]
- **Location**: Various client-side files
- **Current State**: Logger imports use two paths:
  - `@/services/logger` (most common)
  - `@/services/monitoring/logger` (some files)
- **North Star Pattern**: Single canonical import path
- **Gap**: Minor inconsistency - both resolve to same logger, but creates confusion
- **Convergence Effort**: S
- **Priority**: P3

---

### 3. API Contracts

### [Strong: Zod Validation Schemas]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/contracts/`
- **Current State**:
  - `order.ts`: OrderPayload schema with comprehensive validation
  - `payment.ts`: PaymentPayload and CashPaymentPayload schemas
  - Used via `validateBody()` middleware in routes
- **North Star Pattern**: Contract-first API design with shared validation
- **Gap**: Good foundation, but contracts only cover POST bodies. No contracts for GET query params or response shapes.
- **Convergence Effort**: M
- **Priority**: P2

### [Issue: Response Type Loose Typing]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/orders/OrderService.ts`
- **Current State**: API responses typed as `any` (line 51: `httpClient.get<any>`), then manually mapped to Order type
- **North Star Pattern**: Strongly typed API responses matching shared contracts
- **Gap**: Type safety breaks at API boundary despite having shared types available
- **Convergence Effort**: S
- **Priority**: P2

---

### 4. Layering (Routes -> Services -> Data)

### [Strong: Server-Side Layering]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/`
- **Current State**: Clean separation:
  - `routes/` - HTTP handling, auth, validation
  - `services/` - Business logic (OrdersService, PaymentService)
  - `config/database.ts` - Data access (Supabase)
- **North Star Pattern**: Proper layered architecture
- **Gap**: Services directly access database - no repository layer. This is acceptable for current scale.
- **Convergence Effort**: L (if ever needed)
- **Priority**: P3

### [Strong: Middleware Chain]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/`
- **Current State**: Consistent middleware ordering:
  1. `authenticate` / `optionalAuth`
  2. `validateRestaurantAccess`
  3. `requireScopes`
  4. `validateBody`
- **North Star Pattern**: Declarative middleware composition
- **Gap**: None - well implemented
- **Convergence Effort**: N/A
- **Priority**: N/A

---

### 5. Dependency Direction

### [Strong: Shared Independence]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/package.json`
- **Current State**: Shared package has minimal dependencies: `typescript`, `date-fns`, `dotenv`, `zod`. No imports from client or server.
- **North Star Pattern**: Shared depends on nothing, everything depends on shared
- **Gap**: None - correct dependency direction maintained
- **Convergence Effort**: N/A
- **Priority**: N/A

### [Issue: Browser-Only Utils in Shared]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/index.ts`
- **Current State**: Memory monitoring and cleanup manager utilities are commented out with "DISABLED FOR SERVER BUILD - uses browser APIs"
- **North Star Pattern**: Shared utils should be environment-agnostic, or split into `/shared/utils/browser/` and `/shared/utils/node/`
- **Gap**: Dead code in shared package, unclear where browser-only utils should live
- **Convergence Effort**: S
- **Priority**: P3

---

### 6. Type Safety Across Boundaries

### [Strong: OrderStatus Type Sharing]
- **Location**:
  - Defined: `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/order.types.ts`
  - Used: Server routes, services, client components
- **Current State**: Single `OrderStatus` type used consistently. Server's orderStateMachine imports from shared.
- **North Star Pattern**: Types flow from shared to all consumers
- **Gap**: None
- **Convergence Effort**: N/A
- **Priority**: N/A

### [Issue: Service-Layer Type Extensions]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orders.service.ts` (lines 27-69)
- **Current State**: Service defines its own `Order` and `OrderFilters` interfaces that extend/modify shared types:
  ```typescript
  export interface Order extends Omit<SharedOrder, 'order_number' | 'total' | ...> {
    restaurantId: string; // Maps to restaurant_id
    orderNumber: string;  // Maps to order_number
    ...
  }
  ```
- **North Star Pattern**: Shared types should be complete enough that services don't need extensions
- **Gap**: Service-specific type extensions introduce camelCase variants that contradict ADR-001 (snake_case everywhere)
- **Convergence Effort**: M
- **Priority**: P2 (type confusion across layers)

### [Issue: camelCase Remnants in Request Handling]
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/contracts/order.ts` (lines 33-54)
- **Current State**: OrderPayload schema accepts both snake_case AND camelCase variants:
  ```typescript
  customer_name: z.string().optional(),
  customerName: z.string().optional(), // camelCase variant
  ```
- **North Star Pattern**: Single consistent case convention (ADR-001: snake_case)
- **Gap**: Dual acceptance creates confusion about canonical format
- **Convergence Effort**: M (breaking change for clients still sending camelCase)
- **Priority**: P2

---

## North Star Alignment Summary

### Compounding Engineering Patterns Observed

| Pattern | Status | Notes |
|---------|--------|-------|
| Plan -> Work -> Review -> Codify | Partial | `.claude/lessons/` codifies learnings, but no formal plan templates |
| Multi-agent parallel review | Not observed | No evidence of structured multi-agent review |
| File-based todo tracking | Present | `.claude/memories/orchestration/` files track state |
| Lessons learned codification | Strong | 15+ lessons in `.claude/lessons/` with standard format |
| Clear boundaries | Strong | Client/server/shared well separated |

### Recommended Safe Steps Toward Alignment

**P1 - Immediate (prevents financial bugs)**
1. Extract `getRestaurantTaxRate()` to a shared service or util, unify fallback behavior
2. Add TypeScript return type annotations to service methods

**P2 - Short-term (improves developer experience)**
3. Type API responses in client services (replace `<any>` with shared types)
4. Remove camelCase variants from Zod schemas after confirming no clients use them
5. Clean up service-layer type extensions to match shared types

**P3 - Medium-term (nice-to-have)**
6. Standardize logger import paths
7. Move browser-only utils to client package
8. Consider extracting state machine pattern to shared

---

## Architecture Diagram (Current)

```
                                    +-------------------+
                                    |   shared/         |
                                    |   - types/        |
                                    |   - contracts/    |
                                    |   - utils/        |
                                    +--------+----------+
                                             |
                    +------------------------+------------------------+
                    |                                                 |
           +--------v----------+                           +----------v--------+
           |    client/        |                           |    server/        |
           |  - services/      |                           |  - routes/        |
           |    - http/        |  HTTP + WebSocket         |  - services/      |
           |    - orders/      | <-----------------------> |  - middleware/    |
           |    - payments/    |                           |  - config/        |
           |  - contexts/      |                           +-------------------+
           |  - components/    |                                    |
           +-------------------+                                    v
                                                           +-------------------+
                                                           |   Supabase        |
                                                           |   (PostgreSQL)    |
                                                           +-------------------+
```

---

## Files Analyzed

### Shared Package
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/index.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/order.types.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/contracts/order.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/contracts/payment.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/transformers.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/index.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/package.json`

### Server Package
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/payments.routes.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orders.service.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/payment.service.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orderStateMachine.ts`

### Client Package
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/http/httpClient.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/orders/OrderService.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/payments/PaymentStateMachine.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/contexts/AuthContext.tsx`

### Project Configuration
- `/Users/mikeyoung/CODING/rebuild-6.0/.claude/lessons/README.md`
- `/Users/mikeyoung/CODING/rebuild-6.0/CLAUDE.md`

---

## Appendix: Issue Priority Matrix

| ID | Issue | Impact | Effort | Priority |
|----|-------|--------|--------|----------|
| TAX-DUP | Duplicate tax rate lookup | Financial accuracy | S | P1 |
| TYPE-LOOSE | Loose API response typing | Type safety | S | P2 |
| CASE-DUAL | camelCase/snake_case dual acceptance | Developer confusion | M | P2 |
| SVC-TYPES | Service-layer type extensions | Type confusion | M | P2 |
| LOG-PATH | Logger import inconsistency | Minor DX | S | P3 |
| UTILS-ENV | Browser utils in shared | Dead code | S | P3 |
| SM-DUP | Duplicate state machine pattern | Code reuse | M | P3 |
