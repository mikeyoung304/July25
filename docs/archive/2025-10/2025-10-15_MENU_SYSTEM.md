> **⚠️ ARCHIVED DOCUMENTATION**
> **Date Archived:** October 15, 2025
> **Reason:** Consolidated into canonical documentation
> **See Instead:** [Menu System (Active)](../../explanation/concepts/MENU_SYSTEM.md)
> **This archive preserved for:** Historical architecture reference

# Menu System Architecture (ARCHIVED)

**Last Updated**: October 11, 2025
**Version**: 6.0.7
**Status**: ✅ Production Ready (ARCHIVED)

---

## Overview

The Restaurant OS menu system provides a flexible, multi-tenant architecture for managing restaurant menus with support for modifiers, voice AI ordering, and real-time updates.

## Table of Contents

- [Architecture](#architecture)
- [Data Structure](#data-structure)
- [API Endpoints](#api-endpoints)
- [Changing the Menu](#changing-the-menu)
- [Voice AI Integration](#voice-ai-integration)
- [Cache Management](#cache-management)
- [Known Issues](#known-issues)

---

## Architecture

### Component Flow

```
┌─────────────────┐
│  Client         │
│  (React)        │
└────────┬────────┘
         │ GET /api/v1/menu/items
         ↓
┌─────────────────┐
│  Menu API       │ ← 5-minute cache
│  (Express)      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Supabase       │
│  (PostgreSQL)   │
└─────────────────┘
```

### Key Files

| File | Purpose | Location |
| --- | --- | --- |
| **Seed Script** | Contains all menu items | `/server/scripts/seed-menu.ts` |
| **Menu Routes** | API endpoints | `/server/src/routes/menu.routes.ts` |
| **Menu Service** | Business logic | `/server/src/services/menu.service.ts` |
| **Cache Service** | Redis-style caching | `/server/src/services/cache.service.ts` |
| **Database Schema** | Table definition | Supabase: `menu_items` table |

---

## Data Structure

### Database Schema (`menu_items` table)

```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  preparation_time INTEGER, -- minutes
  modifiers JSONB DEFAULT '[]',
  aliases JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy (enforces multi-tenancy)
CREATE POLICY menu_items_tenant_isolation ON menu_items
  FOR ALL USING (restaurant_id = current_setting('app.current_restaurant_id')::uuid);

-- Indexes for performance
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(restaurant_id, category);
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id, available);
```

### Menu Item Structure

```typescript
interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  imageUrl: string | null;
  preparationTime: number; // minutes
  modifiers: Modifier[];
  aliases: string[]; // For voice AI matching
  createdAt: string;
  updatedAt: string;
}
```

### Modifiers Structure

```typescript
interface Modifier {
  name: string;
  price: number;
  category: 'add-ons' | 'remove' | 'style';
}
```

**Example**:
```json
{
  "name": "Fried Chicken Sandwich",
  "price": 12.99,
  "category": "Sandwiches",
  "modifiers": [
    {
      "name": "Extra Cheese",
      "price": 1.50,
      "category": "add-ons"
    },
    {
      "name": "No pickles",
      "price": 0,
      "category": "remove"
    },
    {
      "name": "Spicy",
      "price": 0,
      "category": "style"
    }
  ],
  "aliases": ["chicken sandwich", "fried chicken burger", "crispy chicken"]
}
```

### Categories

Current standard categories:
- `Appetizers`
- `Salads`
- `Entrees`
- `Sandwiches`
- `Sides`
- `Desserts`
- `Beverages`

**Note**: Categories are flexible and can be customized per restaurant.

---

## API Endpoints

### 1. Get All Menu Items

```http
GET /api/v1/menu/items?restaurantId={uuid}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Fried Chicken Sandwich",
      "price": 12.99,
      "category": "Sandwiches",
      "available": true,
      "imageUrl": "/images/menu/fried-chicken-sandwich.jpg",
      "preparationTime": 15,
      "modifiers": [...]
    }
  ]
}
```

**Cache**: 5 minutes (300 seconds)

---

### 2. Get Single Menu Item

```http
GET /api/v1/menu/items/:id
Authorization: Bearer {token}
```

**Response**:
```json
{
  "item": {
    "id": "uuid",
    "name": "Fried Chicken Sandwich",
    "description": "Crispy fried chicken breast on a toasted brioche bun",
    "price": 12.99,
    "category": "Sandwiches",
    "available": true,
    "imageUrl": "/images/menu/fried-chicken-sandwich.jpg",
    "preparationTime": 15,
    "modifiers": [...],
    "aliases": ["chicken sandwich", "fried chicken burger"]
  }
}
```

---

### 3. Sync Menu to Voice AI

```http
POST /api/v1/menu/sync-ai
Authorization: Bearer {token}
Content-Type: application/json

{
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

**Purpose**: Syncs menu items to OpenAI Realtime API for voice ordering

**Response**:
```json
{
  "success": true,
  "itemsSynced": 53,
  "timestamp": "2025-10-11T18:30:00Z"
}
```

**When to call**: After changing menu items or prices

---

### 4. Clear Menu Cache

```http
POST /api/v1/menu/cache/clear
Authorization: Bearer {token}
Content-Type: application/json

{
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

**Purpose**: Force cache refresh after menu changes

**Response**:
```json
{
  "success": true,
  "message": "Cache cleared for restaurant"
}
```

---

## Changing the Menu

### Complete Process: Summer → Fall Menu

#### Step 1: Edit Menu Data

**File**: `/server/scripts/seed-menu.ts`

```bash
# Open the seed file
code /server/scripts/seed-menu.ts
```

**Current Structure**:
```typescript
const menuItems = [
  {
    name: 'Summer Sampler',
    description: 'Seasonal summer appetizer platter',
    price: 14.99,
    category: 'Appetizers',
    available: true,
    image_url: '/images/menu/summer-sampler.jpg',
    preparation_time: 20,
    modifiers: [],
    aliases: ['sampler', 'appetizer platter', 'summer plate']
  },
  // ... more items
];
```

**Add Fall Items**:
```typescript
const menuItems = [
  // Remove or update summer items
  {
    name: 'Butternut Squash Soup',
    description: 'Roasted butternut squash with sage, cream, and toasted pumpkin seeds',
    price: 8.99,
    category: 'Appetizers',
    available: true,
    image_url: '/images/menu/butternut-squash-soup.jpg',
    preparation_time: 15,
    modifiers: [
      { name: 'Extra bread', price: 1.50, category: 'add-ons' },
      { name: 'No cream (vegan)', price: 0, category: 'remove' }
    ],
    aliases: ['squash soup', 'butternut soup', 'fall soup', 'pumpkin soup']
  },
  {
    name: 'Apple Cider Glazed Pork Chop',
    description: 'Grilled pork chop with apple cider glaze, mashed sweet potatoes, and green beans',
    price: 22.99,
    category: 'Entrees',
    available: true,
    image_url: '/images/menu/apple-cider-pork.jpg',
    preparation_time: 25,
    modifiers: [
      { name: 'Double portion', price: 8.00, category: 'add-ons' },
      { name: 'No glaze', price: 0, category: 'remove' }
    ],
    aliases: ['pork chop', 'apple pork', 'cider pork', 'glazed pork']
  },
  {
    name: 'Pumpkin Cheesecake',
    description: 'Creamy pumpkin cheesecake with gingersnap crust and whipped cream',
    price: 7.99,
    category: 'Desserts',
    available: true,
    image_url: '/images/menu/pumpkin-cheesecake.jpg',
    preparation_time: 10,
    modifiers: [],
    aliases: ['cheesecake', 'pumpkin dessert', 'fall dessert']
  },
  // ... keep existing items you want
];
```

---

#### Step 2: Add Menu Images

```bash
# Create images directory if it doesn't exist
mkdir -p /client/public/images/menu/

# Add fall menu images:
# - butternut-squash-soup.jpg
# - apple-cider-pork.jpg
# - pumpkin-cheesecake.jpg
# - pumpkin-spice-latte.jpg
# - apple-pie.jpg
# etc.
```

**Image Requirements**:
- Format: JPG or PNG
- Size: 800x600px recommended
- Max file size: 500KB
- Naming: kebab-case (e.g., `butternut-squash-soup.jpg`)

---

#### Step 3: Run Seed Script

```bash
cd server
npm run seed:menu
```

**Expected Output**:
```
🌱 Seeding menu items...
✅ Seeded 58 menu items successfully
✅ Menu seed complete
```

**What this does**:
1. Connects to Supabase database
2. Deletes existing menu items for the restaurant
3. Inserts new menu items from seed file
4. Maintains restaurant_id isolation

---

#### Step 4: Clear Cache

**Option A: Via API**:
```bash
curl -X POST http://localhost:3001/api/v1/menu/cache/clear \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "11111111-1111-1111-1111-111111111111"}'
```

**Option B: Restart Server**:
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

#### Step 5: Sync to Voice AI

```bash
curl -X POST http://localhost:3001/api/v1/menu/sync-ai \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "11111111-1111-1111-1111-111111111111"}'
```

**Response**:
```json
{
  "success": true,
  "itemsSynced": 58,
  "timestamp": "2025-10-11T18:30:00Z"
}
```

---

#### Step 6: Test Voice Ordering

1. Navigate to `/drive-thru`
2. Press and hold microphone button
3. Say: "I'd like the butternut squash soup"
4. Verify item appears in cart
5. Test variations: "I'll have a pumpkin cheesecake"

---

#### Step 7: Verify Frontend

1. Navigate to `/order/:restaurantId`
2. Verify fall menu items appear
3. Check images load correctly
4. Test modifier selection
5. Add items to cart
6. Complete test order

---

## Voice AI Integration

### How Voice Ordering Works

```
User speaks → OpenAI Realtime API → Function calling → Order detection → Cart
```

**File**: `/client/src/pages/DriveThruPage.tsx:50-68`

```typescript
const handleOrderDetected = useCallback((order: any) => {
  // AI-detected orders from OpenAI Realtime API function calling
  if (!order?.items || order.items.length === 0) return;

  console.log('[DriveThru] Order detected from AI:', order);

  order.items.forEach((detectedItem: any) => {
    const menuItem = menuItems.find(m =>
      m.name.toLowerCase() === detectedItem.name.toLowerCase()
    );

    if (menuItem) {
      console.log(`[DriveThru] Adding ${detectedItem.quantity}x ${menuItem.name}`);
      addItem(menuItem, detectedItem.quantity || 1, detectedItem.modifications || []);
    } else {
      console.warn(`[DriveThru] Menu item not found: ${detectedItem.name}`);
    }
  });
}, [menuItems, addItem]);
```

### Aliases for Voice Recognition

**Purpose**: Help AI match voice input to menu items

**Good Aliases**:
```typescript
aliases: [
  'squash soup',           // Shortened name
  'butternut soup',        // Alternative name
  'fall soup',             // Category + type
  'pumpkin soup',          // Similar item
  'cream of butternut'     // Formal variation
]
```

**Bad Aliases**:
```typescript
aliases: [
  'soup',                  // Too generic
  'thing',                 // Not descriptive
  'yummy squash'           // Colloquial
]
```

---

## Cache Management

### Cache Strategy

**Location**: `/server/src/services/cache.service.ts`

**Implementation**:
```typescript
// Cache key format
const cacheKey = `menu:items:${restaurantId}`;

// TTL: 5 minutes
const TTL = 300;

// Get from cache
const cachedItems = await cache.get(cacheKey);

// Set cache
await cache.set(cacheKey, items, TTL);
```

### When Cache is Cleared

1. **Automatic**: After 5 minutes (TTL expires)
2. **Manual**: POST `/api/v1/menu/cache/clear`
3. **Server restart**: All cache cleared

### Cache Debugging

```bash
# Check if cache is being used (server logs)
GET /api/v1/menu/items
# Look for: "[Menu Service] Returning cached menu items"

# Force cache miss
POST /api/v1/menu/cache/clear

# Verify fresh data
GET /api/v1/menu/items
# Look for: "[Menu Service] Fetching fresh menu items from database"
```

---

## Known Issues

### ✅ Issues Fixed (v6.0.7)

1. **Voice ordering callback empty** - FIXED in commit `c675a1a`
   - Location: `DriveThruPage.tsx:50-68`
   - Status: ✅ Orders now add to cart correctly

### ⚠️ Known Limitations

1. **Menu images not optimized**
   - Impact: Slow load times for large images
   - Workaround: Compress images before upload
   - Future: Implement CDN + image optimization

2. **No menu versioning**
   - Impact: Can't track menu changes over time
   - Workaround: Manual git tracking of seed file
   - Future: Implement menu version table

3. **Voice AI requires exact match**
   - Impact: "chicken sand" won't match "Fried Chicken Sandwich"
   - Workaround: Add comprehensive aliases
   - Future: Implement fuzzy matching

---

## Testing Checklist

### After Menu Change

- [ ] Seed script runs without errors
- [ ] All items appear in database (check Supabase dashboard)
- [ ] Images load correctly in browser
- [ ] Cache cleared (no stale data)
- [ ] Voice AI synced (test with voice order)
- [ ] Modifiers work correctly
- [ ] Prices calculate correctly in cart
- [ ] Checkout completes successfully

### Voice Ordering Tests

- [ ] Say exact menu item name → Item added
- [ ] Say alias (e.g., "squash soup") → Item added
- [ ] Say quantity (e.g., "two soups") → Correct quantity
- [ ] Say modifier (e.g., "no cream") → Modifier applied
- [ ] Say invalid item → Warning logged, no crash

---

## Related Documentation

- [Order Flow](./ORDER_FLOW.md) - Complete order lifecycle
- [Database Schema](./DATABASE.md) - Supabase table structures
- [Voice Ordering](./voice/VOICE_ORDERING_EXPLAINED.md) - Voice AI deep dive
- [API Reference](./api/README.md) - All API endpoints

---

## Support

**Issue**: Menu not updating after seed?
1. Check database directly in Supabase dashboard
2. Clear cache: POST `/api/v1/menu/cache/clear`
3. Restart server
4. Check browser console for errors

**Issue**: Voice ordering not recognizing items?
1. Verify aliases in seed file
2. Sync to AI: POST `/api/v1/menu/sync-ai`
3. Test with exact menu item name first
4. Check browser console for "Menu item not found" warnings

---

**Last Updated**: October 11, 2025
**Version**: 6.0.7
**Maintainer**: Development Team
