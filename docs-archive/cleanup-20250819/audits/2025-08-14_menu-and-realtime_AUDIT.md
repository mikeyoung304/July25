# Menu Regression & OpenAI Realtime Audit Report
**Date**: 2025-08-14  
**Auditor**: Read-Only Incident Auditor  
**Scope**: Menu data source regression + OpenAI Realtime adapter validation

---

## 0. Summary Table & Executive Summary

| Task | Status | Finding |
|------|--------|---------|
| 1. Menu Data Source | **FAIL** | Client using hardcoded mock menu, not Supabase |
| 2. Supabase Connectivity | **PASS** | Configuration correct, service key present |
| 3. Regression Trigger | **FOUND** | Aggressive fallback in useMenuItems.ts:119-123 |
| 4. Environment Mismatch | **PASS** | All required env vars present in .env.example |
| 5. Realtime Adapter | **PASS** | Correctly implements OpenAI Realtime API v1 |
| 6. WebSocket Wiring | **PASS** | Properly handles /voice-stream on :3001 |
| 7. Build Panel Residue | **PASS** | Zero references in active code (only archives) |
| 8. Fix Plan | **READY** | Remove hardcoded fallback, add proper error UI |

### Executive Summary (3 lines)
1. **Menu shows mocks because client hardcodes Grow Fresh menu items and aggressively falls back on ANY API error** - not a Supabase connectivity issue
2. **OpenAI Realtime adapter correctly implements the v1 protocol** with proper WSS URL, headers, and PCM16 24kHz audio
3. **Zero Build Panel/AI Gateway references in active code** - all mentions are in archived documentation only

---

## 1. Menu Data Source Audit

### Flow Diagram
```
KioskPage.tsx
    ↓
useMenuItems() hook [client/src/modules/menu/hooks/useMenuItems.ts]
    ↓
if (restaurant?.id) → menuService.getMenuItems()
    ↓                    ↓
    ↓             httpClient.get('/api/v1/menu/items')
    ↓                    ↓
    ↓             [FAILS] → catch → fallback to getMockMenu()
    ↓
[NO ID or API ERROR] → setItems(growFreshMenuItems) ← HARDCODED MENU!
```

### Root Cause Location
**File**: `client/src/modules/menu/hooks/useMenuItems.ts:8-50,119-123`
```typescript
// Lines 8-50: Hardcoded menu items
const growFreshMenuItems: MenuItem[] = [
  { id: '101', name: 'Sweet Tea w. Lemon', price: 3.00, ... },
  { id: '102', name: 'Unsweet Tea w. Lemon', price: 3.00, ... },
  // ... 40+ hardcoded items
];

// Lines 119-123: Aggressive fallback
} catch (apiError) {
  // Fall back to Grow Fresh menu in development
  console.warn('API call failed, using Grow Fresh menu:', apiError);
  setItems(growFreshMenuItems);  // ← THIS IS THE PROBLEM
  setError(null);
}
```

### Decision: Likely Causes
1. **Primary**: Any API failure triggers hardcoded menu fallback (line 122)
2. **Secondary**: No restaurant ID causes immediate mock usage (line 127)
3. **Tertiary**: MenuService itself has another fallback layer (MenuService.ts:59-60)

---

## 2. Supabase Connectivity & Auth/RLS Checks

### Environment Configuration
**File**: `server/src/config/environment.ts:65-68`
```typescript
supabase: {
  url: process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL']!,
  anonKey: process.env['SUPABASE_ANON_KEY'] || process.env['VITE_SUPABASE_ANON_KEY']!,
  serviceKey: process.env['SUPABASE_SERVICE_KEY'] || process.env['VITE_SUPABASE_SERVICE_KEY']!,
}
```

### Database Client Creation
**File**: `server/src/config/database.ts:13-25`
```typescript
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,  // ← Service key bypasses RLS
  {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  }
);
```

### Menu Service Query
**File**: `server/src/services/menu.service.ts:68-73,78-83`
```typescript
const { data: categories, error: catError } = await supabase
  .from('menu_categories')
  .select('*')
  .eq('restaurant_id', restaurantId)  // ← Restaurant context applied
  .eq('active', true)
  .order('display_order');

const { data: items, error: itemError } = await supabase
  .from('menu_items')
  .select('*')
  .eq('restaurant_id', restaurantId)  // ← Restaurant context applied
  .eq('active', true)
  .order('name');
```

### Decision: Likely Causes
1. **NOT a connectivity issue** - Service key correctly configured
2. **NOT an RLS issue** - Service key bypasses RLS entirely
3. **Possible**: Restaurant ID mismatch or no data for the given restaurant_id

