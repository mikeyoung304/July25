# Voice Agent System - Master Implementation Plan

## Executive Summary

After comprehensive analysis of our codebase and expert recommendations, we've identified the root cause of our broken voice → payment → kitchen flow: **architectural mismatch**. Our voice system bypasses critical integration points (UnifiedCartContext) and lacks the conversational intelligence needed for production.

**The Solution:** Transform our monolithic voice transcriber into a **context-aware, multi-agent conversational commerce engine** with proper state management, cart integration, and specialized behaviors.

## The Three Critical Problems

### 1. 🔴 Cart Bypass (IMMEDIATE FIX REQUIRED)
```typescript
// CURRENT (BROKEN):
api.submitOrder(orderData); // Bypasses cart entirely

// REQUIRED:
cartContext.addItem(item); // Must go through UnifiedCart
```

### 2. 🔴 Field Mapping Chaos
```typescript
// Voice sends: {table_number, customer_name, order_type}
// API expects: {tableNumber, customerName, type}
// Missing: price, subtotal, tax, modifiers structure
```

### 3. 🔴 WebSocket Blackout
- Orders don't emit `order:created` events
- Kitchen display never updates
- Missing `restaurant_id` in payloads

## Optimal Architecture Design

### Three-Layer Stack

```
┌─────────────────────────────────────┐
│   SPECIALIZATION LAYER              │
│   ├── Kiosk Agent (full dialogue)   │
│   ├── Server Agent (quick confirm)  │
│   └── Drive-thru Agent (speed)      │
├─────────────────────────────────────┤
│   CONVERSATION LAYER                │
│   ├── State Machine                 │
│   ├── Slot Filling                  │
│   └── Confidence Management         │
├─────────────────────────────────────┤
│   INFRASTRUCTURE LAYER              │
│   ├── WebRTC Connection             │
│   ├── Queue Management              │
│   └── Event Handling                │
└─────────────────────────────────────┘
```

### State Machine Design

```
AWAIT_ORDER
    ↓ (user speaks)
CAPTURE_ITEM
    ↓ (parse slots)
CAPTURE_REQUIRED ←──┐
    ↓ (all slots)    │ (missing)
CONFIRM_ITEM ────────┘
    ↓ (implicit confirm)
ADD_MORE?
    ↓ (yes) ────→ AWAIT_ORDER
    ↓ (no)
CHECKOUT_CONFIRM
    ↓ (explicit confirm)
CLOSE
```

## Phased Implementation Plan

### 🚨 PHASE 1: Emergency Surgery (3 Days)
**Goal:** Restore basic order flow functionality

#### Day 1: Cart Integration Fix
```typescript
// 1. Update VoiceOrderProcessor.ts
import { useUnifiedCart } from '@/contexts/UnifiedCartContext';

class VoiceOrderProcessor {
  processVoiceOrder(items: ParsedOrderItem[], cart: UnifiedCart) {
    items.forEach(item => {
      cart.addItem(
        item.menuItem,
        item.quantity,
        item.modifiers,
        item.specialInstructions
      );
    });

    // Navigate to checkout with cart
    navigate('/kiosk-checkout');
  }
}

// 2. Update VoiceControlWebRTC.tsx to pass cart
const { cart } = useUnifiedCart();
const handleOrderDetected = (order) => {
  voiceProcessor.processVoiceOrder(order.items, cart);
};
```

#### Day 2: Field Mapping Layer
```typescript
// Create adapters/orderTransformer.ts
export const transformVoiceToAPI = (voiceOrder: VoiceOrder): APIOrder => ({
  // Field mapping
  tableNumber: voiceOrder.table_number,
  customerName: voiceOrder.customer_name,
  type: voiceOrder.order_type === 'dine-in' ? 'dine-in' : voiceOrder.order_type,

  // Calculate required fields
  items: voiceOrder.items.map(item => ({
    menuItemId: item.menu_item_id,
    name: item.name,
    quantity: item.quantity,
    price: item.price || lookupPrice(item.menu_item_id),
    modifiers: transformModifiers(item.modifications)
  })),

  // Computed totals
  subtotal: calculateSubtotal(voiceOrder.items),
  tax: calculateTax(subtotal),
  tip: 0,
  total: subtotal + tax
});
```

