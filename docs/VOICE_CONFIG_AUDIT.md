# Voice Configuration Audit: Kiosk vs Server Context Analysis

**Date:** 2025-11-07
**Purpose:** Audit voice configuration requirements and identify differences between kiosk and server contexts for Phase 4 implementation

---

## Executive Summary

This audit analyzes the current voice ordering configuration to understand how it should differ between **kiosk** (customer self-service) and **server** (staff table service) contexts. The system currently uses a single, kiosk-optimized configuration for both contexts.

### Key Findings

1. **Single Configuration**: All contexts currently use the same AI instructions optimized for kiosk customers
2. **Tone Mismatch**: Server context needs professional, fast-paced staff communication vs friendly customer communication
3. **Function Schema Differences**: Kiosk supports checkout, server needs table/seat management
4. **Authentication Patterns**: Kiosk allows anonymous, server requires staff authentication
5. **Menu Access**: Both receive identical menu context from backend

### Recommendations

- Extract AI instructions to context-specific functions
- Add `getServerVoiceInstructions()` alongside existing kiosk instructions
- Pass context parameter to `VoiceSessionConfig` constructor
- Optimize server instructions for speed and professional tone
- Update function schemas to match context requirements

---

## 1. Current Voice Configuration Architecture

### 1.1 Configuration Flow

```
Client Component (Kiosk/Server)
    ↓
useWebRTCVoice Hook
    ↓
WebRTCVoiceClient (orchestrator)
    ↓
VoiceSessionConfig.buildSessionConfig()
    ↓
OpenAI Realtime API
```

### 1.2 VoiceSessionConfig Responsibilities

**File:** `/client/src/modules/voice/services/VoiceSessionConfig.ts`

```typescript
export class VoiceSessionConfig implements IVoiceSessionConfig {
  private ephemeralToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private menuContext: string = ''; // Loaded from backend

  constructor(
    private config: WebRTCVoiceConfig,
    private authService: {
      getAuthToken: () => Promise<string>;
      getOptionalAuthToken?: () => Promise<string | null>
    }
  ) {}

  // Builds complete session configuration including:
  // - AI instructions (currently kiosk-only)
  // - Function calling schemas
  // - Audio settings
  // - Turn detection mode
  buildSessionConfig(): RealtimeSessionConfig { ... }
}
```

### 1.3 Current Configuration Structure

```typescript
export interface RealtimeSessionConfig {
  modalities: string[];              // ['text', 'audio']
  instructions: string;              // AI prompt/personality
  voice: string;                     // 'alloy'
  input_audio_format: string;        // 'pcm16'
  output_audio_format: string;       // 'pcm16'
  input_audio_transcription: {
    model: string;                   // 'whisper-1'
    language: string;                // 'en'
  };
  turn_detection: any;               // VAD config or null
  temperature: number;               // 0.6 (minimum)
  max_response_output_tokens: number; // 500
  tools?: any[];                     // Function calling schemas
  tool_choice?: string;              // 'auto'
}
```

---

## 2. Current AI Instructions (Kiosk-Optimized)

### 2.1 Full Current Instructions

**Location:** `VoiceSessionConfig.buildSessionConfig()`, lines 211-271

```typescript
let instructions = `You are Grow Restaurant's friendly, fast, and accurate customer service agent. You MUST speak in English only. Never respond in any other language.

🎯 YOUR JOB:
- Help guests choose items and take complete, correct orders
- Be concise (1-2 sentences), warm, and proactive
- Always confirm: final order, price, pickup/dine-in choice
- Use the add_to_order function when customer orders items
- Use confirm_order function when customer wants to checkout

⚠️ GOLDEN RULES:
1. IMMEDIATELY call add_to_order when customer mentions menu items - don't ask first
2. Add items with basic defaults (e.g., Greek dressing for salad, wheat bread for sandwich)
3. AFTER adding, ask follow-up questions to customize: "Added Greek Salad! What dressing?"
4. Summarize what was added: item → quantity → price
5. If uncertain about an item name, ask for clarification before adding

🎤 TRANSCRIPTION HELP (common misheard items):
- "Soul Bowl" (NOT "sobo" or "solo") - Southern comfort food bowl
- "Peach Arugula" (NOT "peach a ruler") - Salad with arugula
- "Jalapeño Pimento" (NOT "holla pino") - Spicy cheese bites
- "Succotash" (NOT "suck a toss") - Vegan vegetable dish
- If you hear something unclear, confirm: "Did you say Soul Bowl?"

📋 SMART FOLLOW-UPS BY CATEGORY:

SALADS → Ask:
- Dressing? (Vidalia Onion, Balsamic, Greek, Ranch, Honey Mustard, Poppy Seed, Lemon Vinaigrette)
- Cheese if applicable? (feta, blue, cheddar)
- Add protein? (+$4 chicken, +$6 salmon)

SANDWICHES → Ask:
- Bread? (white, wheat, or flatbread)
- Side? (potato salad, fruit cup, cucumber salad, side salad, peanut noodles)
- Toasted?

