# Kitchen Display System (KDS)

## Overview

The Kitchen Display System is a real-time order management interface for kitchen staff at Grow Fresh Local Food. It displays incoming orders from multiple channels (kiosk, voice, online) and allows kitchen staff to update order status.

## Architecture

### Data Flow
```
Customer Order → API → Database → WebSocket Broadcast → Kitchen Display
                           ↓
                    Order Created Event
                           ↓
                    All Connected Clients
```

### Key Components

1. **Frontend (`/client/src/pages/KitchenDisplay.tsx`)**
   - Real-time order display grid
   - WebSocket subscription for live updates
   - Order status management (pending → preparing → ready)
   - Sound notifications for new orders

2. **Backend Order Processing**
   - `/api/v1/orders` - REST API for order CRUD
   - WebSocket broadcasting for real-time updates
   - Demo authentication support for friends & family testing

3. **WebSocket Communication**
   - Automatic reconnection with exponential backoff
   - Event types: `order:created`, `order:updated`, `order:status_changed`
   - Restaurant-scoped broadcasting (multi-tenant support)

## Authentication

### Demo Mode (Friends & Family)
The system supports demo authentication for testing without Supabase:

1. **Demo Token Generation**
   - Generated automatically via `/client/src/services/auth/demoAuth.ts`
   - Contains restaurant ID: `11111111-1111-1111-1111-111111111111`
   - Signed with `KIOSK_JWT_SECRET`

2. **Authentication Flow**
   ```
   Browser → Request Demo Token → Generate JWT → API/WebSocket Auth
   ```

3. **Restaurant Context**
   - HTTP Client: Falls back to demo restaurant ID if not set
   - WebSocket: Uses demo token with embedded restaurant ID
   - Ensures all requests have proper multi-tenant context

## Order Types

The system handles three primary order types:
- `kiosk` - Self-service kiosk orders
- `voice` - Voice-activated ordering via WebRTC/OpenAI
- `online` - Web-based orders

## Real-Time Updates

### WebSocket Events

1. **order:created**
   ```json
   {
     "type": "order:created",
     "order": { /* order data */ },
     "timestamp": "2025-08-18T14:00:00Z"
   }
   ```

2. **order:updated**
   ```json
   {
     "type": "order:updated",
     "order": { /* updated order */ },
     "timestamp": "2025-08-18T14:00:00Z"
   }
   ```

3. **order:status_changed**
   ```json
   {
     "type": "order:status_changed",
     "orderId": "order-123",
     "status": "ready",
     "timestamp": "2025-08-18T14:00:00Z"
   }
   ```

## Configuration

### Environment Variables

**Client (.env)**
```bash
VITE_API_BASE_URL=http://localhost:3001  # Backend URL
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

**Server (.env)**
```bash
KIOSK_JWT_SECRET=your-secret-key  # For demo token signing
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

## Common Issues & Solutions

### Orders Not Appearing

1. **Check WebSocket Connection**
   - Look for "🔌 WebSocket connected" in browser console
   - Verify token generation: "🔑 Using demo token for WebSocket"

2. **Verify Restaurant ID**
   - Check HTTP requests include `X-Restaurant-ID` header
   - Look for "🏢 Using demo restaurant ID" in console

3. **Check API Response**
   - Orders API should return array of orders
   - Check network tab for `/api/v1/orders` response

### WebSocket Connection Issues

1. **Authentication Failures**
   - Ensure `KIOSK_JWT_SECRET` is set on server
   - Check demo token generation in browser console
   - Verify server logs show "Demo token verified"

2. **Reconnection Problems**
   - WebSocket auto-reconnects with exponential backoff
   - Max 6 reconnection attempts
   - Check for "WebSocket reconnecting..." messages

### TypeScript Errors

Common compilation errors and fixes:

1. **Order Type Mismatch**
   ```typescript
   // Wrong: type: 'dine-in'
   // Correct: type: 'kiosk' | 'voice' | 'online'
   ```

2. **Restaurant ID Property**
   ```typescript
   // Snake_case in database: restaurant_id
   // CamelCase in frontend: restaurantId
   ```

## Testing

### Create Test Order via API
```bash
TOKEN=$(cat /tmp/token.txt)  # Or generate demo token
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -d '{
    "customer_name": "Test Customer",
    "type": "kiosk",
    "items": [{
      "id": "item-1",
      "name": "Greek Bowl",
      "quantity": 1,
      "price": 14.00
    }],
    "subtotal": 14.00,
    "tax": 1.12,
    "total": 15.12
  }'
```

### Create Test Order via UI
Click "Create Test Order" button in Kitchen Display to generate random test orders.

## Development

### Local Setup
```bash
# Start backend
npm run dev:server

# Start frontend
npm run dev:client

# Access Kitchen Display
http://localhost:5173/kitchen
```

### Key Files
- `/client/src/pages/KitchenDisplay.tsx` - Main KDS component
- `/client/src/hooks/kitchen/useKitchenOrders.ts` - Order management hook
- `/client/src/services/websocket/WebSocketService.ts` - WebSocket client
- `/server/src/utils/websocket.ts` - WebSocket server handlers
- `/server/src/routes/orders.routes.ts` - Order API endpoints

## Production Deployment

### Current Status
- Frontend: Deployed on Vercel (july25-client.vercel.app)
- Backend: Deployed on Render (july25.onrender.com)
- Database: Supabase Cloud

### Security Considerations
1. Test tokens are disabled in production (only work on localhost)
2. All orders are scoped to restaurant ID
3. Demo tokens have limited scopes: `menu:read`, `orders:create`
4. WebSocket connections require valid JWT authentication

## Monitoring

### Health Checks
- Backend: `/api/v1/health`
- WebSocket: Check for "pong" responses to "ping" messages
- Orders API: `/api/v1/orders` should return array

### Logs to Monitor
- "New WebSocket connection"
- "Demo token verified for WebSocket connection"
- "Broadcast to N clients in restaurant"
- "Order created successfully"

## Future Improvements

1. **Performance**
   - Implement pagination for order list
   - Add caching for frequently accessed orders
   - Optimize WebSocket message size

2. **Features**
   - Order grouping by station
   - Estimated preparation time
   - Kitchen printer integration
   - Order history and analytics

3. **Reliability**
   - Add Redis for WebSocket pub/sub
   - Implement order queue for offline resilience
   - Add comprehensive error recovery

## Support

For issues or questions:
- Check browser console for client-side errors
- Review server logs for backend issues
- Verify environment variables are set correctly
- Ensure demo authentication is working