#### Day 3: WebSocket Event Fix
```typescript
// In OrderService.ts
async submitOrder(orderData: Order): Promise<Order> {
  const response = await httpClient.post('/api/v1/orders', orderData);

  // CRITICAL: Emit WebSocket event
  webSocketService.emit('order:created', {
    order: response,
    restaurant_id: this.restaurantId,
    timestamp: Date.now()
  });

  return response;
}
```

### 🎯 PHASE 2: Intelligence Layer (Week 2)

#### 1. State Machine Implementation
```typescript
// services/voice/ConversationStateMachine.ts
export class ConversationStateMachine {
  private state: ConversationState = 'AWAIT_ORDER';
  private slots = new Map<string, any>();
  private menuConfig: MenuConfig;

  constructor(menuConfig: MenuConfig) {
    this.menuConfig = menuConfig;
  }

  process(input: string): StateResponse {
    const slots = this.extractSlots(input);
    const missingRequired = this.getMissingRequired(slots);

    if (missingRequired.length > 0) {
      this.state = 'CAPTURE_REQUIRED';
      return {
        speak: this.generateQuestion(missingRequired[0]),
        request: { slot: missingRequired[0] },
        state: this.state
      };
    }

    // All slots filled
    this.state = 'CONFIRM_ITEM';
    return {
      speak: this.generateConfirmation(slots),
      confirmations: { item: slots },
      state: this.state
    };
  }
}
```

#### 2. Agent Specialization
```typescript
// configs/agentConfigs.ts
export const AGENT_CONFIGS = {
  kiosk: {
    mode: 'customer',
    enableVAD: true,
    enableTTS: true,
    confirmPolicy: 'implicit',
    maxTurnsPerItem: 1.5,
    systemPrompt: KIOSK_PROMPT,
    features: ['upsell', 'allergens', 'suggestions']
  },

  server: {
    mode: 'server',
    enableVAD: false,
    enableTTS: false,
    confirmPolicy: 'visual',
    maxTurnsPerItem: 0.5,
    systemPrompt: SERVER_PROMPT,
    features: ['quick-confirm', 'direct-payment']
  }
};

// Usage in component
const agentConfig = AGENT_CONFIGS[mode];
const voiceClient = new WebRTCVoiceClient(agentConfig);
```

#### 3. Menu Integration (Supabase)
```typescript
// hooks/useMenuContext.ts
export const useMenuContext = () => {
  const [menuConfig, setMenuConfig] = useState<MenuConfig>();

  useEffect(() => {
    // Fetch from Supabase
    supabase
      .from('menu_items')
      .select('*, required_options, possible_modifiers')
      .then(({ data }) => {
        const config = transformToMenuConfig(data);
        setMenuConfig(config);

        // Push to voice agent
        if (voiceClient?.isConnected) {
          voiceClient.updateContext({ menuConfig });
        }
      });
  }, []);

  return menuConfig;
};
```

### 🏆 PHASE 3: Production Excellence (Week 3)

#### 1. Connection Resilience
```typescript
// Enhanced WebRTCVoiceClient
class WebRTCVoiceClient {
  private backoff = 500;
  private maxBackoff = 30000;
  private dcQueue: string[] = [];

  private scheduleReconnect() {
    // Exponential backoff with jitter
    const base = Math.min(this.maxBackoff, this.backoff * 2);
    this.backoff = base + Math.floor(Math.random() * 250);

    setTimeout(() => {
      this.connect().catch(err => {
        console.error('Reconnect failed:', err);
        this.scheduleReconnect();
      });
    }, this.backoff);
  }

  private flushQueue() {
    while (this.dcQueue.length && this.dc?.readyState === 'open') {
      const msg = this.dcQueue.shift();
      try {
        this.dc.send(msg);
      } catch (e) {
        this.dcQueue.unshift(msg); // Re-queue on failure
        break;
      }
    }
  }
}
```