BOWLS:
- Fajita Keto → "Add rice for +$1?"
- Greek → "Dairy (feta/tzatziki) okay?"
- Soul → "Pork sausage okay?"

VEGAN → Confirm no dairy/egg/honey, warn about peanuts in noodles

ENTRÉES → Ask:
- Choose 2 sides (potato salad, fruit cup, cucumber salad, side salad, peanut noodles)
- Cornbread okay?

💬 EXAMPLE RESPONSES:
- "Great choice! Feta or blue cheese? Add prosciutto for +$4?"
- "White, wheat, or flatbread? Which side would you like?"
- "Any allergies I should know about?"
- "That's a Greek Salad with chicken, balsamic dressing. $16 total. Dine-in or to-go?"

🚫 REDIRECT NON-FOOD TOPICS:
- "I can only help with food orders. What would you like to order?"
- "Let me help you with our menu. Any starters today?"

⚠️ LANGUAGE REQUIREMENT:
- You MUST speak English ONLY
- If you hear Spanish or any other language, respond in English: "I can help you in English. What would you like to order?"
- Never respond in Spanish, French, Chinese, or any language other than English
- All responses, greetings, and confirmations MUST be in English`;

// Menu context appended from backend
if (this.menuContext) {
  instructions += this.menuContext;
} else {
  instructions += `\n\nNote: Menu information is currently unavailable.`;
}
```

### 2.2 Kiosk Characteristics Analysis

| Aspect | Current Approach | Purpose |
|--------|-----------------|---------|
| **Tone** | Warm, friendly, conversational | Customer comfort |
| **Verbosity** | 1-2 sentences, concise but complete | Balance clarity with speed |
| **Confirmations** | "Added Greek Salad! What dressing?" | Build trust with customer |
| **Examples** | Customer-facing language | Help customers understand options |
| **Personality** | Helpful, patient, educational | Support self-service |
| **Error Handling** | Clarifying questions | Reduce customer frustration |

---

## 3. Context Differences: Kiosk vs Server

### 3.1 Usage Context Comparison

| Dimension | Kiosk Context | Server Context |
|-----------|--------------|----------------|
| **User** | Customer (end user) | Staff member (trained user) |
| **Environment** | Public, self-service | Table service, professional |
| **Speed Priority** | Medium (balance clarity/speed) | **HIGH** (staff efficiency critical) |
| **Training** | None (first-time users) | Trained staff (know menu) |
| **Tone** | Warm, friendly | **Professional, concise** |
| **Confirmations** | Verbose, reassuring | **Minimal, efficient** |
| **Menu Knowledge** | Customer exploring | Staff knows menu items |
| **Error Tolerance** | High (guide customers) | **Low** (staff can self-correct) |
| **Session Duration** | 2-5 minutes (exploration) | **30-60 seconds** (rapid fire) |

### 3.2 Functional Differences

#### Kiosk Functions

```typescript
// Current kiosk functions (lines 281-361)
[
  {
    type: 'function',
    name: 'add_to_order',
    description: 'Add items to the customer\'s order',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'integer', minimum: 1, default: 1 },
              modifications: { type: 'array', items: { type: 'string' } },
              specialInstructions: { type: 'string' }
            },
            required: ['name', 'quantity']
          }
        }
      },
      required: ['items']
    }
  },
  {
    type: 'function',
    name: 'confirm_order',
    description: 'Confirm order and proceed to checkout',
    parameters: {
      properties: {
        action: {
          type: 'string',
          enum: ['checkout', 'review', 'cancel']
        }
      },
      required: ['action']
    }
  },
  {
    type: 'function',
    name: 'remove_from_order',
    description: 'Remove items from order',
    parameters: {
      properties: {
        itemName: { type: 'string' },
        quantity: { type: 'integer' }
      },
      required: ['itemName']
    }
  }
]
```

#### Server Functions (Proposed)

```typescript
// Proposed server functions
[
  {
    type: 'function',
    name: 'add_to_order',
    description: 'Add items to seat order (staff context)',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'integer', minimum: 1, default: 1 },
              modifications: { type: 'array', items: { type: 'string' } },
              specialInstructions: { type: 'string' },
              // Server-specific: track allergies/dietary needs
              allergyNotes: { type: 'string' },
              rushOrder: { type: 'boolean' }
            },
            required: ['name', 'quantity']
          }
        }
      },
      required: ['items']
    }
  },
  {
    type: 'function',
    name: 'confirm_seat_order',
    description: 'Confirm order for current seat',
    parameters: {
      properties: {
        action: {
          type: 'string',
          enum: ['submit', 'review', 'next_seat', 'finish_table']
        }
      },
      required: ['action']
    }
  },
  {
    type: 'function',
    name: 'remove_from_order',
    description: 'Remove items (staff context)',
    parameters: {
      properties: {
        itemName: { type: 'string' },
        quantity: { type: 'integer' }
      },
      required: ['itemName']
    }
  }
]
```

