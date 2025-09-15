# Menu Integration & Voice Agent Fix - Continuation Guide

**Created**: September 14, 2025
**Updated**: September 15, 2025
**Purpose**: Complete context for continuing voice agent menu integration in new chat session

## Current System State

### ✅ What's Working (as of Sept 14, 2025)

1. **Voice System Foundation** (Fixed Sept 10-11)
   - Cart integration: `useVoiceOrderWebRTC.ts:101-106` uses UnifiedCartContext ✅
   - Field mapping: Proper camelCase transformation ✅
   - WebSocket events: Orders reach kitchen display ✅
   - Basic WebRTC connection to OpenAI Realtime API ✅

2. **Authentication** (Fixed today - commit 764d332)
   - Development bypass added for restaurant membership check
   - Staff can now create orders without user_restaurants entries in dev mode
   - Fix applied in `server/src/middleware/auth.ts:333-349`

### 🔴 Critical Missing Component: Menu Intelligence

**The Problem**: Voice agent has zero knowledge of actual menu items. It can transcribe "burger" but doesn't know:
- What burgers exist
- Valid modifications
- Required options (bread type, sides)
- Current prices
- Item availability

## What We've Built But Haven't Connected

### 1. ConversationStateMachine.ts (NEW - Not Integrated)
Location: `client/src/modules/voice/services/ConversationStateMachine.ts`

**Features**:
- Full state flow: AWAIT_ORDER → CAPTURE_ITEM → CAPTURE_REQUIRED → CONFIRM_ITEM → ADD_MORE → CHECKOUT_CONFIRM → CLOSE
- Output contract with JSON structure per expert recommendations
- Confidence threshold handling (<0.6 triggers clarification)
- Session memory for user preferences
- Word limit enforcement (≤12 words)
- Progressive disclosure (max 3 options)

**Status**: Built but NOT connected to voice flow

### 2. WebRTCVoiceClientEnhanced.ts (NEW - Not Integrated)
Location: `client/src/modules/voice/services/WebRTCVoiceClientEnhanced.ts`

**Features**:
- Exponential backoff with jitter for reconnection
- Message queue for offline scenarios
- Performance metrics tracking
- Session keepalive (ping/pong)
- Auto-reconnection with max attempts
- Latency measurement

**Status**: Built but NOT replacing existing WebRTCVoiceClient

## Expert Recommendations Analysis

Document: `docs/ROUGH_AGENT_OUTLINE.md`
Analysis: `docs/VOICE_AGENT_INTEGRATION_ANALYSIS.md`

### What Expert Recommended vs What We Have

| Component | Expert Says | We Have | Gap |
|-----------|------------|---------|-----|
| State Machine | Required | Built, not connected | Wire up |
| Menu Context | Required | Nothing | **BUILD THIS** |
| Connection Resilience | Required | Built, not connected | Wire up |
| Confidence Handling | Required | In state machine | Connect to voice |
| Session Memory | Required | Basic in state machine | Add persistence |
| Performance Metrics | Required | Basic implementation | Add aggregation |

## ACTUAL Current Menu Implementation (Sept 15, 2025 Scan)

### Existing Supabase Tables
```sql
-- Already exists in Supabase:
menu_categories:
  - id, restaurant_id, name, slug, description, display_order, active

menu_items:
  - id, restaurant_id, category_id, external_id, name, description
  - price, active, available, dietary_flags (array)
  - modifiers (JSONB), aliases (array), prep_time_minutes, image_url
  - created_at, updated_at
```

### Existing Data Models (`shared/types/menu.types.ts`)
```typescript
interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  category?: MenuCategory;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_featured?: boolean;
  dietary_flags?: string[];
  preparation_time?: number;
  modifier_groups?: MenuItemModifierGroup[];
  display_order?: number;
}

interface MenuItemModifierGroup {
  id: string;
  name: string;
  required: boolean;
  max_selections: number;
  min_selections: number;
  options: MenuItemModifierOption[];
}
```

### Existing API Endpoints
- `GET /api/v1/menu` - Full menu with categories (cached)
- `GET /api/v1/menu/items` - All items
- `GET /api/v1/menu/items/:id` - Single item
- `GET /api/v1/menu/categories` - Categories
- `POST /api/v1/menu/sync-ai` - Sync to AI (exists but not implemented)

### Existing Services
- `MenuService` (server) - Handles fetching, caching with NodeCache
- `menuService` (client) - Frontend service for API calls
- `menuIdMapper` - Converts internal/external IDs
- `useMenuItems` hook - React hook for menu data

## The Menu Integration Path Forward

### Step 1: Connect Existing Menu to Voice Agent
The menu structure ALREADY EXISTS! We need to:
1. Load existing menu data from Supabase
2. Transform it to voice-friendly format
3. Push to voice agent context

