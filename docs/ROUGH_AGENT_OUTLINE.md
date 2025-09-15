# Rough Agent Outline - Expert Agent Input

## Agent Analysis of Current System

### Effectiveness Score: 8.7/10

**Strengths:**
- Strong lean principles (ask-if-missing, progressive disclosure, implicit confirm)
- Clear safety & checkout policy
- Clean item schema

**Main Gaps:**
- Missing explicit state model
- No output/JSON contract
- Redundant rules that can be compressed
- Small inconsistencies (reply length vs. examples)
- Lack of hard turn/latency budgets

## Key Architectural Recommendations

### 1. State Machine Implementation
**States:** `AWAIT_ORDER → CAPTURE_ITEM → CAPTURE_REQUIRED → CONFIRM_ITEM → ADD_MORE? → CHECKOUT_CONFIRM → CLOSE`

- Enter **CAPTURE_REQUIRED** only if required slots missing
- **CONFIRM_ITEM** = concise readback (item, required choices, qty, notable mods)
- **ADD_MORE?** = "Anything else?"
- **CHECKOUT_CONFIRM** = explicit readback of all items + total → "Proceed to pay?"

### 2. Core Operating Policies

1. **Ask-if-missing:** Fill slots from utterance; ask one pointed question only for required slots
2. **Implicit confirm per item; explicit confirm at checkout** or for allergies/payment
3. **Progressive disclosure:** Never list all options; if forced, offer 2-3 max
4. **Defaults:** Use menu/house defaults when unstated, speak them in readback
5. **Session memory:** Reuse user's last dressing/bread within session
6. **Uncertainty:** If ASR/NLU confidence <0.6, ask binary clarifier

### 3. Output Contract (Every Turn)
```json
{
  "speak": "<user-facing sentence>",
  "state": "<current_state>",
  "request": { "slot": "<required_slot_name>", "choices": ["A","B","C"] },
  "order_delta": [ /* newly added/updated items */ ],
  "confirmations": { "item": "...", "order": false },
  "actions": [ "quoteTotal" | "placeOrder" | "none" ],
  "telemetry": { "asr_conf": 0.0, "turn_ms": 0 }
}
```

### 4. Performance Budgets
- Reply length: ≤12 words (±3)
- TTFB target ≤900ms
- Max 1.5 turns per item
- <20% clarifier rate
- One clarifier per missing slot

### 5. Slot Ontology
- `item`, `quantity`, `variant/size`
- `requiredOptions[]` (must capture before confirm)
- `optionalAddons[]`, `mods[]`
- `notes/allergies`

## Optimized WebRTC Client Architecture

### Connection Management
```typescript
class WebRTCVoiceClient {
  // Backoff with jitter for reconnection
  backoff = Math.min(maxBackoff, base * 2) + Math.floor(Math.random() * 250);

  // Queue management for datachannel
  dcQueue: string[] = [];
  flushDC() {
    while (this.dcQueue.length && dc.ready) {
      dc.send(this.dcQueue.shift());
    }
  }

  // Structured event handling
  handleDCMessage(m: MessageEvent) {
    switch (data.type) {
      case "transcript.delta":
      case "transcript.final":
      case "response.text":
      case "order.detected":
      case "session.ping": // keepalive
    }
  }
}
```

### Permission & Connection Flow
1. **Lazy Permission Request** - Only request mic when user initiates
2. **Connection Resilience** - Auto-reconnect with exponential backoff
3. **Session Keepalive** - Ping/pong to maintain connection
4. **Error Recovery** - Graceful degradation, clear user feedback

### UI Component Optimizations
```typescript
// Keyboard support
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      startRecording();
    }
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      stopRecording();
    }
  };
});

// Visual states
{!isConnected && connectionState === 'connecting' && "Connecting…"}
{isConnected && !isRecording && "Hold button or press Space to speak"}
{isRecording && "Recording…"}
{isProcessing && "Processing…"}
```

## Menu Integration Strategy

### Supabase Menu Context
```typescript
// After connection established
client.updateContext({
  menuConfig: {
    items: [...],
    required: {
      "Sandwich": ["bread", "side"],
      "Salad": ["dressing"],
      "Bowl": []
    },
    defaults: {
      bread: "wheat",
      side: "potato salad",
      dressing: "balsamic"
    }
  },
  rulesVersion: 'fall-2025'
});
```

### Dynamic Menu Updates
- Fetch menu from Supabase on mount
- Push to agent context after connection
- Cache locally with TTL
- Handle out-of-stock via real-time updates

## Agent Specialization Matrix

| Agent Type | VAD | TTS | Confirmation | Turn Budget | Use Case |
|------------|-----|-----|--------------|-------------|----------|
| Kiosk | Yes | Yes | Implicit→Explicit | 1.5/item | Self-service |
| Server | No | No | Visual only | 0.5/item | Staff verification |
| Drive-thru | Yes | Yes | Explicit all | 1.0/item | Speed + accuracy |
| Phone | Yes | Yes | Explicit key | 2.0/item | Remote ordering |

## Critical Integration Points

### 1. Cart Integration
```typescript
// Current: Direct API bypass
api.submitOrder(orderData); // WRONG

// Fixed: Through UnifiedCart
const { addItem } = useUnifiedCart();
items.forEach(item => addItem(item.menuItem, item.quantity, item.modifiers));
navigate('/kiosk-checkout');
```

### 2. WebSocket Events
```typescript
// Ensure proper event emission
const submitOrder = async (orderData) => {
  const response = await api.submitOrder(orderData);
  webSocketService.emit('order:created', {
    order: response,
    restaurant_id: restaurantId
  });
  return response;
};
```

### 3. Field Mapping
```typescript
// Transform voice order to API format
const transformOrderForAPI = (voiceOrder) => ({
  tableNumber: voiceOrder.table_number,
  customerName: voiceOrder.customer_name,
  type: voiceOrder.order_type,
  items: voiceOrder.items.map(transformItem),
  subtotal: calculateSubtotal(voiceOrder.items),
  tax: calculateTax(subtotal),
  tip: 0,
  total: subtotal + tax
});
```

## Testing Strategy

### Unit Tests
- State transitions
- Slot filling logic
- Confidence thresholds
- Error handling

### Integration Tests
- Voice → Cart → Payment → Kitchen flow
- WebSocket event propagation
- Menu context updates
- Session persistence

### Performance Tests
- Latency measurements
- Concurrent sessions
- Memory leaks
- Connection resilience

## Success Metrics

### Technical
- TTFB ≤900ms (p95)
- Connection success rate >99%
- Recovery time <5s
- Memory stable over 24h

### Business
- Order accuracy >95%
- Completion rate >85%
- Avg turns/item ≤1.5
- Clarifier rate <20%

### User Experience
- Time to first interaction <3s
- Error message clarity 100%
- Graceful degradation paths
- Accessibility compliance

## Implementation Priority

### Phase 1: Core Fixes (Week 1)
1. Fix cart integration
2. Correct field mappings
3. Implement state machine
4. Add WebSocket events

### Phase 2: Agent Specialization (Week 2)
1. Kiosk agent with full dialogue
2. Server agent with visual confirm
3. Menu context integration
4. Session memory

### Phase 3: Production Hardening (Week 3)
1. Connection resilience
2. Performance optimization
3. Monitoring & telemetry
4. A/B testing framework