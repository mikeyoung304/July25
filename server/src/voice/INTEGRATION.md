# Voice System Integration Guide


**Last Updated:** 2025-08-18

## Quick Start

### 1. Environment Variables
Add these to your `.env` file:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview

# Twilio (for phone support)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Supabase (already configured)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Restaurant
RESTAURANT_ID=your_restaurant_id

# Debug
VOICE_RECORD_AUDIO=false
```

### 2. Server Integration

Add to your `server/src/server.ts`:

```typescript
import { createTwilioRoutes, attachTwilioWebSocket } from './voice/twilio-bridge';
import { createDebugDashboard } from './voice/debug-dashboard';

// After creating Express app
const app = express();

// ... existing middleware ...

// Add voice routes
app.use(createTwilioRoutes());

// Add debug dashboard (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(createDebugDashboard());
}

// After creating HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Attach WebSocket servers
attachTwilioWebSocket(server);

// Your existing WebSocket server continues to work
attachExistingWebSocketServer(server);
```

### 3. Twilio Configuration

1. Go to Twilio Console
2. Configure your phone number webhook:
   - **Voice Webhook**: `https://your-domain.com/voice/incoming`
   - **Method**: POST
   - **Status Callback**: `https://your-domain.com/voice/status`

### 4. Testing

#### Test OpenAI Connection:
```bash
cd server
tsx scripts/voice-debug.ts test-openai
```

#### Test Supabase Menu:
```bash
tsx scripts/voice-debug.ts test-supabase
```

#### Test Audio Conversion:
```bash
tsx scripts/voice-debug.ts test-audio
```

#### Monitor Sessions:
```bash
tsx scripts/voice-debug.ts monitor
```

#### View Debug Dashboard:
Open browser to: http://localhost:3001/api/voice/debug

### 5. Making a Test Call

1. Ensure server is running:
```bash
npm run dev
```

2. Use Twilio CLI or call your Twilio number:
```bash
twilio api:core:calls:create \
  --from=+1234567890 \
  --to=+0987654321 \
  --url=https://your-domain/voice/incoming
```

## Architecture Overview

```
Phone Call → Twilio → WebSocket → EnhancedOpenAIAdapter → OpenAI Realtime API
                ↓                           ↓
           TwiML Response            Menu Function Tools
                                            ↓
                                        Supabase
```

## Key Components

1. **EnhancedOpenAIAdapter** (`ai/voice/EnhancedOpenAIAdapter.ts`)
   - Extends existing adapter with Twilio support
   - Handles audio format conversion (G.711 ↔ PCM16)
   - Implements barge-in detection
   - Manages function calling

2. **Menu Function Tools** (`ai/functions/realtime-menu-tools.ts`)
   - Supabase integration for menu queries
   - Cart management
   - Order processing

3. **Twilio Bridge** (`voice/twilio-bridge.ts`)
   - Handles incoming phone calls
   - WebSocket management
   - Session tracking

4. **Debug Dashboard** (`voice/debug-dashboard.ts`)
   - Real-time monitoring
   - Transcript logging
   - Performance metrics
   - Cost tracking

## Common Issues & Solutions

### Issue: "Connection timeout"
**Solution**: Check OPENAI_API_KEY and network connectivity

### Issue: "Audio format error"
**Solution**: Ensure G.711 μ-law conversion is working properly

### Issue: "Menu items not found"
**Solution**: Verify Supabase connection and menu_items table has data

### Issue: "Barge-in not working"
**Solution**: Check that response.cancel is being sent and audio buffers are cleared

### Issue: "High latency"
**Solution**: Review audio buffering settings and reduce commit interval

## Performance Optimization

1. **Cache Menu Items**: The system caches menu queries for 5 minutes
2. **Connection Pooling**: Reuse Supabase connections
3. **Audio Buffering**: Optimized 100ms chunks for low latency
4. **Token Limits**: Monitor usage to control costs

## Security Considerations

1. Never expose API keys in client code
2. Use service keys only on server
3. Implement rate limiting per phone number
4. Validate all function call arguments
5. Audit all order modifications

## Monitoring & Maintenance

### Daily Tasks:
- Check error logs
- Review session metrics
- Monitor token usage

### Weekly Tasks:
- Update menu cache
- Analyze transcript accuracy
- Review cost reports

### Monthly Tasks:
- Update OpenAI model version
- Performance benchmarking
- Security audit

## Cost Management

Track costs with:
```bash
tsx scripts/voice-debug.ts costs
```

Typical costs per call:
- Text tokens: ~$0.02
- Audio tokens: ~$0.10-0.20
- Total per 2-minute call: ~$0.15-0.25

## Support

For issues with the voice system:
1. Check debug dashboard: http://localhost:3001/api/voice/debug
2. Run diagnostics: `tsx scripts/voice-debug.ts test-all`
3. Review logs in debug dashboard
4. Check the agent configuration: `.claude/agents/openai-realtime-restaurant.json`