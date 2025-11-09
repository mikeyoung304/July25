# Handoff: DRY Refactoring for Kiosk vs Online Order

**Date**: 2025-11-06
**Context**: Phase 1 voice ordering complete, identified code duplication opportunity
**Full Analysis**: See `docs/DRY_ANALYSIS_KIOSK_ONLINE_ORDER.md`

---

## Background

During Phase 1 E2E testing, we discovered that:
- ✅ Kiosk "View Menu" and Online Order **share the same menu component** (`CustomerOrderPage`)
- ❌ Checkout pages have **60% code duplication** (~400 lines)
- ❌ Cart migration from deprecated `CartContext` to `UnifiedCartContext` is incomplete

**Current State**:
- Menu display: DRY ✅ (both use `/order/:restaurantId` → `CustomerOrderPage.tsx`)
- Checkout pages: Duplicated ❌ (`CheckoutPage.tsx` vs `KioskCheckoutPage.tsx`)
- Cart context: Migration incomplete ⚠️

---

## The Problem

### Duplicated Files

| Aspect | CheckoutPage.tsx | KioskCheckoutPage.tsx |
|--------|------------------|----------------------|
| Lines | 238 | 384 |
| Cart Hook | `useCart` (deprecated) | `useUnifiedCart` ✅ |
| Payment Methods | Card only | Card, Terminal, Mobile, Cash |
| Order Creation | ~50 lines (90% duplicate) | ~50 lines (90% duplicate) |
| Form Validation | ~15 lines (80% duplicate) | ~30 lines (80% duplicate) |
| Confirmation Route | `/order-confirmation/:restaurantId` | `/order-confirmation` |

### Code Examples

**Order creation logic** - nearly identical in both files:
```tsx
// CheckoutPage.tsx:54-79 vs KioskCheckoutPage.tsx:150-175
const orderResponse = await orderApi.post('/api/v1/orders', {
  type: 'online', // vs 'kiosk' - ONLY DIFFERENCE
  items: cart.items.map(item => ({
    id: item.id,
    menu_item_id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    modifiers: item.modifiers || [],
    special_instructions: item.specialInstructions || '',
  })),
  // ... 20+ more identical lines
})
```

---

## 3-Phase Refactoring Plan

### ⚡ Phase 1: Quick Wins (2-3 hours)
**Risk**: 🟢 Low | **Lines Eliminated**: 150-180

**Tasks**:
1. Complete cart migration
   - Update `CheckoutPage.tsx` to use `useUnifiedCart` explicitly
   - Delete deprecated `client/src/modules/order-system/context/CartContext.tsx`
   - Update any remaining imports

2. Extract shared validation config
   ```tsx
   // Create: client/src/config/checkoutValidation.ts
   export const customerFormValidation = {
     email: { rules: [validators.required, validators.email], validateOnBlur: true },
     phone: { rules: [validators.required, validators.phone], validateOnBlur: true },
     name: { rules: [validators.required], validateOnBlur: true }
   };
   ```

3. Standardize confirmation routes
   ```tsx
   // AppRoutes.tsx - make restaurantId optional
   <Route path="/order-confirmation/:restaurantId?" element={...} />
   ```

**Expected Outcome**: 150-180 lines eliminated, minimal risk, immediate benefit

---

### 🎯 Phase 2: Service Layer Extraction (4-6 hours)
**Risk**: 🟡 Low-Medium | **Lines Eliminated**: 50-100 per file

**Tasks**:
1. Create shared order service
   ```tsx
   // File: client/src/services/orderService.ts

   interface CreateOrderParams {
     cart: UnifiedCart;
     customerInfo: { name: string; email: string; phone: string };
     orderType: 'online' | 'kiosk' | 'voice';
     notes?: string;
   }

   export const orderService = {
     async createOrder({ cart, customerInfo, orderType, notes = '' }: CreateOrderParams) {
       return await orderApi.post('/api/v1/orders', {
         type: orderType,
         items: cart.items.map(item => ({
           id: item.id,
           menu_item_id: item.menuItemId || item.id,
           name: item.name,
           quantity: item.quantity,
           price: item.price,
           modifiers: item.modifications || item.modifiers || [],
           special_instructions: item.specialInstructions || '',
         })),
         customer_name: customerInfo.name,
         customer_email: customerInfo.email,
         customer_phone: customerInfo.phone.replace(/\D/g, ''),
         notes,
         subtotal: cart.subtotal,
         tax: cart.tax,
         tip: cart.tip,
         total_amount: cart.total,
       });
     }
   };
   ```

