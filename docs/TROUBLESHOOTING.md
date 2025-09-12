# Troubleshooting Guide

## Authentication Issues

### 401 Unauthorized Errors

#### Symptom: "No token provided"
**Cause**: Missing or malformed Authorization header  
**Solution**: 
- Ensure header format is `Authorization: Bearer <token>`
- Check token is not expired
- Verify token is being sent with request

#### Symptom: "No access to this restaurant"
**Cause**: User has no role in the requested restaurant  
**Solution**:
- Check user_restaurants table for user/restaurant mapping
- Verify restaurant_id is correct
- Ensure is_active = true for the user_restaurant record

#### Symptom: "Token expired"
**Cause**: JWT expiration time has passed  
**Solution**:
- Refresh token via `/api/v1/auth/refresh`
- Re-authenticate user
- Check server time sync (tokens use UTC)

### 403 Forbidden Errors

#### Symptom: "Insufficient permissions"
**Cause**: User role lacks required scope  
**Solution**:
- Check ROLE_SCOPES mapping in shared/types/auth.ts
- Verify user has correct role for operation:
  - Orders create: owner, manager, server, customer
  - Orders status update: all except customer
  - Payments: owner, manager, server, cashier

#### Symptom: "Restaurant context required"
**Cause**: Missing X-Restaurant-ID header on write operation  
**Solution**:
- Add header: `X-Restaurant-ID: <restaurant-uuid>`
- For kiosk mode, use default restaurant from env
- Check restaurant exists and is active

### Order Submission Failures

#### Symptom: "Invalid order data: items.0.id: Required"
**Cause**: Using snake_case field names  
**Solution**:
- Use camelCase: `id` not `menu_item_id`
- Use camelCase: `customerName` not `customer_name`
- Use camelCase: `tableNumber` not `table_number`

#### Symptom: Duplicate items in voice orders
**Cause**: Both voice parsing and UI adding items  
**Solution**:
- In server mode, set `mode="server"` on VoiceOrderModal
- Check for duplicate detection in useVoiceOrderWebRTC
- Verify 2-second deduplication window is working

#### Symptom: Orders created twice
**Cause**: Missing idempotency handling  
**Solution**:
- Send `X-Idempotency-Key` header with unique value
- Use same key for retries within 5 minutes
- Generate key from order content hash if needed

### WebSocket Connection Issues

#### Symptom: "WebSocket authentication failed"
**Cause**: Invalid or missing token in connection URL  
**Solution**:
```javascript
// Correct format
const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}&restaurant_id=${restaurantId}`);
```

#### Symptom: Connection drops after 1 minute
**Cause**: Missing heartbeat/pong responses  
**Solution**:
- Implement pong handler in client
- Check network keeps connection alive
- Monitor for 'ping' events and respond

### Voice System Issues

#### Symptom: Voice not detecting orders
**Cause**: Wrong mode or double processing  
**Solution**:
- Server mode: `onOrderDetected` should be undefined
- Kiosk mode: `onOrderDetected` processes server response
- Check OrderParser has menu items loaded

#### Symptom: "No handlers for event" warnings
**Cause**: Component recreation destroying listeners  
**Solution**:
- Check useEffect dependencies in voice hooks
- Use refs for callbacks to prevent recreation
- Monitor for frequent "Cleaning up" messages

## Debugging Tools

### Check Authentication State
```bash
# Decode JWT token
echo "YOUR_TOKEN" | cut -d. -f2 | base64 -d | jq

# Test auth endpoint
curl -H "Authorization: Bearer TOKEN" \
     -H "X-Restaurant-ID: RESTAURANT_ID" \
     http://localhost:3001/api/v1/auth/me
```

### Monitor Real-time Logs
```bash
# Auth events
tail -f logs/app.log | grep -E "AUTH|auth"

# Order events  
tail -f logs/app.log | grep -E "order|Order"

# WebSocket events
tail -f logs/app.log | grep -E "WebSocket|ws"
```

### Test Idempotency
```bash
# Send duplicate order with same key
KEY="test-$(date +%s)"
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "X-Restaurant-ID: RESTAURANT_ID" \
  -H "X-Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"items":[...],"subtotal":10,"tax":0.8,"total":10.8}'

# Send again - should return same order
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "X-Restaurant-ID: RESTAURANT_ID" \
  -H "X-Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"items":[...],"subtotal":10,"tax":0.8,"total":10.8}'
```

### Database Queries

```sql
-- Check user restaurant roles
SELECT ur.*, u.email 
FROM user_restaurants ur
JOIN users u ON u.id = ur.user_id
WHERE ur.restaurant_id = 'YOUR_RESTAURANT_ID';

-- Check recent auth logs
SELECT * FROM auth_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check order idempotency
SELECT id, idempotency_key, created_at 
FROM orders 
WHERE idempotency_key IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

## Common Fixes

### Clear All Caches
```javascript
// Server-side
authService.clearAllCache();
idempotencyService.clear();

// Client-side  
localStorage.clear();
sessionStorage.clear();
```

### Reset User Permissions
```sql
-- Refresh user role
UPDATE user_restaurants 
SET role = 'manager', is_active = true
WHERE user_id = 'USER_ID' 
  AND restaurant_id = 'RESTAURANT_ID';
```

### Force Token Refresh
```javascript
// Client-side
await supabase.auth.refreshSession();
const { data: { session } } = await supabase.auth.getSession();
```

## Error Code Reference

| Code | Meaning | Action |
|------|---------|--------|
| AUTH_ROLE_MISSING | No role found for user | Check user_restaurants table |
| AUTH_SCOPE_MISSING | Operation not allowed for role | Upgrade user role or check ROLE_SCOPES |
| RESTAURANT_CONTEXT_MISSING | No restaurant specified | Add X-Restaurant-ID header |
| INVALID_DTO | Payload validation failed | Check field names and types |
| IDEMPOTENT_DUPLICATE | Request already processed | Expected - returns cached result |

## Contact Support

If issues persist after trying these solutions:
1. Collect error logs from last 30 minutes
2. Note exact API endpoint and payload
3. Include user ID and restaurant ID
4. File issue at: https://github.com/yourorg/restaurant-os/issues