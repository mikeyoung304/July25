# Order System Data Alignment Guide

## Overview
This document ensures all ordering channels (online, voice, kiosk, server) communicate properly with the Kitchen Display System (KDS) using consistent data structures.

## Unified Order Structure

### Order Types (Consistent Across All Channels)
```typescript
type UnifiedOrderType = 'dine-in' | 'drive-thru' | 'takeout' | 'delivery';
```
- **NO UNDERSCORES** - Always use hyphens (dine-in, not dine_in)
- All channels support all types

### Order Status Values
```typescript
type UnifiedOrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
```
- **Initial status**: Always use `'new'` (not 'pending')
- KDS filters specifically look for `'new'` status

### Menu Item IDs
All menu items use **numeric string IDs** for consistency:
- Beverages: 101-199
- Starters: 201-299
- Salads: 301-399
- Sandwiches: 401-499
- Bowls: 501-599
- Vegan: 601-699
- Entrees: 701-799

### Modifier Structure
Always use object format with price:
```typescript
interface UnifiedModifier {
  id: string;
  name: string;
  price: number;
}
```

### Required Fields for KDS
Every order MUST include:
- `id`: Unique order identifier
- `restaurant_id`: For multi-tenancy (snake_case)
- `orderNumber`: Display number (#001, #002)
- `type`: Order type (see above)
- `status`: Current status (see above)
- `orderTime`: When order was placed
- `items`: Array of order items with:
  - `category`: For KDS station routing (grill, fryer, salad, etc.)

## Channel-Specific Requirements

### Online Ordering
- Source: `'online'`
- Must capture customer info for delivery orders
- Payment handled through Square integration

### Voice Ordering
- Source: `'voice'`
- AI parses natural language to structured order
- Must map spoken items to menu item IDs

### Kiosk Ordering
- Source: `'kiosk'`
- Customer name optional
- Table number required for dine-in

### Server Input
- Source: `'server'`
- Full order details required
- Table number mandatory for dine-in

## KDS Display Requirements

The Kitchen Display System shows:
- Order number and type (color-coded)
- Items grouped by station
- Urgency indicators based on elapsed time:
  - Normal: < 10 minutes
  - Warning: 10-15 minutes (yellow)
  - Urgent: 15-20 minutes (orange)
  - Critical: > 20 minutes (red, pulsing)

## Data Flow

1. **Order Creation** → Unified format using `toUnifiedOrder()`
2. **Database Storage** → Consistent schema with snake_case
3. **WebSocket Updates** → Real-time status changes
4. **KDS Display** → Filtered by status and formatted for kitchen

## Implementation Checklist

- [x] Create unified order types (`/client/src/types/unified-order.ts`)
- [x] Update menu item IDs to numeric strings
- [x] Fix order type inconsistencies (hyphens everywhere)
- [x] Standardize modifier structure
- [ ] Update voice order integration to use unified format
- [ ] Update kiosk to use unified format
- [ ] Add validation to ensure required KDS fields
- [ ] Test all channels with KDS display

## Common Issues Fixed

1. **Order Type Mismatch**: Was using both underscores and hyphens
2. **Menu ID Inconsistency**: Was using mixed formats (bev-1, 1, etc.)
3. **Status Confusion**: Some used 'new', others 'pending'
4. **Modifier Format**: String arrays vs object arrays
5. **Restaurant ID**: snake_case vs camelCase

## Testing

Test each ordering channel:
1. Create order from each source
2. Verify order appears correctly in KDS
3. Check station routing works
4. Confirm urgency indicators update
5. Test status transitions