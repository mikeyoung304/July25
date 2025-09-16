# Fall Menu Voice Agent Implementation Guide

**Created**: September 15, 2025
**Purpose**: Complete implementation guide for fall menu voice ordering system

## 🚀 Quick Start

### 1. Seed the Fall Menu

```bash
# Install dependencies if needed
npm install

# Run the fall menu seed script
npx tsx scripts/seed-fall-menu.ts
```

### 2. Start the Application

```bash
# Start both frontend and backend
npm run dev
```

### 3. Test Voice Ordering

1. Login as server@restaurantos.com
2. Navigate to Server View
3. Click "Connect Voice"
4. Try: "I want a fall salad"
5. Agent asks: "Which dressing and cheese?"
6. Say: "Ranch and feta, add salmon"
7. Agent confirms: "Fall salad, ranch, feta, with salmon. Anything else?"

## 📦 What We Built

### 1. **Fall Menu Seed Data** (`scripts/seed-fall-menu.ts`)
- Complete fall menu with 30+ items
- Structured modifiers (required vs optional)
- Aliases for voice recognition
- Categories: Starters, Salads, Sandwiches, Bowls, Vegan, Entrées

### 2. **MenuContextManager** (`client/src/modules/voice/services/MenuContextManager.ts`)
- Loads menu from API
- Slot-filling logic for required fields
- Item validation and lookup
- Modification tracking
- Order assembly

### 3. **Voice Agent Configuration** (`client/src/modules/voice/config/fall-menu-agent.ts`)
- OpenAI Realtime API configuration
- Lean system prompt (12-word responses)
- Implicit confirmations
- Progressive disclosure
- Tool definitions for order management

### 4. **Integration Hook** (`client/src/modules/voice/hooks/useVoiceMenuIntegration.ts`)
- Connects menu to voice client
- Processes transcripts with slot-filling
- Handles function calls
- Updates cart automatically

### 5. **AI Sync Service** (`server/src/services/menu-ai-sync.service.ts`)
- Syncs menu to OpenAI Assistant
- Transforms data for AI consumption
- Maintains assistant per restaurant

## 🔧 Integration Steps

### Step 1: Update Your Voice Component

```tsx
// In your VoiceControlWebRTC.tsx or similar component
import { useVoiceMenuIntegration } from '@/modules/voice/hooks/useVoiceMenuIntegration';
import { generateSessionConfig } from '@/modules/voice/config/fall-menu-agent';

export function VoiceControlWebRTC() {
  const [voiceClient, setVoiceClient] = useState<WebRTCVoiceClient | null>(null);

  // Add menu integration
  const menuIntegration = useVoiceMenuIntegration(voiceClient);

  // When initializing voice client
  const initializeVoice = async () => {
    const client = new WebRTCVoiceClient();

    // Wait for menu to load
    if (!menuIntegration.isReady) {
      console.log('Waiting for menu...');
      return;
    }

    // Get session config with menu
    const menuContext = menuIntegration.getMenuContext();
    const sessionConfig = generateSessionConfig(menuContext);

    // Initialize with menu-aware config
    await client.initialize(sessionConfig);

    setVoiceClient(client);
  };

  // Process transcripts through menu manager
  const handleTranscript = (transcript: string) => {
    const result = menuIntegration.processTranscript(transcript);

    if (result) {
      console.log('Menu processing result:', result);
      // Handle the response (update UI, etc.)
    }
  };

  // ... rest of component
}
```

### Step 2: Connect to Existing Hooks

```tsx
// In useWebRTCVoice.ts or similar
import { menuContextManager } from '../services/MenuContextManager';

// Inside your hook
useEffect(() => {
  if (!client) return;

  // Handle incoming transcripts
  client.on('transcript', (data) => {
    // Process through menu manager
    const result = menuContextManager.processOrderUtterance(data.text);

    if (result.action === 'confirm' && result.item) {
      // Add to cart
      addToCart(result.item);
    } else if (result.action === 'ask') {
      // Voice agent will ask the question
      console.log('Agent asking:', result.message);
    }
  });
}, [client]);
```

### Step 3: Sync Menu to AI (Backend)

```bash
# Call the sync endpoint after seeding
curl -X POST http://localhost:3001/api/v1/menu/sync-ai \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-restaurant-id: 11111111-1111-1111-1111-111111111111"
```

## 🎯 Testing Scenarios

### Basic Order Flow
```
User: "I want nachos"
Agent: "Chicken or Sloppy Joe?"
User: "Chicken"
Agent: "Grow Nacho with chicken. Anything else?"
```

### Multi-Slot Item
```
User: "BLT please"
Agent: "Which bread and side?"
User: "Wheat and mac salad"
Agent: "BLT on wheat with mac salad. What else?"
```