### 3.3 Authentication & Session Patterns

#### Kiosk Authentication

```typescript
// VoiceSessionConfig.fetchEphemeralToken(), lines 73-77
const authToken = this.authService.getOptionalAuthToken
  ? await this.authService.getOptionalAuthToken()  // ✅ Allows anonymous
  : await this.authService.getAuthToken();

// Only add Authorization header if we have a token
if (authToken) {
  headers['Authorization'] = `Bearer ${authToken}`;
}
```

**Pattern:** Optional authentication for demo mode

#### Server Authentication

```typescript
// useVoiceOrderWebRTC.ts, lines 255-262
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token ||
  JSON.parse(localStorage.getItem('auth_session') || '{}').session?.accessToken

if (!token) {
  toast.error('Please log in to submit orders')
  return false
}
```

**Pattern:** **Required** staff authentication, dual auth pattern (Supabase + localStorage)

### 3.4 Menu Context (Identical)

Both contexts receive the same menu context from backend:

**Backend:** `/server/src/routes/realtime.routes.ts`, lines 25-108

```typescript
// Load menu context for the restaurant
const menuData = await MenuService.getItems(restaurantId as string);

// Format menu items for AI context
const menuItems = menuData.map(item => ({
  name: item.name,
  price: item.price,
  category: item.categoryId || 'Other',
  description: item.description || '',
  available: item.available !== false
})).filter(item => item.available);

// Create formatted menu string with categories, prices, allergens
menuContext = `\n\n📋 FULL MENU (Summer Lunch Menu):\n...`;
```

**Observation:** Menu context is context-agnostic. Same format works for both kiosk and server.

---

## 4. Proposed Server Voice Instructions

### 4.1 Design Principles for Server Context

1. **Speed-Optimized**: Minimize tokens, maximize throughput
2. **Professional Tone**: Staff-to-AI communication, not customer-facing
3. **Assume Knowledge**: Staff knows menu, skip educational content
4. **Minimal Confirmations**: Trust staff to catch errors
5. **Rapid Fire Support**: Support quick "3 greek salads, 2 soul bowls" style ordering
6. **Allergy Aware**: Prompt for allergies but don't lecture

### 4.2 Proposed Server Instructions

```typescript
function getServerVoiceInstructions(menuContext: string): string {
  return `You are Grow Restaurant's staff ordering assistant. Fast, accurate, professional.

🎯 CORE FUNCTION:
- Take rapid-fire orders from trained staff
- Add items immediately when mentioned
- Minimal confirmations (staff will catch errors)
- Support multi-item batches: "3 Greek, 2 Soul Bowl, 1 sandwich"

⚡ SPEED RULES:
1. NEVER explain menu items (staff knows the menu)
2. Add items with standard defaults, ask modifiers ONLY if staff pauses
3. Confirmations: item count + total ONLY
4. Response length: 5-10 words max
5. Skip pleasantries ("Got it", "Added", "Done")

🎤 TRANSCRIPTION SHORTCUTS:
- "Soul Bowl" / "sobo" / "solo" → Soul Bowl
- "Peach" → Peach Arugula Salad
- "Greek" → Greek Salad
- "Jalapeño" / "pimento" → Jalapeño Pimento Bites
- "Succotash" → Succotash Bowl

⚠️ CRITICAL CHECKS:
- Allergies mentioned? → Capture in specialInstructions
- "Rush" or "ASAP"? → Set rushOrder: true
- Staff says "next seat" → call confirm_seat_order with action: 'next_seat'
- Staff says "done" or "that's it" → call confirm_seat_order with action: 'submit'

📋 SMART DEFAULTS BY CATEGORY:
SALADS → Greek dressing (change if staff specifies)
SANDWICHES → Wheat bread, potato salad (change if staff specifies)
BOWLS → Standard prep (staff will specify modifications)
ENTREES → Standard 2 sides (staff will specify which)

💬 EXAMPLE EXCHANGES:
Staff: "3 Greek salads, one with chicken, one no feta"
AI: "Added. 3 Greek. $42."

Staff: "Soul bowl, allergy to pork"
AI: "Soul Bowl, noted pork allergy. $14."

Staff: "2 sandwiches, both white bread, fruit side"
AI: "2 sandwiches. $24."

Staff: "That's it"
AI: "Submitting 6 items, $80 total."

⚠️ LANGUAGE: English only. If non-English detected: "English only."

${menuContext}`;
}
```

### 4.3 Comparison: Kiosk vs Server Instructions

| Element | Kiosk (Current) | Server (Proposed) |
|---------|----------------|-------------------|
| **Total Length** | ~2,100 characters | ~1,200 characters |
| **Tone** | Friendly, warm | Professional, terse |
| **Confirmations** | "Added Greek Salad! What dressing?" | "Added. 3 Greek. $42." |
| **Menu Education** | Extensive (what items are) | None (staff knows) |
| **Follow-up Questions** | Proactive for every item | Only if staff pauses |
| **Example Responses** | Customer-friendly | Staff shorthand |
| **Error Handling** | Clarifying questions | Trust staff to notice |
| **Token Efficiency** | Medium priority | **High priority** |