2. Update both checkout pages to use service
   ```tsx
   // Instead of 50 lines of order creation, both pages use:
   const order = await orderService.createOrder({
     cart,
     customerInfo: {
       name: form.values.customerName || form.values.customerEmail.split('@')[0],
       email: form.values.customerEmail,
       phone: form.values.customerPhone
     },
     orderType: 'kiosk', // or 'online'
     notes: 'Kiosk order'
   });
   ```

3. Add comprehensive tests for service layer

**Expected Outcome**: Single source of truth for order creation, easier testing

---

### 🔥 Phase 3: Unified Checkout Component (8-12 hours)
**Risk**: 🟡 Medium | **Lines Eliminated**: 200-300

**Tasks**:
1. Create `UnifiedCheckoutPage` component
   ```tsx
   // File: client/src/components/checkout/UnifiedCheckoutPage.tsx

   interface UnifiedCheckoutPageProps {
     mode: 'online' | 'kiosk';
     onBack?: () => void;
     voiceCheckoutOrchestrator?: VoiceCheckoutOrchestrator;
   }

   export const UnifiedCheckoutPage: React.FC<UnifiedCheckoutPageProps> = ({
     mode,
     onBack,
     voiceCheckoutOrchestrator
   }) => {
     const { cart, updateTip, clearCart } = useUnifiedCart();
     const isKiosk = mode === 'kiosk';

     // Conditional configuration
     const config = {
       paymentMethods: isKiosk ? ['card', 'terminal', 'mobile', 'cash'] : ['card'],
       formFields: isKiosk ? ['customerName', 'customerEmail', 'customerPhone']
                           : ['customerEmail', 'customerPhone'],
       orderType: mode,
       confirmationRoute: (restaurantId?: string) =>
         isKiosk ? '/order-confirmation' : `/order-confirmation/${restaurantId}`,
       enableVoice: isKiosk && !!voiceCheckoutOrchestrator,
       enableTerminal: isKiosk,
     };

     // Shared order creation using orderService
     const createOrder = async () => {
       return await orderService.createOrder({
         cart,
         customerInfo: {...},
         orderType: config.orderType
       });
     };

     return (
       <div className="checkout-container">
         <CustomerInfoForm fields={config.formFields} form={form} />
         <PaymentMethodSelector methods={config.paymentMethods} />
         {config.enableVoice && <VoiceCheckoutControls />}
         {config.enableTerminal && <TerminalIntegration />}
         <OrderSummary cart={cart} />
         <Button onClick={createOrder}>Complete Order</Button>
       </div>
     );
   };
   ```

2. Update existing checkout pages to use unified component
   ```tsx
   // CheckoutPage.tsx (simplified to ~30 lines)
   export function CheckoutPage() {
     return <UnifiedCheckoutPage mode="online" />;
   }

   // KioskCheckoutPage.tsx (simplified to ~50 lines)
   export function KioskCheckoutPage({ orchestrator }: Props) {
     return (
       <UnifiedCheckoutPage
         mode="kiosk"
         voiceCheckoutOrchestrator={orchestrator}
         onBack={handleBack}
       />
     );
   }
   ```

3. Add feature flag for gradual rollout
   ```bash
   # .env
   VITE_FEATURE_UNIFIED_CHECKOUT=false  # Start at 0%
   ```

4. Comprehensive testing
   - Unit tests for UnifiedCheckoutPage
   - Integration tests for both modes
   - E2E tests for complete checkout flows

**Expected Outcome**: Single checkout component, 200-300 lines eliminated, easier maintenance

---

## Implementation Strategy

### Use Feature Flags for Safety

```tsx
// In checkout pages, conditionally use new or old implementation
const ENABLE_UNIFIED = import.meta.env.VITE_FEATURE_UNIFIED_CHECKOUT === 'true';

export function CheckoutPage() {
  if (ENABLE_UNIFIED) {
    return <UnifiedCheckoutPage mode="online" />;
  }
  return <OriginalCheckoutPage />; // Legacy implementation
}
```

### Gradual Rollout Plan

1. **Week 1**: Implement Phase 1 (quick wins) - 100% rollout
2. **Week 2**: Implement Phase 2 (service layer) - 100% rollout
3. **Week 3**: Implement Phase 3 with feature flag at 0%
4. **Week 4**: Gradual rollout - 0% → 10% → 25% → 50%
5. **Week 5**: Full rollout - 100%
6. **Week 6**: Cleanup - delete old implementations

---

## Total Impact

### Before Refactoring
```
Total Checkout Code:     622 lines
Duplicate Code:          400 lines (64%)
Cart Implementations:    2 (deprecated + current)
Order Creation Logic:    2 implementations
Validation Config:       2 implementations
```

