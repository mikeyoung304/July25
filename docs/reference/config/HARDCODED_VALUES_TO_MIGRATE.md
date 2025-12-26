# Hardcoded Values Migration Reference

**Purpose**: Catalog of all hardcoded configuration values discovered during Architectural Audit V2
**Target**: Move these values to `restaurants` table config columns or environment variables
**Priority**: Based on multi-tenant impact and change frequency

---

## Summary Statistics

| Category | Count | Priority | Target Location |
|----------|-------|----------|----------------|
| **Alert Thresholds** | 19 | Critical | `restaurants.kds_config` JSON |
| **Menu Item Names** | 25 | Critical | Remove (fetch from menu API) |
| **Prices** | 22 | Critical | Remove (fetch from menu API) |
| **Tax Rates** | 7 | High | `restaurants.tax_rate` |
| **Timeout Values** | 12 | High | Environment variables |
| **Role/Status Strings** | 23 | Medium | `shared/constants/*.ts` |
| **Color Codes** | 31 | Low | `shared/styles/theme.ts` |
| **URL Endpoints** | 8 | Medium | Environment variables |
| **Feature Flags** | 6 | High | `restaurants.feature_flags` JSON |
| **TOTAL** | **153** | - | - |

---

## Priority 1: Critical (Must Migrate) - Multi-Tenant Blockers

### 1.1 KDS Alert Thresholds (19 instances across 7 files)

**Current State**: Different hardcoded values in each component
**Problem**: Single McDonald's and fine dining share same 15-minute alert
**Solution**: Per-restaurant configuration

| File | Line | Current Value | Variable Name |
|------|------|---------------|---------------|
| `KitchenDisplayOptimized.tsx` | 105 | `15` minutes | `URGENT_THRESHOLD` |
| `OrderCard.tsx` | 28 | `15` minutes | Red alert |
| `OrderCard.tsx` | 31 | `10` minutes | Yellow alert |
| `TouchOptimizedOrderCard.tsx` | 86 | `20` minutes | Critical |
| `TouchOptimizedOrderCard.tsx` | 90 | `15` minutes | Urgent |
| `TouchOptimizedOrderCard.tsx` | 92 | `10` minutes | Warning |
| `ExpoPage.tsx` | 37 | `20` minutes | Ready order late |
| `TableGroupCard.tsx` | 35 | `20` minutes | Urgent styling |
| `TableGroupCard.tsx` | 36 | `15` minutes | Warning styling |
| `useTableGrouping.ts` | 153 | `30` minutes | Critical level |
| `useTableGrouping.ts` | 155 | `20` minutes | Urgent level |
| `useTableGrouping.ts` | 157 | `15` minutes | Warning level |
| `useOrderGrouping.ts` | 136 | `25` minutes | Critical ⚠️ DIFFERENT |
| `useOrderGrouping.ts` | 139 | `18` minutes | Urgent ⚠️ DIFFERENT |
| `useOrderGrouping.ts` | 141 | `12` minutes | Warning ⚠️ DIFFERENT |

**Migration Plan**:
```sql
-- Add to restaurants table
ALTER TABLE restaurants ADD COLUMN kds_config JSONB DEFAULT '{
  "alert_thresholds": {
    "warning_minutes": 15,
    "urgent_minutes": 20,
    "critical_minutes": 30
  },
  "ready_order_timeout_minutes": 20,
  "auto_refresh_seconds": 30
}'::jsonb;
```

**Usage**:
```typescript
// shared/config/kdsThresholds.ts
export async function getKDSThresholds(restaurantId: string): Promise<KDSThresholds> {
  const { kds_config } = await fetchRestaurantConfig(restaurantId);
  return kds_config.alert_thresholds;
}
```

---

### 1.2 Voice Ordering Menu Items (25 hardcoded items)

**Current State**: Menu item names hardcoded in voice parser
**File**: `client/src/modules/voice/services/orderIntegration.ts` (Lines 26-58)
**Problem**: Only works for one restaurant's menu

```typescript
// CURRENT (WRONG):
const menuItems = [
  { pattern: /soul\s*bowl/gi, name: 'Soul Bowl' },
  { pattern: /chicken\s*fajita/gi, name: 'Chicken Fajita Keto' },
  { pattern: /peach.*caprese/gi, name: 'Peach & Prosciutto Caprese' },
  // ... 22 more hardcoded items
]
```

**Migration Plan**: Remove hardcoded items, fetch from menu API
```typescript
// NEW (CORRECT):
export class VoiceMenuMatcher {
  private menuItems: MenuItem[] = [];

  async initialize(restaurantId: string) {
    this.menuItems = await fetchMenu(restaurantId);
  }

  matchItem(spokenText: string): MenuItem | null {
    // Use fuzzy matching against live menu
    return fuzzyMatch(spokenText, this.menuItems);
  }
}
```

