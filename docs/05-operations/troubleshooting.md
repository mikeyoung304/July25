# Troubleshooting Guide

## Common Issues

### Build & Development

#### TypeScript Errors (482 known errors)
**Symptom**: TypeScript shows ~482 errors but app runs
**Status**: Known, non-blocking
**Solution**: These are legacy errors that don't prevent operation
```bash
npm run dev  # Will work despite errors
```

#### Port Already in Use
**Symptom**: `EADDRINUSE: address already in use`
**Solution**:
```bash
# Kill frontend port
npx kill-port 5173

# Kill backend port  
npx kill-port 3001

# Or find and kill manually
lsof -i :5173
kill -9 [PID]
```

#### Memory Issues During Build
**Symptom**: `JavaScript heap out of memory`
**Solution**:
```bash
# Increase memory allocation
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Clear caches
rm -rf node_modules/.vite
rm -rf client/dist
```

#### HMR Not Working
**Symptom**: Changes don't reflect in browser
**Solution**:
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart with clean cache
npm run dev
```

### Database Issues

#### Connection Failed
**Symptom**: `Failed to connect to Supabase`
**Checks**:
1. Verify `.env` credentials:
   ```env
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```
2. Check project status (not paused)
3. Test connection:
   ```bash
   curl https://xxx.supabase.co/rest/v1/
   ```

#### Restaurant Context Missing
**Symptom**: `x-restaurant-id header required`
**Solution**:
```javascript
// Ensure header is set
const headers = {
  'x-restaurant-id': '11111111-1111-1111-1111-111111111111'
};
```

#### RLS Policy Violations
**Symptom**: `new row violates row-level security policy`
**Solution**:
1. Check user's restaurant_id claim in JWT
2. Verify RLS policies in Supabase dashboard
3. Ensure restaurant_id is included in insert

### Voice Ordering Issues

#### Microphone Not Working
**Symptom**: No audio input detected
**Checks**:
1. Browser permissions:
   - Click padlock icon in address bar
   - Allow microphone access
2. System permissions:
   - macOS: System Preferences > Security & Privacy > Microphone
   - Windows: Settings > Privacy > Microphone
3. Test microphone:
   ```javascript
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(stream => console.log('Mic working'))
     .catch(err => console.error('Mic error:', err));
   ```

#### WebRTC Connection Failed
**Symptom**: `Failed to establish WebRTC connection`
**Solution**:
1. Check OpenAI API key in backend `.env`
2. Verify HTTPS in production (required for WebRTC)
3. Check browser console for detailed errors
4. Enable debug mode:
   ```javascript
   localStorage.setItem('voice-debug', 'true');
   ```

#### No Transcription
**Symptom**: Speech not converting to text
**Checks**:
1. OpenAI API quota and billing
2. Network connectivity
3. Audio quality (quiet environment)
4. Correct language (English expected)

### WebSocket Issues

#### KDS Not Updating
**Symptom**: Orders stuck, not showing real-time updates
**Debug Steps**:
1. Check WebSocket connection:
   ```javascript
   // In browser console
   const ws = new WebSocket('ws://localhost:3001');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (e) => console.error('Error:', e);
   ```
2. Verify restaurant_id in messages
3. Check for reconnection logic
4. Monitor network tab for WS frames

#### Connection Drops
**Symptom**: `WebSocket connection lost`
**Solution**: Implement exponential backoff
```javascript
let retries = 0;
const reconnect = () => {
  setTimeout(() => {
    connectWebSocket();
    retries++;
  }, Math.min(1000 * Math.pow(2, retries), 30000));
};
```

### Payment Issues

#### Square Not Initializing
**Symptom**: Payment form doesn't appear
**Checks**:
1. Verify Square credentials:
   ```env
   SQUARE_ACCESS_TOKEN=your-token
   SQUARE_APPLICATION_ID=your-app-id
   SQUARE_LOCATION_ID=your-location-id
   ```
2. Check environment (sandbox vs production)
3. Browser console for Square SDK errors
4. Network tab for failed Square API calls

#### Payment Failed
**Symptom**: `Payment processing failed`
**Debug**:
```javascript
// Enable Square debug mode
const payments = Square.payments(appId, locationId);
payments.setLogLevel('debug');
```

### Performance Issues

#### Slow Initial Load
**Symptom**: App takes long to load
**Checks**:
1. Bundle size:
   ```bash
   npm run analyze
   ```
2. Network waterfall in DevTools
3. Lighthouse performance audit
4. Check for large imports:
   ```bash
   npx vite-bundle-visualizer
   ```

#### Memory Leaks
**Symptom**: App slows down over time
**Detection**:
1. Chrome DevTools > Memory > Heap Snapshot
2. Look for detached DOM nodes
3. Check for uncleared intervals/timeouts
4. Monitor WebSocket connections

### Authentication Issues

#### JWT Expired
**Symptom**: `401 Unauthorized`
**Solution**:
```javascript
// Implement token refresh
if (error.status === 401) {
  await refreshToken();
  retry(request);
}
```

#### Demo Login Not Working
**Symptom**: Can't access demo mode
**Solution**:
```bash
# Get demo token
curl http://localhost:3001/api/v1/auth/demo
```

### Order Management Issues

#### Order Status Errors
**Symptom**: `Cannot read property 'status' of undefined`
**Critical Fix**:
```javascript
// ALL 7 statuses MUST be handled
const ALL_STATUSES = [
  'new', 'pending', 'confirmed', 
  'preparing', 'ready', 'completed', 'cancelled'
];

// Always include default case
switch (order?.status) {
  case 'new': // handle
  // ... all cases
  default: 
    console.error('Unknown status:', order?.status);
    return 'pending'; // Safe default
}
```

## Debug Tools

### Browser Console Commands

```javascript
// Enable all debug logging
localStorage.setItem('debug', '*');

// Check WebSocket state
window.__ws?.readyState;

// Force refresh orders
window.__refreshOrders?.();

// Clear all caches
localStorage.clear();
sessionStorage.clear();
```

### Backend Debug

```bash
# Enable debug logging
DEBUG=* npm run dev

# Specific modules
DEBUG=api:*,ws:* npm run dev

# Database queries
DEBUG=knex:query npm run dev
```

### Health Check Endpoints

```bash
# Overall health
curl http://localhost:3001/api/v1/health

# Database connection
curl http://localhost:3001/api/v1/health/db

# Redis connection (if applicable)
curl http://localhost:3001/api/v1/health/redis

# External services
curl http://localhost:3001/api/v1/health/services
```

## Error Codes Reference

| Code | Meaning | Action |
|------|---------|--------|
| `AUTH_001` | Missing authentication | Add Bearer token |
| `AUTH_002` | Invalid token | Refresh token |
| `AUTH_003` | Insufficient permissions | Check user role |
| `DB_001` | Database connection failed | Check credentials |
| `DB_002` | Query timeout | Optimize query |
| `WS_001` | WebSocket disconnected | Implement reconnection |
| `PAY_001` | Payment failed | Check Square config |
| `AI_001` | OpenAI API error | Check API key/quota |

## Getting Help

1. **Check Logs**:
   - Browser console
   - Network tab
   - Backend logs

2. **Enable Debug Mode**:
   ```javascript
   localStorage.setItem('debug', 'true');
   ```

3. **Collect Information**:
   - Error message
   - Browser/OS version
   - Steps to reproduce
   - Network HAR file

4. **Report Issue**:
   - GitHub Issues
   - Include debug information
   - Provide minimal reproduction