### After All 3 Phases
```
Total Checkout Code:     ~250 lines
Duplicate Code:          0 lines (0%)
Cart Implementations:    1 (UnifiedCartContext)
Order Creation Logic:    1 (orderService)
Validation Config:       1 (shared config)

Code Reduction:          372 lines eliminated (60% reduction)
```

---

## Files to Modify

### Phase 1
- ✏️ `client/src/pages/CheckoutPage.tsx` - Update to useUnifiedCart
- 🗑️ `client/src/modules/order-system/context/CartContext.tsx` - DELETE
- ➕ `client/src/config/checkoutValidation.ts` - CREATE
- ✏️ `client/src/components/layout/AppRoutes.tsx` - Update route

### Phase 2
- ➕ `client/src/services/orderService.ts` - CREATE
- ✏️ `client/src/pages/CheckoutPage.tsx` - Use orderService
- ✏️ `client/src/components/kiosk/KioskCheckoutPage.tsx` - Use orderService

### Phase 3
- ➕ `client/src/components/checkout/UnifiedCheckoutPage.tsx` - CREATE
- ➕ `client/src/components/checkout/CustomerInfoForm.tsx` - CREATE
- ➕ `client/src/components/checkout/PaymentMethodSelector.tsx` - CREATE
- ✏️ `client/src/pages/CheckoutPage.tsx` - Use UnifiedCheckoutPage
- ✏️ `client/src/components/kiosk/KioskCheckoutPage.tsx` - Use UnifiedCheckoutPage

---

## Testing Checklist

### Phase 1 Testing
- [ ] Online order checkout flow works
- [ ] Kiosk checkout flow works
- [ ] Cart state persists correctly
- [ ] No console errors

### Phase 2 Testing
- [ ] Order creation successful (online)
- [ ] Order creation successful (kiosk)
- [ ] Order items map correctly
- [ ] Customer info captured correctly
- [ ] Payment processing works

### Phase 3 Testing
- [ ] Online checkout with unified component
- [ ] Kiosk checkout with unified component
- [ ] All 4 payment methods work (kiosk)
- [ ] Card payment works (online)
- [ ] Voice checkout integration (kiosk)
- [ ] Terminal integration (kiosk)
- [ ] Order confirmation routing correct
- [ ] Feature flag toggle works
- [ ] E2E tests pass for both modes

---

## Risk Mitigation

### Low Risk (Phase 1)
- Cart migration already aliased in `cart.hooks.ts`
- Validation config is just extraction
- Route change is backward compatible

**Mitigation**: Comprehensive testing, easy rollback

### Medium Risk (Phase 2-3)
- Payment processing is critical
- Order creation must be reliable
- Can't afford checkout failures

**Mitigation**:
1. Feature flag for unified checkout
2. Gradual rollout (0% → 10% → 25% → 50% → 100%)
3. Monitor checkout completion rates
4. Keep old implementations until 100% confidence
5. Automated alerts for checkout failures

---

## Success Metrics

### Code Quality
- [ ] Total checkout LOC reduced by 60%
- [ ] Duplication eliminated (0%)
- [ ] Single cart implementation
- [ ] Test coverage >90%

### Functionality
- [ ] Checkout completion rate maintained (>95%)
- [ ] No increase in payment failures
- [ ] No regression in UX
- [ ] All payment methods work

### Maintenance
- [ ] New payment method can be added in <2 hours
- [ ] Bug fixes apply to both flows automatically
- [ ] Developer onboarding faster

---

## Questions to Address Before Starting

1. **Phase 1**: Can we start immediately or need approval?
2. **Phase 2**: Should we add metrics to orderService?
3. **Phase 3**: Should unified checkout support table service mode too?
4. **Testing**: Do we have E2E tests for checkout currently?
5. **Rollback**: What's the rollback plan if issues found in production?

---

## Next Steps for New Session

1. **Review this document** and `docs/DRY_ANALYSIS_KIOSK_ONLINE_ORDER.md`
2. **Decide which phase to start** (recommend Phase 1)
3. **Create feature branch**: `git checkout -b refactor/unified-checkout`
4. **Start implementation** following the 3-phase plan
5. **Create PRs** for each phase separately for easier review

---

## References

- **Full Analysis**: `docs/DRY_ANALYSIS_KIOSK_ONLINE_ORDER.md` (588 lines)
- **E2E Test Report**: `docs/PHASE_1_E2E_TEST_REPORT.md`
- **Phase 1 Completion**: `docs/PHASE_1_COMPLETION_SUMMARY.md`

**Git State**: All documentation committed to main (`f2a854ad`)
**Branch**: Currently on `main`

---

**Ready to start? Begin with Phase 1 - it's low risk and provides immediate value!**