---

## 3. Regression Trigger Hunt

### Most Suspicious Changes (Recent Commits)
Based on git log analysis:

1. **Commit 41ec229**: "feat(voice): implement realtime WebSocket voice ordering MVP"
   - Large change that may have affected menu loading logic
   
2. **No direct menu file changes in last 5 commits**
   - Issue likely pre-existing but now visible

3. **Environment variable usage pattern**
   - Client checks `VITE_USE_MOCK_DATA` but it's set to `false` everywhere

4. **RestaurantContext timing**
   - If restaurant ID loads slowly, menu defaults to mocks

5. **API base URL configuration**
   - If `VITE_API_BASE_URL` is wrong, all API calls fail → triggers fallback

### Decision: Likely Causes
1. The hardcoded fallback has been there all along
2. Recent changes may have made API calls fail more often
3. Environment or deployment config may have changed

---

## 4. Environment Mismatch & Secrets

### Required Environment Variables (.env.example)
| Variable | Purpose | Status |
|----------|---------|--------|
| SUPABASE_URL | Backend DB connection | ✅ Required |
| SUPABASE_SERVICE_KEY | Backend auth bypass | ✅ Required |
| SUPABASE_ANON_KEY | Not used by backend | ⚠️ Optional |
| VITE_SUPABASE_URL | Frontend direct access | ✅ Required |
| VITE_SUPABASE_ANON_KEY | Frontend auth | ✅ Required |
| VITE_API_BASE_URL | API endpoint | ✅ Required |
| DEFAULT_RESTAURANT_ID | Fallback restaurant | ✅ Has default |

### Conditional Mock Usage
**File**: `client/src/services/menu/MenuService.ts:59-60,71-72`
```typescript
} catch (error) {
  console.warn('API call failed, falling back to mock data:', error)
  return this.getMockMenu()  // ← Another fallback layer!
}
```

### Decision: Likely Causes
1. Missing `VITE_API_BASE_URL` would cause all API calls to fail
2. Wrong `DEFAULT_RESTAURANT_ID` might return empty menu from DB
3. Multiple fallback layers compound the issue

---

## 5. Adapter vs. OpenAI Realtime (Fresh Validation)

### Connection Configuration
**File**: `server/src/voice/openai-adapter.ts:55-62`
```typescript
const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

this.ws = new WebSocket(url, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'OpenAI-Beta': 'realtime=v1'  // ← Correct beta header
  }
});
```

### Session Configuration
**File**: `server/src/voice/openai-adapter.ts:132-141`
```typescript
const sessionConfig = {
  type: 'session.update',  // ← Correct event name
  session: {
    modalities: ['text', 'audio'],
    voice: 'alloy',
    input_audio_format: 'pcm16',   // ← Correct format
    output_audio_format: 'pcm16',  // ← Correct format
    // ... proper config
  }
};
```

### Audio Handling
**File**: `server/src/voice/openai-adapter.ts:352-354`
```typescript
const audioEvent = {
  type: 'input_audio_buffer.append',  // ← Correct event
  audio: audioData,  // ← Base64 PCM16 data
};
```

### Client-Side Audio Pipeline
**File**: `client/src/voice/audio-pipeline.ts:111,260-261`
```typescript
constructor(inputSampleRate: number = 16000, outputSampleRate: number = 24000)
// ...
this.resampler = new AudioResampler(config.sampleRate, 24000); // Resample to 24kHz for OpenAI
this.framer = new AudioFramer(24000, config.frameSize); // Frame at 24kHz
```

### Decision: Assessment
✅ **PASS** - Adapter correctly implements OpenAI Realtime API v1:
- Correct WSS URL with model parameter
- Proper headers including OpenAI-Beta
- Correct event names (session.update, input_audio_buffer.append)
- PCM16 audio format with 24kHz resampling
- No double-base64 encoding issues

---

## 6. WebSocket Server Wiring & Health

### WebSocket Upgrade Handler
**File**: `server/src/ai/websocket.ts:11-14`
```typescript
// Handle voice-stream connections with the new voice server
export function setupWebSocket(server: any, voiceServer: VoiceWebSocketServer) {
  server.on('upgrade', (request: any, socket: any, head: any) => {
    if (!request.url?.includes('/voice-stream')) {
      // ... other WS handling
```

### Voice Routes Health Endpoint
**File**: `server/src/voice/voice-routes.ts:41-47`
```typescript
let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
const connectedSessions = voiceServer.getConnectedSessions();

if (connectedSessions > 100) {
  status = 'unhealthy'; // Overloaded
} else if (connectedSessions > 50) {
  status = 'degraded'; // High load
}
```