### Step 2: MenuContextManager Service (To Build)
```typescript
// client/src/modules/voice/services/MenuContextManager.ts
import { menuService } from '@/services';
import { MenuItem, MenuItemModifierGroup } from '@/shared/types/menu.types';

class MenuContextManager {
  private menuItems: MenuItem[] = [];
  private menuByName: Map<string, MenuItem> = new Map();
  private menuByAlias: Map<string, MenuItem> = new Map();

  async loadFromAPI(restaurantId: string) {
    // Use existing menuService to fetch data
    const response = await menuService.getFullMenu();
    this.menuItems = response.items;

    // Build lookup maps
    this.menuItems.forEach(item => {
      this.menuByName.set(item.name.toLowerCase(), item);
      // aliases field already exists in DB!
      item.aliases?.forEach(alias => {
        this.menuByAlias.set(alias.toLowerCase(), item);
      });
    });
  }

  async pushToVoiceAgent(client: WebRTCVoiceClient) {
    // Transform to voice-friendly format
    const menuContext = {
      items: this.menuItems.map(item => ({
        name: item.name,
        price: item.price,
        category: item.category?.name,
        available: item.is_available,
        aliases: item.aliases,
        requiredModifiers: item.modifier_groups
          ?.filter(g => g.required)
          .map(g => ({
            name: g.name,
            options: g.options.map(o => o.name)
          })),
        optionalModifiers: item.modifier_groups
          ?.filter(g => !g.required)
          .flatMap(g => g.options.map(o => o.name))
      }))
    };

    client.updateContext({ menuConfig: menuContext });
  }

  validateItem(itemName: string): MenuItem | null {
    const normalized = itemName.toLowerCase();
    return this.menuByName.get(normalized) ||
           this.menuByAlias.get(normalized) ||
           null;
  }

  getRequiredModifiers(item: MenuItem): MenuItemModifierGroup[] {
    return item.modifier_groups?.filter(g => g.required) || [];
  }
}
```

### Step 3: Integration Points

1. **Voice Flow Integration**
   - Replace `WebRTCVoiceClient` with `WebRTCVoiceClientEnhanced`
   - Wire `ConversationStateMachine` into `useWebRTCVoice` hook
   - Connect `MenuContextManager` on component mount

2. **Order Processing**
   - Update `VoiceOrderProcessor` to use MenuContextManager
   - Validate items using `validateItem()` method
   - Use actual menu prices from MenuItem objects
   - Check `is_available` flag before adding to cart

3. **Implementation of sync-ai endpoint**
   ```typescript
   // server/src/services/menu.service.ts
   static async syncToAI(restaurantId: string) {
     const menu = await this.getFullMenu(restaurantId);
     // Transform and send to OpenAI assistant/function
     // Store menu context for voice sessions
   }
   ```

4. **Testing Flow with Real Menu Data**
   ```
   User: "I want a grass-fed burger"  // From actual menu_items
   Agent: "Any modifications?"         // Check modifier_groups
   User: "No onions"
   Agent: "One grass-fed beef burger, no onions. That's $16.95. Anything else?"
   ```

## Files to Review in New Session

### Core Voice Files
1. `/client/src/modules/voice/services/WebRTCVoiceClient.ts` - Current implementation
2. `/client/src/modules/voice/services/WebRTCVoiceClientEnhanced.ts` - New, not connected
3. `/client/src/modules/voice/services/ConversationStateMachine.ts` - New, not connected
4. `/client/src/modules/voice/components/VoiceControlWebRTC.tsx` - UI component
5. `/client/src/modules/voice/hooks/useWebRTCVoice.ts` - React hook
6. `/client/src/pages/hooks/useVoiceOrderWebRTC.ts` - Order processing

### Integration Points
1. `/client/src/contexts/UnifiedCartContext.tsx` - Cart system (working)
2. `/client/src/services/orders/OrderService.ts` - API calls (working)
3. `/server/src/services/orders.service.ts` - Backend (working)
4. `/server/src/middleware/auth.ts` - Auth fix applied

### Documentation
1. `/docs/VOICE_AGENT_ACTUAL_STATUS.md` - Discovery that system wasn't broken
2. `/docs/VOICE_AGENT_INTEGRATION_ANALYSIS.md` - Gap analysis
3. `/docs/ROUGH_AGENT_OUTLINE.md` - Expert recommendations
4. `/docs/VOICE_AGENT_MASTER_PLAN.md` - Full implementation strategy

## Environment Variables Needed

```env
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=development  # Enables auth bypass
```

## Quick Test Commands

```bash
# Start development servers
npm run dev

# Test voice order flow (after menu integration)
# 1. Login as server@restaurantos.com
# 2. Navigate to Server View
# 3. Click "Connect Voice"
# 4. Try ordering items from your menu
```

## Critical Context for Next Session

