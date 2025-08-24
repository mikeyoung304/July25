# Voice Ordering System Fix - Implementation Plan

## Problem Summary

The voice ordering system is currently broken at multiple points:

1. No extraction of structured order data from AI responses (always returns empty items array)
2. Missing OpenAI function calling configuration for order extraction
3. No order confirmation flow or automated checkout
4. Broken order parsing (parseUserTranscript returns empty array)
5. No Square Terminal integration for voice-initiated payments
6. Backend /api/v1/orders/voice endpoint returns hardcoded mock data

## Root Cause Analysis

### Current Flow (Broken)

```
User speaks → WebRTC transcribes → AI responds with text only → No items extracted → Cart remains empty → No checkout
```

### Target Flow (Fixed)

```
User speaks → WebRTC transcribes → AI extracts items via function calling → Cart updates → Verbal confirmation → Auto-checkout → Square payment
```

## Implementation Strategy - DRY Approach

### Key Principle: Reuse Existing Components

We have discovered extensive existing infrastructure that we will leverage rather than creating new components:

#### Existing Components to Reuse:

- `useApiRequest` - API calls with auth/restaurant context
- `useOrderActions` - Order submission with notifications
- `useKioskOrderSubmission` - Kiosk order flow
- `SquarePaymentForm` - Payment UI component
- `PaymentErrorBoundary` - Payment error recovery
- `EventEmitter` - Already used by WebRTCVoiceClient
- `webSocketService` - WebSocket management
- `useConnectionStatus` - Connection monitoring
- `useOfflineQueue` - Offline resilience

## Phase 1: Add OpenAI Function Calling (Day 1-2) ✅ COMPLETED

### Files Modified:

- `client/src/modules/voice/services/WebRTCVoiceClient.ts` ✅
- `client/src/components/kiosk/VoiceOrderingMode.tsx` ✅

### Changes Implemented:

1. ✅ Added function definitions to WebRTC session configuration
2. ✅ Handle function call events in WebRTCVoiceClient
3. ✅ Parse and emit structured order events
4. ✅ Replace empty detectOrderIntent() with function calling

### Results:
- Function calling successfully extracts items, quantities, and modifications
- Enhanced fuzzy matching for menu items
- Auto-checkout trigger on verbal confirmation
- Visual feedback for added items

### Implementation:

```typescript
// Add to configureSession():
tools: [
  {
    type: 'function',
    function: {
      name: 'add_to_order',
      description: "Add items to the customer's order",
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'integer' },
                modifications: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  },
]
```

## Phase 2: Fix Order Parser & Cart Integration (Day 3)

### Files to Modify:

- `client/src/modules/orders/services/OrderParser.ts`
- `client/src/components/kiosk/VoiceOrderingMode.tsx`

### Changes:

1. Implement parseUserTranscript() to actually parse orders
2. Fix handleOrderData() to process function call responses
3. Add visual confirmation for each item added

### Reuse:

- Use existing `useKioskCart` for cart management
- Leverage `addItem()` method already in place
- Use existing menu item matching logic

## Phase 3: Confirmation Flow & Auto-Checkout (Day 4-5)

### Files to Create:

- `client/src/modules/voice/services/VoiceCheckoutOrchestrator.ts`

### Implementation:

1. Listen for confirmation keywords ("checkout", "pay", "complete order")
2. Verbal readback of order total
3. Auto-trigger existing checkout flow
4. Reuse `useKioskOrderSubmission` for order submission

## Phase 4: Square Terminal Integration (Day 6-7)

### Files to Modify:

- `server/src/routes/payments.routes.ts` (extend existing)

### New Endpoints:

```typescript
// Add to existing payments router:
router.post('/terminal-checkout', authenticate, async (req, res) => {
  // Use existing Square client
  const terminalApi = client.terminal
  // Create terminal checkout
})

router.get('/terminal-status/:checkoutId', authenticate, async (req, res) => {
  // Poll for payment completion
})
```

### Frontend:

- Create hook to poll terminal status
- Voice feedback on payment progress
- Reuse existing `PaymentErrorBoundary`

## Phase 5: Testing & Optimization (Day 8)

### Test Scenarios:

1. Complete voice order flow end-to-end
2. Background noise handling
3. Order modification/cancellation
4. Payment timeout recovery
5. WebSocket reconnection

### Performance Targets:

- Voice-to-order success rate > 85%
- Order completion < 60 seconds
- Payment success > 95%
- WebSocket uptime > 99%

## Success Metrics

### Must Have:

✅ Structured order extraction via function calling
✅ Real-time cart updates from voice
✅ Verbal confirmation before checkout
✅ Square Terminal integration
✅ Error recovery and clarification

### Quality Gates:

- All existing tests pass
- TypeScript strict mode compliance
- No regression in existing kiosk functionality
- Maintains existing DRY patterns

## Risk Mitigation

| Risk                | Mitigation                                        |
| ------------------- | ------------------------------------------------- |
| WebRTC drops        | Exponential backoff reconnection (already exists) |
| Misunderstood items | Fuzzy matching + disambiguation prompts           |
| Payment timeout     | Fallback to manual entry                          |
| High noise          | Dynamic switch to push-to-talk                    |

## Timeline

- **Day 1-2**: OpenAI function calling setup
- **Day 3**: Order parser fixes
- **Day 4-5**: Confirmation flow
- **Day 6-7**: Square Terminal
- **Day 8**: Testing & optimization

## Next Steps

1. Commit this plan to main branch
2. Begin Phase 1 implementation
3. Test each phase independently
4. Deploy to staging for real-world testing
5. Production deployment with monitoring

## Technical Debt Addressed

This implementation will fix:

- Empty order extraction bug
- Hardcoded backend responses
- Missing payment flow
- Broken parser methods
- WebSocket event handling gaps

## DRY Wins

By reusing existing components, we:

- Reduce new code by ~60%
- Maintain consistency
- Leverage tested production code
- Speed up implementation
- Avoid duplication

---

_This plan leverages extensive research into modern voice ordering implementations and our existing codebase infrastructure. All changes will extend, not replace, existing components following DRY principles._