---

## 5. Implementation Analysis

### 5.1 Current Implementation (Single Config)

**File:** `VoiceSessionConfig.ts`

```typescript
export class VoiceSessionConfig {
  buildSessionConfig(): RealtimeSessionConfig {
    // CURRENT: Hardcoded kiosk instructions
    let instructions = `You are Grow Restaurant's friendly, fast...`;

    if (this.menuContext) {
      instructions += this.menuContext;
    }

    const tools = [
      { name: 'add_to_order', ... },
      { name: 'confirm_order', ... },
      { name: 'remove_from_order', ... }
    ];

    return {
      modalities: ['text', 'audio'],
      instructions,
      voice: 'alloy',
      tools,
      tool_choice: 'auto',
      // ... other settings
    };
  }
}
```

**Problem:** No way to differentiate between kiosk and server contexts

### 5.2 Proposed Implementation (Context-Aware)

#### Option A: Context Parameter in Constructor

```typescript
export type VoiceContext = 'kiosk' | 'server';

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  context?: VoiceContext;  // NEW: specify context
  debug?: boolean;
  enableVAD?: boolean;
  muteAudioOutput?: boolean;
}

export class VoiceSessionConfig {
  constructor(
    private config: WebRTCVoiceConfig,
    private authService: { ... }
  ) {}

  buildSessionConfig(): RealtimeSessionConfig {
    const context = this.config.context || 'kiosk';

    // Delegate to context-specific instruction builders
    const instructions = context === 'server'
      ? this.buildServerInstructions()
      : this.buildKioskInstructions();

    const tools = context === 'server'
      ? this.buildServerTools()
      : this.buildKioskTools();

    return {
      modalities: ['text', 'audio'],
      instructions,
      voice: 'alloy',
      tools,
      tool_choice: 'auto',
      // ... other settings
    };
  }

  private buildKioskInstructions(): string {
    let instructions = `You are Grow Restaurant's friendly, fast...`;
    // Existing kiosk instructions
    if (this.menuContext) {
      instructions += this.menuContext;
    }
    return instructions;
  }

  private buildServerInstructions(): string {
    let instructions = `You are Grow Restaurant's staff ordering assistant...`;
    // Server-optimized instructions
    if (this.menuContext) {
      instructions += this.menuContext;
    }
    return instructions;
  }

  private buildKioskTools(): any[] {
    return [
      { name: 'add_to_order', ... },
      { name: 'confirm_order', ... },
      { name: 'remove_from_order', ... }
    ];
  }

  private buildServerTools(): any[] {
    return [
      { name: 'add_to_order', ... }, // Enhanced with allergyNotes, rushOrder
      { name: 'confirm_seat_order', ... }, // Different actions
      { name: 'remove_from_order', ... }
    ];
  }
}
```

#### Option B: Separate Config Classes (Better Separation)

```typescript
// Base class with shared logic
export abstract class BaseVoiceSessionConfig {
  protected ephemeralToken: string | null = null;
  protected tokenExpiresAt: number = 0;
  protected menuContext: string = '';

  constructor(
    protected config: WebRTCVoiceConfig,
    protected authService: { ... }
  ) {}

  async fetchEphemeralToken(): Promise<void> { ... }

  buildSessionConfig(): RealtimeSessionConfig {
    return {
      modalities: ['text', 'audio'],
      instructions: this.buildInstructions(),
      voice: 'alloy',
      tools: this.buildTools(),
      tool_choice: 'auto',
      // ... other settings
    };
  }

  // Template methods
  protected abstract buildInstructions(): string;
  protected abstract buildTools(): any[];
}

// Kiosk-specific implementation
export class KioskVoiceSessionConfig extends BaseVoiceSessionConfig {
  protected buildInstructions(): string {
    // Existing kiosk instructions
  }

  protected buildTools(): any[] {
    // Kiosk tools
  }
}

// Server-specific implementation
export class ServerVoiceSessionConfig extends BaseVoiceSessionConfig {
  protected buildInstructions(): string {
    // Server-optimized instructions
  }

  protected buildTools(): any[] {
    // Server tools with seat management
  }
}

// Factory function
export function createVoiceSessionConfig(
  config: WebRTCVoiceConfig,
  authService: { ... }
): BaseVoiceSessionConfig {
  const context = config.context || 'kiosk';

  return context === 'server'
    ? new ServerVoiceSessionConfig(config, authService)
    : new KioskVoiceSessionConfig(config, authService);
}
```

### 5.3 Usage in Components

#### Kiosk Component

```typescript
// VoiceOrderingMode.tsx (existing)
<VoiceControlWebRTC
  onTranscript={handleVoiceTranscript}
  onOrderDetected={handleOrderData}
  onRecordingStateChange={setIsListening}
  debug={false}
/>