#### 2. Performance Monitoring
```typescript
// services/voice/VoiceMetrics.ts
export class VoiceMetrics {
  private metrics = {
    ttfb: [],
    turnsPerItem: [],
    clarifierRate: 0,
    completionRate: 0
  };

  trackTurn(startTime: number, endTime: number) {
    const ttfb = endTime - startTime;
    this.metrics.ttfb.push(ttfb);

    // Alert if degrading
    if (this.getP95TTFB() > 900) {
      this.alertPerformanceDegradation();
    }
  }

  trackOrderCompletion(turns: number, items: number, clarifiers: number) {
    this.metrics.turnsPerItem.push(turns / items);
    this.metrics.clarifierRate = clarifiers / turns;

    // Auto-tune if metrics drift
    if (this.getAvgTurnsPerItem() > 1.5) {
      this.suggestPromptOptimization();
    }
  }
}
```

#### 3. A/B Testing Framework
```typescript
// experiments/VoiceExperiments.ts
export const VOICE_EXPERIMENTS = {
  confirmation_style: {
    control: 'implicit_all',
    treatment: 'explicit_checkout_only',
    metric: 'completion_rate'
  },

  prompt_length: {
    control: 'standard',
    treatment: 'ultra_short',
    metric: 'turns_per_item'
  }
};

// Usage
const variant = getExperimentVariant('confirmation_style');
const config = {
  ...baseConfig,
  confirmPolicy: variant === 'treatment' ? 'explicit_checkout' : 'implicit'
};
```

## Critical Success Metrics

### Phase 1 (Days 1-3)
- ✅ Orders reach kitchen display: **100%**
- ✅ Field mapping errors: **0**
- ✅ Cart integration working: **Yes/No**

### Phase 2 (Week 2)
- 📊 Turns per item: **≤1.5**
- 📊 Clarifier rate: **<20%**
- 📊 State machine coverage: **100%**

### Phase 3 (Week 3)
- 🎯 TTFB p95: **<900ms**
- 🎯 Connection uptime: **>99%**
- 🎯 Order accuracy: **>95%**

## Testing Checklist

### Unit Tests
- [ ] State transitions
- [ ] Slot extraction
- [ ] Field transformation
- [ ] Cart integration

### Integration Tests
- [ ] Voice → Cart flow
- [ ] Cart → Payment flow
- [ ] Payment → Kitchen flow
- [ ] WebSocket events

### E2E Tests
- [ ] Complete kiosk order
- [ ] Server confirmation
- [ ] Error recovery
- [ ] Connection loss

### Performance Tests
- [ ] 100 concurrent sessions
- [ ] 24-hour stability
- [ ] Memory leaks
- [ ] Latency distribution

## Risk Mitigation

### Feature Flags
```typescript
const FEATURE_FLAGS = {
  'voice_cart_integration': process.env.NODE_ENV === 'production' ? false : true,
  'voice_state_machine': false,
  'voice_agent_specialization': false
};
```

### Rollback Plan
1. Each phase behind feature flag
2. Previous version accessible via `/legacy-voice`
3. Manual order entry always available
4. Support team trained on fallback

### Monitoring & Alerts
```typescript
// Real-time monitoring
if (orderFlowErrors > 5) {
  alert('Voice order flow broken - check cart integration');
  rollback('voice_cart_integration');
}
```

## Implementation Commands

### Phase 1 Quick Start
```bash
# 1. Create feature branch
git checkout -b fix/voice-cart-integration

# 2. Run integration tests
npm run test:voice:integration

# 3. Test locally with cart monitoring
npm run dev -- --verbose-cart

# 4. Deploy to staging
npm run deploy:staging -- --feature=voice_cart_integration
```

## Conclusion

This plan transforms our broken voice system into a production-ready conversational commerce engine. By fixing critical integration points first (Phase 1), then adding intelligence (Phase 2), and finally hardening for production (Phase 3), we'll deliver a world-class voice ordering experience that actually works end-to-end.

**First Action:** Implement cart integration fix (Day 1, Phase 1) - this unblocks everything else.

**Success Indicator:** When a voice order appears on the kitchen display, we've fixed the fundamental break.