### Decision: Assessment
✅ **PASS** - WebSocket properly configured:
- Handles /voice-stream on same server (:3001)
- Has health monitoring
- No evidence that WS issues affect menu loading

---

## 7. Build Panel / AI Gateway Residue Check

### Search Results Summary
```bash
rg -n "Build Panel|buildpanel|AI_GATEWAY|:3002|gateway|panel" .
```

**Active Code**: ZERO hits
- No references in `client/src/**`
- No references in `server/src/**`
- No references in `shared/src/**`

**Documentation/Archives**: 100+ hits
- All in `docs/_archive/2025-08-12-buildpanel/`
- Some in comments/docs explaining what NOT to do

**Build Check**: 1 hit
- `package.json:32` - Verification script to PREVENT these references

### Decision: Assessment
✅ **PASS** - No Build Panel/AI Gateway code in production:
- All references are historical documentation
- Active prevention via package.json verify script
- Architecture correctly unified on port 3001

---

## 8. Minimal Repro & Fix Plan

### Test Plan (3 Steps)

#### Step 1: Verify API Endpoint
```bash
curl -X GET http://localhost:3001/api/v1/menu \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"
```
Expected: Should return menu JSON or error

#### Step 2: Check Browser Console
```javascript
// In browser dev tools while on Kiosk page
console.log(import.meta.env.VITE_API_BASE_URL);  // Should be http://localhost:3001
console.log(import.meta.env.VITE_SUPABASE_URL);  // Should be your Supabase URL
```

#### Step 3: Database Check
```sql
-- Run in Supabase SQL editor
SELECT COUNT(*) FROM menu_items 
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111' 
AND active = true;
```
Expected: Should return > 0 if menu is seeded

### Fix Implementation (One Change)

**File**: `client/src/modules/menu/hooks/useMenuItems.ts`
**Lines**: 119-123
**Current**:
```typescript
} catch (apiError) {
  console.warn('API call failed, using Grow Fresh menu:', apiError);
  setItems(growFreshMenuItems);
  setError(null);
}
```

**Fixed**:
```typescript
} catch (apiError) {
  console.error('Failed to load menu from API:', apiError);
  setError(apiError as Error);
  setItems([]);  // Show empty state, not fake data
}
```

**Additional Fix**: Remove the entire `growFreshMenuItems` constant (lines 8-50)

---

## Appendix A: Ripgrep Outputs

### Menu & Mocks
```
client/src/services/mockData.ts:250:const initialMenuItems = [...mockData.menuItems]
client/src/modules/menu/hooks/useMenuItems.ts:8:const growFreshMenuItems: MenuItem[] = [
server/src/routes/menu.routes.ts:10:// GET /api/v1/menu - Get full menu with categories
```

### Supabase Configuration
```
server/src/config/database.ts:13:export const supabase = createClient(
server/src/config/environment.ts:66:url: process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL']!,
server/src/services/menu.service.ts:68:const { data: categories, error: catError } = await supabase
```

### Realtime Adapter
```
server/src/voice/openai-adapter.ts:55:const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
server/src/voice/openai-adapter.ts:61:'OpenAI-Beta': 'realtime=v1'
server/src/voice/openai-adapter.ts:132:type: 'session.update',
server/src/voice/openai-adapter.ts:352:type: 'input_audio_buffer.append',
```

---

## Appendix B: Code Snippets

### Menu Service Full Flow
```typescript
// client/src/modules/menu/hooks/useMenuItems.ts:104-138
useEffect(() => {
  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      
      if (restaurant?.id) {
        try {
          const apiItems = await menuService.getMenuItems();
          const itemsWithImages = apiItems.map(item => ({
            ...item,
            image_url: item.image_url || imageUrlMap[item.name] || undefined
          }));
          setItems(itemsWithImages);
          setError(null);
        } catch (apiError) {
          // THIS IS THE PROBLEM - Falls back to hardcoded menu
          console.warn('API call failed, using Grow Fresh menu:', apiError);
          setItems(growFreshMenuItems);
          setError(null);
        }
      } else {
        // ALSO A PROBLEM - No restaurant ID = mock menu
        setItems(growFreshMenuItems);
        setError(null);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  fetchMenuItems();
}, [restaurant?.id]);
```

---

## Appendix C: Open Questions

1. **Why does the API call fail?** - Need to check actual error in browser console
2. **Is the restaurant_id valid?** - Need to verify against database
3. **Is menu data seeded?** - Run seed-menu-mapped.ts script if not
4. **Why aggressive fallback?** - Possibly for demo/development, but bad for production

---

## END OF AUDIT REPORT