**Impact**: Enables voice ordering for all restaurants

---

### 1.3 Menu Item Prices (22 hardcoded prices)

**Current State**: Prices hardcoded in voice integration
**File**: `client/src/modules/voice/services/orderIntegration.ts` (Lines 194-220)
**Problem**: Prices will diverge from database

```typescript
// CURRENT (WRONG):
const prices: Record<string, number> = {
  'Summer Sampler': 16,
  'Peach & Prosciutto Caprese': 12,
  'Watermelon Tataki': 12,
  // ... 19 more prices
}
```

**Migration Plan**: Lookup from fetched menu
```typescript
// NEW (CORRECT):
calculateItemPrice(itemName: string): number {
  const item = this.menuItems.find(i => i.name === itemName);
  if (!item) throw new Error(`Menu item not found: ${itemName}`);
  return item.price;
}
```

---

### 1.4 Tip Percentages (4 instances)

**Current State**: Hardcoded [15, 18, 20, 25]
**Files**:
- `client/src/modules/order-system/components/TipSlider.tsx` (Line 16)
- `shared/constants/business.ts` (Line 34) - defined but not used

**Problem**: International restaurants need different defaults

**Migration Plan**:
```sql
ALTER TABLE restaurants ADD COLUMN tip_percentages INTEGER[] DEFAULT '{15,18,20,25}';
```

**Usage**:
```typescript
const { tipPercentages = [15, 18, 20, 25] } = useRestaurantConfig(restaurantId);
```

---

## Priority 2: High (Should Migrate) - Operational Impact

### 2.1 Payment Timeouts (5 instances)

| File | Line | Value | Purpose |
|------|------|-------|---------|
| `useSquareTerminal.ts` | 105 | `300000` ms (5 min) | Terminal checkout timeout |
| `useSquareTerminal.ts` | 105 | `2000` ms | Terminal polling interval |
| `payments.routes.ts` | 50 | `30000` ms | Stripe API call timeout |
| `WebSocketService.ts` | 40 | `30000` ms | Client heartbeat |
| `server/utils/websocket.ts` | 34 | `60000` ms | Server heartbeat |

**Migration Plan**:
```bash
# Environment variables
STRIPE_PAYMENT_TIMEOUT_MS=300000
STRIPE_POLLING_INTERVAL_MS=2000
STRIPE_API_TIMEOUT_MS=30000
WS_CLIENT_HEARTBEAT_MS=30000
WS_SERVER_HEARTBEAT_MS=60000
```

---

### 2.2 Tax Rates (7 instances despite ADR-007)

**Already has solution in place** but not fully adopted:

| File | Line | Value | Status |
|------|------|-------|--------|
| `shared/constants/business.ts` | 27 | `0.0825` | ✅ Central definition |
| `VoiceOrderProcessor.ts` | 171 | `0.08` | ❌ Hardcoded default param |
| `orderSubscription.ts` | 154 | `0.08` | ❌ Mock data |
| `multi-seat-orders.ts` | 161 | `0.08` | ❌ Test fixture |
| `OrderHistoryService.ts` | 31 | `0.08` | ❌ Mock data |

**Migration Plan**: Enforce use of `DEFAULT_TAX_RATE` constant everywhere, remove default parameter in `VoiceOrderProcessor.submitCurrentOrder()`.

---

### 2.3 Order Timeout/Estimate Times (4 instances)

| File | Line | Value | Type |
|------|------|-------|------|
| `orderStateMachine.ts` | 230 | `30` sec | new→pending |
| `orderStateMachine.ts` | 232 | `900` sec (15 min) | preparing→ready |
| `useKioskOrderSubmission.ts` | 77 | `'10-15 minutes'` | Display string |
| `useOrderGrouping.ts` | 149 | `8` min base + `3` min per item | Estimated prep |

**Migration Plan**:
```sql
ALTER TABLE restaurants ADD COLUMN order_timing_config JSONB DEFAULT '{
  "avg_prep_time_minutes": 15,
  "min_prep_time_minutes": 10,
  "time_per_item_minutes": 3,
  "estimate_display_format": "10-15 minutes"
}'::jsonb;
```

---

## Priority 3: Medium (Nice to Have) - Developer Experience

### 3.1 Role/Status Magic Strings (23 instances)

**Current State**: Strings repeated across files
**Files affected**: 8 files (RBAC.ts, demoCredentials.ts, DevAuthOverlay.tsx, etc.)

**Migration Plan**: Create enums/constants
```typescript
// shared/auth/roles.ts
export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  SERVER = 'server',
  CASHIER = 'cashier',
  KITCHEN = 'kitchen',
  EXPO = 'expo',
  CUSTOMER = 'customer'
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.OWNER]: 'Owner',
  [UserRole.MANAGER]: 'Manager',
  // ...
};
```