1. **The voice system is NOT broken** - it was fixed Sept 10-11
2. **Authentication was blocking orders** - fixed with dev bypass
3. **State machine and resilience are built** - just need connection
4. **Menu tables and API already exist** - menu_items, menu_categories in Supabase
5. **Menu services already built** - MenuService, menuService, caching implemented
6. **Modifiers structure exists** - modifier_groups with required/optional handling
7. **Aliases field exists** - for voice recognition variants
8. **All the pieces exist** - they just need to be wired together

## Next Session Action Items

1. ~~**Check existing menu structure**~~ ✅ DONE - Tables exist, API works
2. **Build MenuContextManager** using existing menuService
3. **Wire up ConversationStateMachine**
4. **Replace basic client with Enhanced version**
5. **Implement sync-ai endpoint** to push menu to OpenAI
6. **Test complete intelligent flow** with real menu data

## Expected Outcome

After menu integration, the voice agent will:
- Know all valid menu items
- Ask for required options automatically
- Validate modifications
- Use correct prices
- Handle out-of-stock items
- Provide intelligent responses based on actual menu

---

## Fall Menu Integration (Sept 15, 2025)

### Menu Structure with Slot-Filling Logic

The fall menu uses a **required vs possible** modification system:
- **Required slots**: Agent MUST capture (ask if missing)
- **Possible mods**: Only record if guest mentions (never ask)

### Agent Design Principles
1. **Implicit confirmations** - "Got it: Fall Salad, feta, lemon dressing"
2. **Single-question turns** - "Which bread? And side?" (not separate)
3. **12-word max responses** - Keep it concise
4. **Progressive disclosure** - Show 2-3 options max, never full lists
5. **Barge-in friendly** - Support interruptions mid-response

### Fall Menu Categories & Items

#### Global Options
```javascript
const globals = {
  dressings: ["Vidalia Onion", "Balsamic", "Ranch", "Greek",
             "Honey Mustard", "Apple Vinaigrette", "Poppy-Seed"],
  sides: ["Dressing & Gravy", "Mashed Sweet Potato",
          "Broccoli with Cheese Sauce", "Collards",
          "Roasted Rainbow Carrots", "Yellow Rice",
          "Black-Eyed Peas", "Braised Cabbage",
          "Macaroni Salad", "Apple Sauce", "Side Salad"]
}
```

#### Items with Required Fields
- **Grow Nacho**: protein (Chicken/Sloppy Joe)
- **Fall Salad**: dressing, cheese (Feta/Blue/Cheddar)
- **Sandwiches**: variant, bread, side
- **All Entrées**: side1, side2
- **Veggie Plate**: count (3 or 4), then sides

### Implementation Strategy

1. **Menu Data Transform**:
```typescript
interface VoiceMenuItem {
  id: string;
  name: string;
  price: number;
  required: SlotDefinition[];
  possibleMods: string[];
  optionalAddons?: Addon[];
}

interface SlotDefinition {
  slot: string;
  options?: string[];
  optionsFrom?: 'dressings' | 'sides';
}
```

2. **Slot-Filling State Machine**:
```typescript
// Parse utterance → Fill slots → Check required → Ask missing → Confirm
const handleOrderItem = (utterance: string, menuItem: VoiceMenuItem) => {
  const filled = parseSlots(utterance, menuItem);
  const missing = menuItem.required.filter(r => !filled[r.slot]);

  if (missing.length > 0) {
    return askForMissing(missing[0]); // Single question
  }

  return implicitConfirm(menuItem, filled);
}
```

3. **Voice Agent Instructions**:
```typescript
const agentInstructions = `
You are a fast ordering agent for Grow Fresh restaurant.

CRITICAL RULES:
1. Only ask for required fields (marked in menu config)
2. Never ask about modifications unless customer mentions them
3. Keep responses under 12 words
4. Use implicit confirmation: "Got it: [item details]"
5. Explicit confirm only at checkout with total

MENU KNOWLEDGE:
[Menu JSON will be injected here via updateContext]

EXAMPLES:
User: "Fall salad"
Agent: "Which dressing and cheese?"
User: "Ranch and feta"
Agent: "Fall salad, ranch, feta. Anything else?"

User: "BLT please"
Agent: "Bread type and side?"
User: "Wheat, mac salad"
Agent: "BLT on wheat with mac salad. What else?"
`;
```

---

## Key Discoveries from Sept 15 Scan

1. **Menu infrastructure is MORE complete than expected**:
   - Full Supabase tables with modifiers, aliases, dietary flags
   - Complete API endpoints with caching
   - Services for both frontend and backend
   - Type definitions in shared folder

2. **Missing pieces are smaller than anticipated**:
   - Just need MenuContextManager to bridge menu → voice
   - sync-ai endpoint stub exists, needs implementation
   - All data structures support voice needs (aliases, modifiers)

3. **Seed data exists**:
   - See `server/scripts/seed-menu-mapped.ts` for Grow Fresh menu
   - See `scripts/seed-database.ts` for sample menu items

**Note**: This document contains all context needed to continue the voice agent menu integration. The menu system is fully built - we just need to connect it to the voice agent for intelligence.