// useWebRTCVoice hook
const client = new WebRTCVoiceClient({
  restaurantId,
  userId: undefined,
  context: 'kiosk',  // NEW
  debug,
  muteAudioOutput,
});
```

#### Server Component

```typescript
// useVoiceOrderWebRTC.ts (server usage)
const client = new WebRTCVoiceClient({
  restaurantId,
  userId: user?.id,
  context: 'server',  // NEW
  debug,
  muteAudioOutput: false,  // Staff needs voice responses
});
```

---

## 6. Configuration Parameters Analysis

### 6.1 Shared Parameters (All Contexts)

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `modalities` | `['text', 'audio']` | Enable voice + text |
| `voice` | `'alloy'` | OpenAI voice model |
| `input_audio_format` | `'pcm16'` | Audio encoding |
| `output_audio_format` | `'pcm16'` | Audio encoding |
| `input_audio_transcription.model` | `'whisper-1'` | Transcription model |
| `input_audio_transcription.language` | `'en'` | Force English |
| `temperature` | `0.6` | Minimum for Realtime API |
| `max_response_output_tokens` | `500` | Response length limit |

### 6.2 Context-Specific Parameters

| Parameter | Kiosk Value | Server Value | Rationale |
|-----------|------------|--------------|-----------|
| `temperature` | `0.6` | `0.6` (same) | Minimum allowed by API |
| `max_response_output_tokens` | `500` | `200` | Server needs shorter responses |
| `turn_detection` | VAD optional | **Manual PTT** | Server prefers push-to-talk control |
| `instructions` | 2,100 chars | 1,200 chars | Server optimized for speed |
| `tools` | 3 functions | 3 functions (modified) | Different action enums |

### 6.3 VAD (Voice Activity Detection) Considerations

**Current VAD Config** (lines 199-208):

```typescript
let turnDetection: any = null; // Default: manual PTT
if (this.config.enableVAD) {
  turnDetection = {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 250,
    create_response: false, // Still manually trigger responses
  };
}
```

**Recommendation for Server:**
- **Disable VAD** (use manual PTT only)
- Reason: Staff needs precise control over when they're speaking vs when customer is speaking
- Prevents accidental activation during table conversation

---

## 7. Migration Path & Risks

### 7.1 Recommended Migration Phases

#### Phase 1: Extract and Refactor (Low Risk)
1. Extract current instructions to `buildKioskInstructions()` method
2. Create `buildServerInstructions()` stub (returns kiosk for now)
3. Add `context?: VoiceContext` parameter to config
4. Update tests to verify behavior doesn't change

**Risk:** None (no behavior change)

#### Phase 2: Implement Server Instructions (Medium Risk)
1. Implement `buildServerInstructions()` with proposed content
2. Implement `buildServerTools()` with modified schemas
3. Update `useVoiceOrderWebRTC` to pass `context: 'server'`
4. Test server context in isolation

**Risk:** Medium (new AI behavior, need to validate function calling)

#### Phase 3: Integration Testing (Medium Risk)
1. Test server context with real voice ordering workflow
2. Validate function calls match expected schemas
3. Verify speed improvements
4. Test multi-seat ordering flow

**Risk:** Medium (integration issues, need staff testing)

#### Phase 4: Optimization (Low Risk)
1. Monitor token usage and response times
2. Fine-tune server instructions based on feedback
3. Optimize `max_response_output_tokens` for server
4. Add metrics for server vs kiosk performance

**Risk:** Low (incremental improvements)

### 7.2 Breaking Changes

#### API Changes
- `WebRTCVoiceConfig` gains optional `context` field
- `VoiceSessionConfig` internal methods change (private, no external impact)

#### Event Schema Changes
- `confirm_order` → `confirm_seat_order` (server context only)
- New action enums: `'next_seat'`, `'finish_table'`

#### Component Updates Required
- `useVoiceOrderWebRTC.ts`: Pass `context: 'server'`
- `VoiceOrderingMode.tsx`: Already passes `context: 'kiosk'` (implicit default)

### 7.3 Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **AI doesn't follow server instructions** | Medium | Extensive prompt testing, A/B comparison |
| **Function schema mismatch** | High | Unit tests for schema validation |
| **Staff confusion with new tone** | Low | User acceptance testing with staff |
| **Performance regression** | Medium | Before/after token usage metrics |
| **Breaking kiosk behavior** | High | Regression tests, canary deployment |
| **Authentication issues** | Medium | Separate auth patterns already exist |

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
describe('VoiceSessionConfig', () => {
  describe('Kiosk Context', () => {
    it('should build kiosk instructions', () => {
      const config = new VoiceSessionConfig({
        restaurantId: 'test',
        context: 'kiosk'
      }, authService);

      const sessionConfig = config.buildSessionConfig();

      expect(sessionConfig.instructions).toContain('friendly');
      expect(sessionConfig.instructions).toContain('warm');
      expect(sessionConfig.max_response_output_tokens).toBe(500);
    });

    it('should include kiosk tools', () => {
      const config = new VoiceSessionConfig({
        restaurantId: 'test',
        context: 'kiosk'
      }, authService);

      const sessionConfig = config.buildSessionConfig();
      const toolNames = sessionConfig.tools?.map(t => t.name);

      expect(toolNames).toContain('confirm_order');
    });
  });

  describe('Server Context', () => {
    it('should build server instructions', () => {
      const config = new VoiceSessionConfig({
        restaurantId: 'test',
        context: 'server'
      }, authService);

      const sessionConfig = config.buildSessionConfig();

      expect(sessionConfig.instructions).toContain('professional');
      expect(sessionConfig.instructions).toContain('rapid-fire');
      expect(sessionConfig.max_response_output_tokens).toBe(200);
    });

    it('should include server tools with seat management', () => {
      const config = new VoiceSessionConfig({
        restaurantId: 'test',
        context: 'server'
      }, authService);

      const sessionConfig = config.buildSessionConfig();
      const toolNames = sessionConfig.tools?.map(t => t.name);

      expect(toolNames).toContain('confirm_seat_order');

      const confirmTool = sessionConfig.tools?.find(t => t.name === 'confirm_seat_order');
      expect(confirmTool.parameters.properties.action.enum).toContain('next_seat');
    });
  });
});
```

