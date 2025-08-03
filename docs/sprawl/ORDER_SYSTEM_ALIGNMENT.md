# Order System Data Alignment Guide

## Overview
This document ensures all ordering channels (BuildPanel AI, voice, kiosk, server) communicate properly with the Kitchen Display System (KDS) using consistent data structures.

**Updated for BuildPanel Integration** - Voice and text orders now process through BuildPanel before reaching the KDS.

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

### BuildPanel AI Ordering (Voice)
- Source: `'voice'` 
- **Flow**: Frontend → WebSocket → Backend → BuildPanel `/api/voice-chat`
- BuildPanel handles transcription, parsing, and order structuring
- Returns `{transcription, response, orderData, audioBuffer}`
- Backend creates order from BuildPanel's `orderData`

### BuildPanel AI Ordering (Text Chat)
- Source: `'chat'`
- **Flow**: Frontend → Backend → BuildPanel `/api/chatbot`
- BuildPanel parses natural language to structured order
- Returns `{message, suggestions, orderData}`
- Backend creates order if `orderData` is provided

### Direct Kiosk Ordering
- Source: `'kiosk'`
- **Flow**: Frontend → Backend → Database (no AI processing)
- Customer name optional
- Table number required for dine-in

### Server Input
- Source: `'server'`
- **Flow**: Frontend → Backend → Database (direct entry)
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

### BuildPanel-Enhanced Flow
1. **AI Order Processing** → BuildPanel parses voice/text to structured data
2. **Order Creation** → Backend transforms BuildPanel data to unified format 
3. **Database Storage** → Consistent schema with snake_case
4. **WebSocket Updates** → Real-time status changes
5. **KDS Display** → Filtered by status and formatted for kitchen

### Direct Order Flow (Kiosk/Server)
1. **Order Creation** → Frontend creates unified format directly
2. **Database Storage** → Consistent schema with snake_case
3. **WebSocket Updates** → Real-time status changes
4. **KDS Display** → Filtered by status and formatted for kitchen

## Implementation Checklist

- [x] Create unified order types (`/client/src/types/unified-order.ts`)
- [x] Update menu item IDs to numeric strings
- [x] Fix order type inconsistencies (hyphens everywhere)
- [x] Standardize modifier structure
- [x] Integrate BuildPanel for voice order processing
- [x] Integrate BuildPanel for text chat orders
- [x] Update voice order integration to use BuildPanel + unified format
- [x] Maintain kiosk unified format compatibility
- [x] Add validation to ensure required KDS fields
- [x] Test BuildPanel integration with KDS display
- [ ] Performance optimization for BuildPanel calls

## Common Issues Fixed

1. **Order Type Mismatch**: Was using both underscores and hyphens
2. **Menu ID Inconsistency**: Was using mixed formats (bev-1, 1, etc.)
3. **Status Confusion**: Some used 'new', others 'pending'
4. **Modifier Format**: String arrays vs object arrays
5. **Restaurant ID**: snake_case vs camelCase
6. **AI Integration**: Voice orders now process through BuildPanel for better accuracy
7. **Data Transformation**: BuildPanel responses properly mapped to unified order format
8. **Context Preservation**: Restaurant context maintained through BuildPanel calls

## Testing

Test each ordering channel:
1. **BuildPanel Voice Orders**: Speak order → Verify transcription → Check KDS display
2. **BuildPanel Text Orders**: Type order → Verify parsing → Check KDS display
3. **Direct Kiosk Orders**: Select items → Submit → Check KDS display
4. **Server Orders**: Enter details → Submit → Check KDS display
5. **Cross-Channel Validation**: Ensure all orders appear consistently in KDS
6. **Station Routing**: Verify orders route to correct kitchen stations
7. **Real-time Updates**: Confirm WebSocket updates work for all channels
8. **Urgency Indicators**: Test timing-based visual cues
9. **Status Transitions**: Verify status changes propagate correctly