### Complete Order
```
User: "Chicken and dressing"
Agent: "Two sides?"
User: "Collards and carrots"
Agent: "Chicken & Dressing, collards, carrots. Anything else?"
User: "That's it"
Agent: "Total sixteen dollars. Ready to pay?"
```

### Modifications
```
User: "Greek salad, no onions, dressing on side"
Agent: "Greek salad, no onions, dressing on side. What else?"
```

## 📊 Menu Structure

### Required Slots by Category

| Category | Item | Required Slots |
|----------|------|----------------|
| Nachos | Grow Nacho | protein (Chicken/Sloppy Joe) |
| Salads | Fall Salad | dressing, cheese |
| Salads | Grilled Chicken | dressing |
| Sandwiches | ALL | bread, side |
| Entrées | ALL | side1, side2 |
| Vegan | None | - |
| Bowls | None | - |

### Global Options

**Dressings**: Vidalia Onion, Balsamic, Ranch, Greek, Honey Mustard, Apple Vinaigrette, Poppy-Seed

**Sides**: Dressing & Gravy, Mashed Sweet Potato, Broccoli with Cheese Sauce, Collards, Roasted Rainbow Carrots, Yellow Rice, Black-Eyed Peas, Braised Cabbage, Macaroni Salad, Apple Sauce, Side Salad

**Breads**: White, Wheat, Flatbread

## 🐛 Troubleshooting

### Menu Not Loading
```bash
# Check if menu data exists
psql $DATABASE_URL -c "SELECT COUNT(*) FROM menu_items WHERE restaurant_id='11111111-1111-1111-1111-111111111111';"

# Re-run seed if needed
npx tsx scripts/seed-fall-menu.ts
```

### Voice Not Recognizing Items
```javascript
// Check aliases in MenuContextManager
console.log(menuContextManager.findMenuItem("burger")); // Should find "Hamburger Steak"
console.log(menuContextManager.findMenuItem("chicken salad")); // Should find both sandwich and salad
```

### Slots Not Being Asked
```javascript
// Verify required slots in menu data
const item = menuContextManager.findMenuItem("fall salad");
console.log(item.required); // Should show dressing and cheese slots
```

## 🎨 Customization

### Add New Items
Edit `scripts/seed-fall-menu.ts` and add to the items array:

```javascript
{
  external_id: 'new-item',
  name: 'New Item Name',
  category: 'category-slug',
  price: 10.00,
  modifiers: {
    required: [
      { slot: 'size', prompt: 'Small or large?', options: ['Small', 'Large'] }
    ],
    optional: ['no sauce', 'extra cheese']
  },
  aliases: ['nickname1', 'nickname2']
}
```

### Modify Agent Behavior
Edit `client/src/modules/voice/config/fall-menu-agent.ts`:

```javascript
instructions: `
  // Add your custom rules here
  - Always upsell dessert
  - Suggest daily specials
  - Ask about allergies proactively
`
```

### Change Response Style
Adjust the templates in the agent config:

```javascript
// Make more conversational
"[item name], excellent choice! [details]. What else can I get you?"

// Make more efficient
"[item]. Next?"
```

## 📝 Environment Variables

```env
# Required for voice ordering
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
OPENAI_API_KEY=your-key-here
VITE_OPENAI_API_KEY=your-key-here

# Supabase connection
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## ✅ Verification Checklist

- [ ] Fall menu seeded successfully
- [ ] Menu items appear in `/api/v1/menu` response
- [ ] Voice client connects without errors
- [ ] Agent responds with menu knowledge
- [ ] Required slots are asked for
- [ ] Items added to cart correctly
- [ ] Order total calculated properly
- [ ] Checkout flow completes

## 🚢 Production Deployment

1. **Seed Production Database**
   ```bash
   NODE_ENV=production npx tsx scripts/seed-fall-menu.ts
   ```

2. **Sync to OpenAI**
   ```bash
   curl -X POST https://your-api.com/api/v1/menu/sync-ai
   ```

3. **Enable Voice Features**
   - Set `VITE_ENABLE_VOICE=true`
   - Configure OpenAI API keys
   - Test with real devices

4. **Monitor Performance**
   - Track slot-filling success rate
   - Measure order completion time
   - Monitor ASR accuracy

## 📚 Related Documentation

- [MENUFIXINS.md](docs/MENUFIXINS.md) - Detailed technical context
- [VOICE_AGENT_INTEGRATION_ANALYSIS.md](docs/VOICE_AGENT_INTEGRATION_ANALYSIS.md) - Gap analysis
- [fall-menu-agent.ts](client/src/modules/voice/config/fall-menu-agent.ts) - Agent configuration

---

**Ready to test!** Run `npm run dev` and try ordering with voice. The agent now has full menu knowledge with slot-filling intelligence.