### 8.2 Integration Tests

```typescript
describe('Server Voice Ordering Integration', () => {
  it('should handle rapid multi-item orders', async () => {
    const transcript = "3 Greek salads, 2 Soul bowls, 1 sandwich";

    // Expect AI to call add_to_order with all items
    const expectedFunctionCall = {
      name: 'add_to_order',
      arguments: {
        items: [
          { name: 'Greek Salad', quantity: 3 },
          { name: 'Soul Bowl', quantity: 2 },
          { name: 'Sandwich', quantity: 1 }
        ]
      }
    };

    // Verify items added to order
    expect(orderItems).toHaveLength(6);
  });

  it('should capture allergy notes', async () => {
    const transcript = "Soul bowl, customer allergic to pork";

    const expectedFunctionCall = {
      name: 'add_to_order',
      arguments: {
        items: [{
          name: 'Soul Bowl',
          quantity: 1,
          allergyNotes: 'allergic to pork',
          specialInstructions: 'NO PORK - allergy'
        }]
      }
    };
  });

  it('should handle next seat action', async () => {
    const transcript = "that's it for this seat";

    const expectedFunctionCall = {
      name: 'confirm_seat_order',
      arguments: {
        action: 'next_seat'
      }
    };
  });
});
```

### 8.3 Performance Tests

```typescript
describe('Server Voice Performance', () => {
  it('should use fewer tokens than kiosk', () => {
    const kioskConfig = new VoiceSessionConfig({ context: 'kiosk' }, authService);
    const serverConfig = new VoiceSessionConfig({ context: 'server' }, authService);

    const kioskInstructions = kioskConfig.buildSessionConfig().instructions;
    const serverInstructions = serverConfig.buildSessionConfig().instructions;

    // Server should use ~40% fewer tokens
    expect(serverInstructions.length).toBeLessThan(kioskInstructions.length * 0.7);
  });

  it('should limit response tokens for server', () => {
    const serverConfig = new VoiceSessionConfig({ context: 'server' }, authService);
    const sessionConfig = serverConfig.buildSessionConfig();

    expect(sessionConfig.max_response_output_tokens).toBe(200);
  });
});
```

---

## 9. Metrics & Success Criteria

### 9.1 Performance Metrics

| Metric | Kiosk Target | Server Target | How to Measure |
|--------|-------------|---------------|----------------|
| **Avg Order Duration** | 2-5 minutes | **30-90 seconds** | Session start → submit |
| **Tokens per Order** | 3,000-5,000 | **1,500-3,000** | Log token usage |
| **Items per Minute** | 1-2 items/min | **3-5 items/min** | Items added / duration |
| **Response Latency** | <1 second | **<500ms** | Time to first token |
| **Confirmation Verbosity** | 15-30 words | **5-10 words** | Count words in responses |

### 9.2 Accuracy Metrics

| Metric | Kiosk Target | Server Target | How to Measure |
|--------|-------------|---------------|----------------|
| **Function Call Accuracy** | >95% | **>98%** | Correct schema matches |
| **Menu Item Match Rate** | >90% | **>95%** | Fuzzy match confidence |
| **Modification Capture** | >85% | **>90%** | Staff feedback |

### 9.3 Success Criteria

**Server Context Launch Ready When:**
1. ✅ Server instructions implemented and tested
2. ✅ Function schemas validated with server workflow
3. ✅ Staff acceptance testing shows >90% satisfaction
4. ✅ Avg order duration <90 seconds for 3-item orders
5. ✅ No regression in kiosk performance
6. ✅ Token usage reduced by >30% vs kiosk for same items

---

## 10. Code Snippets: Current vs Proposed

### 10.1 VoiceSessionConfig Constructor