---

### 3.2 Demo Mode Credentials (4 instances)

**Current State**: Plain-text passwords in 3 files
**File**: `client/src/config/demoCredentials.ts` (Lines 32-62)

```typescript
// CURRENT (INSECURE):
workspaceCredentials: {
  email: 'server@restaurant.com',
  password: 'Demo123!'  // ⚠️ Committed to git
}
```

**Migration Plan**:
```bash
# Environment variables
DEMO_SERVER_EMAIL=server@restaurant.com
DEMO_SERVER_PASSWORD=Demo123!
DEMO_KITCHEN_EMAIL=kitchen@restaurant.com
DEMO_KITCHEN_PASSWORD=Demo456!
```

---

### 3.3 Stripe Environment URLs

**Current State**: Stripe uses a single SDK URL for both test and production modes.
**Files**:
- `CardPayment.tsx`: Uses Stripe Elements with `@stripe/react-stripe-js`

**Migration Plan**:
```typescript
// shared/constants/stripe.ts
// Stripe uses the same SDK URL for both test and production
// Mode is determined by the API key (pk_test_* vs pk_live_*)
export const STRIPE_SDK_URL = 'https://js.stripe.com/v3/';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripe = loadStripe(publishableKey);
```

---

## Priority 4: Low (Cosmetic) - UX Consistency

### 4.1 Color Codes (31 instances across KDS components)

**Current State**: Tailwind classes hardcoded
**Files affected**: OrderCard.tsx, TouchOptimizedOrderCard.tsx, TableGroupCard.tsx

**Migration Plan**:
```typescript
// shared/styles/kdsColors.ts
export const KDS_COLORS = {
  NORMAL: {
    text: 'text-green-600',
    bg: 'bg-white',
    border: 'border-gray-200'
  },
  WARNING: {
    text: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300'
  },
  URGENT: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300'
  }
} as const;
```

---

### 4.2 Display Text Strings (12 instances)

**Examples**:
- "Complete Order" vs "Mark Ready" vs "Mark as Picked Up"
- "Dine-In" vs "Online" vs "Takeout" display labels
- "Processing..." vs "Creating order..." button text

**Migration Plan**:
```typescript
// shared/constants/displayText.ts
export const KDS_ACTION_LABELS = {
  MARK_READY: 'Complete Order',
  MARK_PICKED_UP: 'Mark as Picked Up',
  MARK_SENT: 'Mark as Sent'
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  online: 'Online',
  pickup: 'Takeout',
  delivery: 'Delivery',
  'dine-in': 'Dine-In'
};
```

---

## Migration Strategy

### Phase 1: Critical Restaurant Config (Week 1-2)
1. Create `restaurants` table columns:
   - `kds_config` (JSONB)
   - `order_timing_config` (JSONB)
   - `tip_percentages` (INTEGER[])
2. Migrate existing restaurants with defaults
3. Update code to read from DB

### Phase 2: Voice Menu Dynamization (Week 3)
1. Remove 47 hardcoded menu values
2. Implement dynamic menu fetching
3. Test voice ordering with multiple restaurants

### Phase 3: Environment Variables (Week 4)
1. Add timeout/URL environment variables
2. Update Docker configs and .env.example
3. Document in ENVIRONMENT.md

### Phase 4: Constants Extraction (Week 5)
1. Create shared constant files
2. Replace magic strings with enums
3. Update imports across codebase

### Phase 5: Demo Credentials Security (Week 6)
1. Move credentials to environment variables
2. Add startup check: error if production + demo panel enabled
3. Document rotation procedure

---

## Testing Checklist

For each migrated value:
- [ ] Unit test with old hardcoded value
- [ ] Unit test with new config value
- [ ] Integration test with multiple restaurants
- [ ] Verify default fallback behavior
- [ ] Document in API reference

---

## Rollout Plan

### Stage 1: Feature Flag (Week 1)
- Add `USE_DYNAMIC_CONFIG` feature flag
- Both old and new code paths active
- Gradual rollout per restaurant

### Stage 2: Monitor (Week 2-3)
- Track config fetch performance
- Monitor for missing/null config values
- Log fallback usage

### Stage 3: Full Migration (Week 4)
- Remove feature flag
- Delete old hardcoded values
- Update documentation

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Hardcoded values** | 153 | <10 | -95% |
| **Configuration flexibility** | 1 restaurant | N restaurants | Multi-tenant ready |
| **Code deployment for config change** | Required | Not required | 0 deployments |
| **Restaurant onboarding time** | 4 hours | 30 minutes | -85% |

---

**Document Version**: 1.0
**Last Updated**: 2025-01-23
**Related**: `ARCHITECTURAL_AUDIT_REPORT_V2.md`
