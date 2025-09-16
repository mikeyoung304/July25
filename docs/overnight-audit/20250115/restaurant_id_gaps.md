# Restaurant ID Propagation Gaps

## ✅ CORRECTLY PROPAGATED PATHS

### Orders API
- **POST /api/v1/orders**: Properly propagated
  - Header: `x-restaurant-id` → `req.restaurantId` (middleware/auth.ts:207,228)
  - Service: `OrdersService.createOrder(restaurantId, ...)` (routes/orders.routes.ts:77)
  - Database: `restaurant_id: restaurantId` (services/orders.service.ts:131)

- **POST /api/v1/orders/voice**: Properly propagated
  - Header: `x-restaurant-id` → `req.restaurantId`
  - Service: `OrdersService.processVoiceOrder(restaurantId, ...)` (routes/orders.routes.ts:183)
  - Database: `restaurant_id: restaurantId` (services/orders.service.ts:434,456,482)

- **PATCH /api/v1/orders/:id/status**: Properly propagated
  - Header: `x-restaurant-id` → `req.restaurantId`
  - Service: `OrdersService.updateOrderStatus(restaurantId, ...)` (routes/orders.routes.ts:260)
  - Database: `.eq('restaurant_id', restaurantId)` (services/orders.service.ts:308)

### Client Side
- **useApiRequest hook**: Always adds header
  - `headers.set('x-restaurant-id', restaurant.id)` (hooks/useApiRequest.ts:52)

- **HttpClient**: Fallback chain implemented
  - `headers.set('x-restaurant-id', finalRestaurantId)` (services/http/httpClient.ts:173)

## ⚠️ POTENTIAL GAPS

### 1. WebSocket Messages
- **Location**: client/src/services/websocket/WebSocketService.ts:174
- **Issue**: WebSocket messages use `toSnakeCase()` but don't explicitly add restaurant_id
- **Risk**: If the message object doesn't contain restaurantId, it won't be sent
- **Recommendation**: Ensure all WebSocket messages include restaurantId field

### 2. Voice Order Integration
- **Location**: client/src/pages/hooks/useVoiceOrderWebRTC.ts:234,355,416,442
- **Current**: Uses fallback chain with env variable
  ```typescript
  'X-Restaurant-ID': restaurantId || import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
  ```
- **Risk**: Relies on environment variable if restaurantId not available
- **Recommendation**: Always require restaurantId from RestaurantContext

### 3. Kiosk Order Submission
- **Location**: client/src/hooks/kiosk/useOrderSubmission.ts:59
- **Current**: Only uses environment variable
  ```typescript
  'X-Restaurant-ID': import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
  ```
- **Risk**: No dynamic restaurant ID support for kiosk mode
- **Recommendation**: Get restaurant ID from context or URL parameter

### 4. Tables API
- **Location**: server/src/routes/tables.routes.ts (multiple endpoints)
- **Issue**: Direct header access instead of using validated `req.restaurantId`
  ```typescript
  const restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
  ```
- **Risk**: Bypasses middleware validation
- **Recommendation**: Use `req.restaurantId` from auth middleware

## 🔴 CRITICAL FINDINGS

### Missing Restaurant ID Validation
1. **Menu Service**: No restaurant_id validation in menu item lookups
   - services/menu.service.ts - getItems() doesn't filter by restaurant

2. **Voice Order Logs**: Creates logs but doesn't validate restaurant ownership
   - services/orders.service.ts:433 - inserts log without checking restaurant exists

3. **Order Number Generation**: Counts orders but scoped to restaurant
   - services/orders.service.ts:509 - Correctly scoped, no issue

## RECOMMENDATIONS

1. **Enforce at middleware level**: All write operations should use `validateRestaurantAccess` middleware
2. **Remove fallbacks**: Don't use default restaurant IDs in production
3. **Add validation**: Check restaurant exists before any write operation
4. **Audit logs**: Log when fallback restaurant IDs are used
5. **Type safety**: Make restaurantId required in all service method signatures