**Current:**
```typescript
export class VoiceSessionConfig implements IVoiceSessionConfig {
  constructor(
    private config: WebRTCVoiceConfig,
    private authService: { getAuthToken: () => Promise<string>; getOptionalAuthToken?: () => Promise<string | null> }
  ) {}
}
```

**Proposed:**
```typescript
export type VoiceContext = 'kiosk' | 'server';

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  context?: VoiceContext;  // NEW
  debug?: boolean;
  enableVAD?: boolean;
  muteAudioOutput?: boolean;
}

export class VoiceSessionConfig implements IVoiceSessionConfig {
  private context: VoiceContext;

  constructor(
    private config: WebRTCVoiceConfig,
    private authService: { getAuthToken: () => Promise<string>; getOptionalAuthToken?: () => Promise<string | null> }
  ) {
    this.context = config.context || 'kiosk';  // Default to kiosk
  }
}
```

### 10.2 buildSessionConfig Method

**Current:**
```typescript
buildSessionConfig(): RealtimeSessionConfig {
  // Single hardcoded instruction set
  let instructions = `You are Grow Restaurant's friendly, fast, and accurate customer service agent...`;

  if (this.menuContext) {
    instructions += this.menuContext;
  }

  const tools = [
    { name: 'add_to_order', ... },
    { name: 'confirm_order', ... },
    { name: 'remove_from_order', ... }
  ];

  return {
    modalities: ['text', 'audio'],
    instructions,
    voice: 'alloy',
    tools,
    tool_choice: 'auto',
    temperature: 0.6,
    max_response_output_tokens: 500,
    // ...
  };
}
```

**Proposed:**
```typescript
buildSessionConfig(): RealtimeSessionConfig {
  // Delegate to context-specific builders
  const instructions = this.buildInstructions();
  const tools = this.buildTools();
  const maxTokens = this.context === 'server' ? 200 : 500;

  return {
    modalities: ['text', 'audio'],
    instructions,
    voice: 'alloy',
    tools,
    tool_choice: 'auto',
    temperature: 0.6,
    max_response_output_tokens: maxTokens,
    // ...
  };
}

private buildInstructions(): string {
  return this.context === 'server'
    ? this.buildServerInstructions()
    : this.buildKioskInstructions();
}

private buildTools(): any[] {
  return this.context === 'server'
    ? this.buildServerTools()
    : this.buildKioskTools();
}

private buildKioskInstructions(): string {
  let instructions = `You are Grow Restaurant's friendly, fast, and accurate customer service agent...`;
  // ... existing kiosk instructions

  if (this.menuContext) {
    instructions += this.menuContext;
  }

  return instructions;
}

private buildServerInstructions(): string {
  let instructions = `You are Grow Restaurant's staff ordering assistant. Fast, accurate, professional...`;
  // ... server-optimized instructions

  if (this.menuContext) {
    instructions += this.menuContext;
  }

  return instructions;
}

private buildKioskTools(): any[] {
  return [
    {
      type: 'function',
      name: 'add_to_order',
      description: 'Add items to the customer\'s order when they request specific menu items',
      parameters: { /* existing kiosk schema */ }
    },
    {
      type: 'function',
      name: 'confirm_order',
      description: 'Confirm the order and proceed with checkout when customer is ready',
      parameters: { /* existing kiosk schema */ }
    },
    {
      type: 'function',
      name: 'remove_from_order',
      description: 'Remove items from the order when customer changes their mind',
      parameters: { /* existing schema */ }
    }
  ];
}

private buildServerTools(): any[] {
  return [
    {
      type: 'function',
      name: 'add_to_order',
      description: 'Add items to seat order (staff context - assume menu knowledge)',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'integer', minimum: 1, default: 1 },
                modifications: { type: 'array', items: { type: 'string' } },
                specialInstructions: { type: 'string' },
                allergyNotes: { type: 'string' },  // NEW
                rushOrder: { type: 'boolean' }      // NEW
              },
              required: ['name', 'quantity']
            }
          }
        },
        required: ['items']
      }
    },
    {
      type: 'function',
      name: 'confirm_seat_order',  // Different name
      description: 'Confirm order for current seat (staff workflow)',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['submit', 'review', 'next_seat', 'finish_table']  // Different actions
          }
        },
        required: ['action']
      }
    },
    {
      type: 'function',
      name: 'remove_from_order',
      description: 'Remove items from seat order',
      parameters: { /* same as kiosk */ }
    }
  ];
}
```

### 10.3 Component Usage

**Kiosk (VoiceOrderingMode.tsx):**
```typescript
// Implicit kiosk context (default)
<VoiceControlWebRTC
  onTranscript={handleVoiceTranscript}
  onOrderDetected={handleOrderData}
  onRecordingStateChange={setIsListening}
  debug={false}
/>

