# WebRTC Voice Migration Guide

> **Purpose**: Guide for migrating from sequential voice processing to WebRTC real-time  
> **Performance Gain**: 4.5 seconds → 200ms (22.5x improvement)  
> **Last Updated**: 2025-08-20

## Overview

The application has two voice processing implementations:

1. **Sequential API** (Old - 4.5s latency)
   - Uses `VoiceControlWithAudio` component
   - Makes sequential calls: Whisper → GPT → TTS
   - Each step adds ~1.5s latency

2. **WebRTC Real-time** (New - 200ms latency)
   - Uses `VoiceControlWebRTC` component
   - Direct browser-to-OpenAI connection
   - Real-time transcription and response

## Migration Status

| Component | Status | Migrated Date | Notes |
|-----------|--------|---------------|--------|
| KioskPage | ✅ Complete | Previously | Working reference implementation |
| ServerView | ✅ Complete | 2025-08-20 | Successfully migrated |
| DriveThruPage | ❌ Pending | - | High priority |
| ExpoPage | ❌ Pending | - | Medium priority |
| KioskDemo | ❌ Pending | - | Low priority |

## Migration Steps

### Step 1: Update Component Imports

```typescript
// OLD - Remove this:
import VoiceControlWithAudio from '@/modules/voice/components/VoiceControlWithAudio'

// NEW - Add this:
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC'
```

### Step 2: Update the Hook

If using a custom hook for voice processing:

```typescript
// OLD - Remove:
import { useVoiceToAudio } from '@/modules/voice/hooks/useVoiceToAudio'

// NEW - Create or use:
import { useWebRTCVoice } from '@/modules/voice/hooks/useWebRTCVoice'
```

### Step 3: Update Component Props

The WebRTC component has a different interface:

```typescript
// OLD
<VoiceControlWithAudio
  onTranscript={(text: string, isFinal: boolean) => {
    // Handle transcript
  }}
  onAudioStart={() => {}}
  onAudioEnd={() => {}}
  isFirstPress={false}
  onFirstPress={() => {}}
/>

// NEW
<VoiceControlWebRTC
  onTranscript={(event: { text: string; isFinal: boolean }) => {
    // Note: event object instead of separate params
    handleTranscript(event.text, event.isFinal)
  }}
  onOrderDetected={(orderData: any) => {
    // Handle parsed order data from server
  }}
  debug={false} // Enable for troubleshooting
/>
```

### Step 4: Update State Management

WebRTC requires different state handling:

```typescript
// OLD Pattern
const { 
  processVoiceToAudio, 
  isProcessing 
} = useVoiceToAudio({
  onTranscriptReceived: (text) => {},
  onAudioResponseStart: () => {},
  onAudioResponseEnd: () => {}
})

// NEW Pattern  
const {
  connect,
  disconnect,
  isConnected,
  startRecording,
  stopRecording,
  isRecording,
  transcript,
  responseText,
  isProcessing,
  error
} = useWebRTCVoice({
  onTranscript: (event) => {},
  onOrderDetected: (order) => {}
})
```

### Step 5: Handle Connection Lifecycle

WebRTC requires explicit connection management:

```typescript
// Connect when component mounts or modal opens
useEffect(() => {
  if (showModal) {
    connect()
  }
  return () => {
    if (isConnected) {
      disconnect()
    }
  }
}, [showModal])

// Show connection status to user
{!isConnected && connectionState === 'connecting' && (
  <p>Connecting to voice service...</p>
)}
```

### Step 6: Update Order Processing

If processing orders, update the data structure:

```typescript
// OLD - Simple strings
interface OrderItem {
  name: string
}

// NEW - Rich objects with modifications
interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  modifications?: OrderModification[]
}

interface OrderModification {
  id: string
  name: string
  price?: number
}
```

## Complete Example: ServerView Migration

Here's how ServerView was successfully migrated:

### Before (useVoiceOrderFlow.ts)
```typescript
export function useVoiceOrderFlow() {
  const { processVoiceWithTranscript, isProcessing } = useVoiceToAudio({
    onTranscriptReceived: (transcript) => {
      setOrderItems(prev => [...prev, transcript])
    }
  })
  // ... rest of implementation
}
```

### After (useVoiceOrderWebRTC.ts)
```typescript
export function useVoiceOrderWebRTC() {
  const { items: menuItems } = useMenuItems()
  const orderParserRef = useRef<OrderParser | null>(null)
  
  // Initialize parser with menu items
  if (menuItems.length > 0 && !orderParserRef.current) {
    orderParserRef.current = new OrderParser(menuItems)
  }

  const handleVoiceTranscript = useCallback((event: { text: string; isFinal: boolean }) => {
    if (event.isFinal && orderParserRef.current) {
      const parsedItems = orderParserRef.current.parse(event.text)
      processParsedItems(parsedItems)
    } else {
      setCurrentTranscript(event.text) // Live display
    }
  }, [])
  
  // ... rest of implementation
}
```

## Testing Your Migration

### 1. Basic Functionality Test
- [ ] Voice button responds to press/hold
- [ ] Microphone permission requested
- [ ] WebRTC connection established
- [ ] Real-time transcription appears
- [ ] Response received within 200-500ms

### 2. Order Processing Test  
- [ ] Menu items parsed correctly
- [ ] Modifications handled
- [ ] Quantities updated
- [ ] Order submission works

### 3. Error Handling Test
- [ ] Connection failures handled gracefully
- [ ] Microphone permission denial handled
- [ ] Network interruptions recovered
- [ ] Error messages user-friendly

### 4. Performance Verification
```javascript
// Add timing logs
const startTime = Date.now()
startRecording()
// ... after response
console.log(`Response time: ${Date.now() - startTime}ms`)
// Should be <500ms (typically 200ms)
```

## Common Issues & Solutions

### Issue 1: "Cannot read property 'parse' of undefined"
**Cause**: OrderParser not initialized  
**Solution**: Ensure menu items are loaded before initializing parser

### Issue 2: Connection fails silently
**Cause**: Missing error handling  
**Solution**: Add error callback and display to user
```typescript
onError: (error) => {
  console.error('WebRTC Error:', error)
  toast.error('Voice connection failed')
}
```

### Issue 3: Duplicate recording (known bug)
**Status**: Under investigation  
**Workaround**: None currently - documented in KNOWN_ISSUES.md

### Issue 4: TypeScript errors on event signatures
**Cause**: Event object vs separate parameters  
**Solution**: Update handler signatures as shown above

## Benefits After Migration

### Performance
- **Before**: 4.5 second total latency
- **After**: 200ms average latency
- **Improvement**: 22.5x faster

### User Experience
- Real-time transcription display
- Immediate feedback
- No "processing" delays
- Natural conversation flow

### Cost
- Single WebRTC connection vs 3 API calls
- Reduced token usage
- Lower bandwidth consumption

### Reliability
- Direct connection more stable
- Automatic reconnection
- Better error recovery
- No sequential failure points

## Next Steps

1. **Prioritize DriveThruPage** - High traffic component
2. **Migrate ExpoPage** - Customer-facing priority
3. **Update KioskDemo** - Lower priority
4. **Remove VoiceControlWithAudio** - After all migrations
5. **Update documentation** - Remove references to old implementation

## Questions?

For issues or questions about migration:
1. Check `docs/voice/WEBRTC_IMPLEMENTATION.md` for architecture details
2. Review `KioskPage.tsx` for reference implementation
3. See `KNOWN_ISSUES.md` for current bugs
4. Test at `/test-webrtc` endpoint

---

*Migration guide based on successful ServerView implementation (2025-08-20)*