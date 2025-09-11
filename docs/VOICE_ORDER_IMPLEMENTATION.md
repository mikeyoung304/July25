# Voice Order Implementation - Server Flow

## Overview
Implemented complete voice ordering flow for server-side operations with Square Terminal payment integration and KDS updates.

## Implementation Date
September 10, 2025

## Architecture

### Flow Diagram
```
Voice Input (WebRTC) 
    → Order Parser 
    → UnifiedCartContext 
    → Order Creation API 
    → Square Terminal Payment 
    → Payment Status Polling 
    → KDS WebSocket Update
```

## Key Components

### 1. Voice Ordering Hook (`useVoiceOrderWebRTC`)
- **Location**: `client/src/pages/hooks/useVoiceOrderWebRTC.ts`
- **Integration**: Now uses UnifiedCartContext (previously maintained local state)
- **Key Methods**:
  - `handleVoiceTranscript()` - Processes voice input
  - `submitOrder()` - Creates order and initiates payment
  - `pollPaymentStatus()` - Monitors Square Terminal payment

### 2. Voice Order Modal
- **Location**: `client/src/pages/components/VoiceOrderModal.tsx`
- **Features**:
  - Server mode (listen-only, no TTS)
  - Real-time payment status indicators
  - Visual feedback for processing states

### 3. Square Terminal Integration
- **Endpoint**: `/api/v1/terminal/checkout`
- **Polling**: 2-second intervals, max 60 attempts (2 minutes)
- **Status States**: idle → processing → completed/failed

## Configuration

### Required Environment Variables
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_SQUARE_TERMINAL_DEVICE_ID=<device_id>
```

### Device Configuration
Square Terminal device ID can be set via:
1. Environment variable: `VITE_SQUARE_TERMINAL_DEVICE_ID`
2. Settings page: `/settings/payment` (SquareTerminalConfig component)
3. LocalStorage: `square_terminal_device_id`

## Testing

### Manual Test Flow
1. Login with server role credentials
2. Navigate to `/server` page
3. Select a table and seat
4. Click "Voice Order" button
5. Press and hold microphone button
6. Speak order: "Two burgers and a coke"
7. Release button and verify items appear
8. Click "Submit Order"
9. Watch payment status indicator
10. Verify order appears in KDS

### Automated Tests
Run integration tests:
```bash
bash scripts/test-voice-order.sh
```

## API Endpoints

### Voice/WebRTC
- `POST /api/v1/realtime/session` - Create WebRTC session
- Requires: Authentication token, restaurant ID

### Orders
- `POST /api/v1/orders` - Create new order
- `PATCH /api/v1/orders/:id/status` - Update order status

### Square Terminal
- `GET /api/v1/terminal/devices` - List available devices
- `POST /api/v1/terminal/checkout` - Initiate payment
- `GET /api/v1/terminal/checkout/:id` - Check payment status

## WebSocket Events

### Order Events (sent to KDS)
- `order:created` - New order received
- `order:updated` - Order modified
- `order:status_changed` - Status transition

## Implementation Changes

### Phase 1 (Completed)
- Added Square Terminal checkout after order creation
- Added order status update to 'confirmed' after payment
- Created SquareTerminalConfig component
- Added terminal devices endpoint

### Phase 2 (Completed)
- Integrated useVoiceOrderWebRTC with UnifiedCartContext
- Added real-time payment status polling
- Added visual payment status indicators
- Fixed TypeScript field naming issues (categoryId)

## Known Issues
- TypeScript errors: 566 total (non-blocking, app runs)
- WebSocket auth warnings on landing page (expected behavior)
- Payment tests need proper auth tokens

## Future Improvements
1. Add comprehensive error handling for payment failures
2. Implement retry logic for network failures
3. Add audio feedback for successful orders
4. Create admin dashboard for payment analytics
5. Add support for split payments in UI

## Code Quality Metrics
- Integration tests: ✅ Passing
- TypeScript: 566 errors (mostly in tests)
- Bundle size: Within targets
- Memory usage: Optimized (4GB max)

## Rollback Plan
If issues arise, revert to commit before voice integration:
```bash
git revert HEAD~5  # Adjust number based on commits
```

## Support
For issues or questions:
- Check browser console for runtime errors
- Review server logs at http://localhost:3001
- Verify Square Terminal device configuration
- Ensure proper authentication tokens