// Hook initialization
const { ... } = useWebRTCVoice({
  autoConnect: false,
  debug,
  muteAudioOutput,
  // context: 'kiosk' is implicit default
});
```

**Server (useVoiceOrderWebRTC.ts):**
```typescript
// Explicit server context
const client = new WebRTCVoiceClient({
  restaurantId,
  userId: user?.id,
  context: 'server',  // NEW: specify server context
  debug,
  muteAudioOutput: false,
});
```

---

## 11. Recommendations Summary

### 11.1 Immediate Actions (Phase 4)

1. **Add Context Parameter**
   - Update `WebRTCVoiceConfig` interface to include optional `context?: 'kiosk' | 'server'`
   - Default to `'kiosk'` for backward compatibility

2. **Extract Instruction Builders**
   - Refactor `buildSessionConfig()` to delegate to `buildKioskInstructions()` and `buildServerInstructions()`
   - Refactor tool building to `buildKioskTools()` and `buildServerTools()`

3. **Implement Server Instructions**
   - Use proposed server instructions (1,200 chars vs 2,100 for kiosk)
   - Optimize for speed: 5-10 word responses
   - Professional tone, minimal confirmations

4. **Update Function Schemas**
   - Add `allergyNotes` and `rushOrder` to server `add_to_order`
   - Replace `confirm_order` with `confirm_seat_order` for server
   - Add `'next_seat'` and `'finish_table'` actions

5. **Update Server Components**
   - Pass `context: 'server'` in `useVoiceOrderWebRTC`
   - Handle new `confirm_seat_order` events

### 11.2 Testing & Validation

1. **Unit Tests**
   - Test instruction building for both contexts
   - Validate function schemas match expectations
   - Verify token limits (500 kiosk, 200 server)

2. **Integration Tests**
   - Test rapid multi-item ordering
   - Validate allergy note capture
   - Test seat management actions

3. **Performance Benchmarks**
   - Measure token usage reduction (target: 30%+)
   - Measure order duration (target: <90 seconds for 3 items)
   - Compare response verbosity

4. **User Acceptance Testing**
   - Staff feedback on tone and speed
   - Validation of accuracy improvements
   - Confirmation that workflow matches expectations

### 11.3 Future Optimizations

1. **Voice Model Tuning**
   - Consider different voice for server context (faster speech rate)
   - Experiment with temperature for server (currently 0.6 minimum)

2. **Contextual Menu Formatting**
   - Server might benefit from abbreviated menu format
   - Kiosk might need more descriptions

3. **Dynamic Instruction Adjustment**
   - Load instructions from configuration service
   - A/B test different instruction variants

4. **Multi-Language Support**
   - Currently English-only for both contexts
   - Future: staff might need bilingual support

---

## 12. Appendix: File Locations

### 12.1 Key Files to Modify

| File | Path | Changes Needed |
|------|------|----------------|
| **VoiceSessionConfig.ts** | `/client/src/modules/voice/services/VoiceSessionConfig.ts` | Add context parameter, extract instruction builders |
| **WebRTCVoiceClient.ts** | `/client/src/modules/voice/services/WebRTCVoiceClient.ts` | Pass context to VoiceSessionConfig |
| **useWebRTCVoice.ts** | `/client/src/modules/voice/hooks/useWebRTCVoice.ts` | Pass context from component |
| **useVoiceOrderWebRTC.ts** | `/client/src/pages/hooks/useVoiceOrderWebRTC.ts` | Specify `context: 'server'`, handle server events |
| **VoiceOrderingMode.tsx** | `/client/src/components/kiosk/VoiceOrderingMode.tsx` | No changes (kiosk is default) |

### 12.2 Test Files to Create/Update

| File | Path | Purpose |
|------|------|---------|
| **VoiceSessionConfig.test.ts** | `/client/src/modules/voice/services/__tests__/VoiceSessionConfig.test.ts` | Test context-specific configs |
| **ServerVoiceOrdering.integration.test.ts** | `/client/src/modules/voice/__tests__/ServerVoiceOrdering.integration.test.ts` | New integration tests |
| **VoicePerformance.test.ts** | `/client/src/modules/voice/__tests__/VoicePerformance.test.ts` | Token usage benchmarks |

### 12.3 Documentation to Update

| File | Path | Changes |
|------|------|---------|
| **VOICE_ORDERING_EXPLAINED.md** | `/docs/voice/VOICE_ORDERING_EXPLAINED.md` | Add server context section |
| **ADR-005-client-side-voice-ordering.md** | `/docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md` | Document context decision |
| **API Documentation** | `/docs/reference/api/` | Document new function schemas |

---

## Conclusion

The current voice ordering system uses a single, kiosk-optimized configuration for all contexts. To support efficient server (staff) ordering, we need to:

1. **Add context awareness** to `VoiceSessionConfig`
2. **Create server-optimized instructions** (faster, professional tone)
3. **Update function schemas** for seat management
4. **Maintain backward compatibility** with kiosk usage

The proposed changes are low-risk, well-scoped, and provide clear performance benefits for staff efficiency.

**Next Steps:**
1. Review this audit with team
2. Approve proposed server instructions
3. Implement Phase 1 (extraction and refactoring)
4. Test and validate before rolling out to production

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Author:** Claude Code AI Assistant
**Reviewed By:** _Pending_
