# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: Voice & WebSocket

---

# Voice Order Workflow Analysis - Executive Summary

## Document Location
Full analysis: `/docs/VOICE_ORDER_WORKFLOW_ANALYSIS.md` (1,167 lines)

---

## Key Findings

### 1. Critical Issues (Fix Immediately)

1. **Hardcoded Restaurant ID** 
   - File: `useVoiceOrderWebRTC.ts:241`
   - Always uses demo UUID, not server's actual restaurant
   - Impact: Orders created at wrong location

2. **No Duplicate Submit Guard**
   - File: `useVoiceOrderWebRTC.ts:204-294`
   - Double-clicking submit creates two orders
   - No `isSubmitting` flag to prevent concurrent requests

3. **Silent Scope Failures**
   - File: `ServerView.tsx:87`
   - UI renders even if user lacks `orders:create` scope
   - Error only appears on submission (wasted 20+ seconds)

4. **Hardcoded State Clearing**
   - File: `useVoiceOrderWebRTC.ts:281`
   - `setOrderItems([])` called even if submission fails
   - User loses items permanently

### 2. Major Workflow Issues

**Issue: Missing Pre-Submission Review**
- No confirmation dialog showing: items + price + tax
- User submits blind on pricing
- File: `VoiceOrderModal.tsx` lines 88-172

**Issue: No Confidence Scores Displayed**
- Items added without "87% confidence" indicators
- Unmatched items buried in toast messages
- File: `useVoiceOrderWebRTC.ts` lines 182-195

**Issue: No Connection Timeout Handling**
- "Connecting..." can hang indefinitely
- No retry mechanism or failure UI
- File: `WebRTCVoiceClient.ts` (partial read)

**Issue: Dual Permission Prompts Confusing Users**
- App-level "Enable Microphone" button + browser native dialog
- Unclear which permission is being requested
- File: `VoiceControlWebRTC.tsx:125-146`

---

## Authentication Flow Problems

### Server Authentication Pipeline
1. ✓ JWT verified by `authenticate` middleware (auth.ts:23-108)
2. ✗ RoleGuard checks role but NOT scopes (ServerView.tsx:87)
3. ✓ RBAC checked on API submission (rbac.ts:237-338)
4. **Gap:** 20+ seconds wasted connecting to voice before API validation

### Missing Checks
- [ ] No scope verification before opening voice modal
- [ ] No restaurant ID validation before voice connection
- [ ] No token expiration check before submission
- [ ] No diagnostic info when auth fails

---

## Complete Click Sequence (10 Steps)

```
1. Floor plan click → Table selected
2. Seat selection modal → Seat selected  
3. "Start Voice Order" button → VoiceOrderModal opens
4. "Enable Microphone" → Browser permission dialog → granted/denied
5. Wait for WebRTC connection → 2-8 seconds (no timeout)
6. Press & hold mic button → Audio streams to OpenAI
7. Release button → OpenAI processes (add_to_order function call)
8. Items added to cart → Display with transcript
9. User clicks "Submit Order" → POST /api/v1/orders
10. Success → PostOrderPrompt shows (Add Next Seat / Finish Table)
```

**Timing:** Total 25-30 seconds from modal open to submission

---

## State Transitions

**Key States:**
- `permissionState` → 'prompt' | 'granted' | 'denied'
- `connectionState` → 'disconnected' | 'connecting' | 'connected' | 'error'
- `isRecording` → true | false
- `orderItems` → Array of VoiceOrderItem
- `orderedSeats` → Multi-seat tracking (not persisted)

**Critical Issue:** No race condition guards
- User can click submit twice → 2 orders created
- Permission state not persisted → must re-grant on return
- Connection drop mid-order → silent failure

---

## Network Request Timeline

```
T=0ms       Modal opens
T=0-500ms   Permission check/grant
T=500-1000ms  WebRTCVoiceClient initializes
T=1500-3000ms WebRTC ICE negotiation → connection ready
T=8000ms    User presses mic
T=8000-12000ms Audio streams to OpenAI
T=12000ms   User releases mic
T=12000-18000ms OpenAI final processing
T=15000-20000ms Order event received → items added
T=20000-25000ms User reviews order
T=25000ms   POST /api/v1/orders sent
T=26000-27000ms Server processing
T=27000ms   Success response
T=27000-28000ms UI updated, PostOrderPrompt shown
```

**No timeout handling:** Browser default 30s, but no explicit checks

---

## Missing Visual Feedback

1. ✗ Audio level meter while recording
2. ✗ Confidence scores on order items  
3. ✗ Total price (with tax) before submission
4. ✗ Table status update on floor plan post-submission
5. ✗ Progress indicator during connection (just "Connecting...")

---

## Role-Based Permissions Status

**Server Role Scopes (from rbac.ts:139-147):**
- `orders:create` ← Required for voice ordering
- `orders:read`, `orders:update`, `orders:status`
- `payments:process`, `payments:read`
- `tables:manage`

**Permission Gaps:**
- [ ] No pre-modal scope verification
- [ ] No per-item scope checks
- [ ] Mismatched validation between `/api/v1/orders` (optionalAuth) and `/api/v1/orders/voice` (requireAuth)

---

## Console Logs & Debugging

**Problem:** No request ID correlation across client-server
- Each log entry isolated
- Impossible to trace single voice order end-to-end
- No performance metrics (connection time, latency, confidence)

**Logging Locations:**
- Client: useVoiceOrderWebRTC.ts, VoiceControlWebRTC.tsx (uses both logger and console)
- Server: auth.ts, rbac.ts, orders.routes.ts
- Missing: X-Request-ID header, timing instrumentation, voice-specific metrics

---

## Top 10 Recommendations

### Priority 1 (CRITICAL)
1. Fix hardcoded restaurant ID → get from auth context
2. Add submit button guard → prevent duplicate orders
3. Add scope check before modal → warn user if blocked
4. Fix state clearing → only clear on actual success

### Priority 2 (IMPORTANT)  
5. Add pre-submission confirmation dialog
6. Show confidence scores on items
7. Add connection timeout (15s) with retry UI
8. Add audio level visualization
9. Add X-Request-ID correlation header
10. Persist multi-seat state to sessionStorage

---

## File Structure for Reference

**Voice Order Components:**
- ServerView.tsx → Main server view with floor plan
- VoiceOrderModal.tsx → Order modal
- VoiceControlWebRTC.tsx → Microphone UI
- HoldToRecordButton.tsx → Press-to-record button
- TranscriptionDisplay.tsx → Shows transcript
- VoiceDebugPanel.tsx → Debug info

**Voice Order Hooks:**
- useVoiceOrderWebRTC.ts → Main orchestration (368 lines)
- useWebRTCVoice.ts → WebRTC connection (236 lines)

**Voice Order Services:**
- WebRTCVoiceClient.ts → OpenAI connection orchestrator
- VoiceSessionConfig.ts → Token management
- WebRTCConnection.ts → Peer connection lifecycle
- VoiceEventHandler.ts → Event processing
- VoiceOrderProcessor.ts → Fuzzy matching

**Server API:**
- orders.routes.ts → POST /api/v1/orders (line 41)
- orders.routes.ts → POST /api/v1/orders/voice (line 95)
- auth.ts → JWT verification
- rbac.ts → Permission enforcement

---

## Testing Checklist

- [ ] Voice order with missing `orders:create` scope
- [ ] Double-submit (click twice, check database for duplicates)
- [ ] Connection timeout (simulate network failure)
- [ ] Unmatched item (say non-menu item)
- [ ] Page reload mid-order (check sessionStorage)
- [ ] Expired token (wait 1 hour, then submit)
- [ ] Modal close while submitting (check for cleanup)
- [ ] Multi-seat ordering (add 3 seats, verify all created)

---

## Quick Start for Developers

**To understand the flow:**
1. Read `VOICE_ORDER_WORKFLOW_ANALYSIS.md` sections 2-3 (click sequence & state machine)
2. Trace useVoiceOrderWebRTC.ts:204-294 (submitOrder function)
3. Check orders.routes.ts:41-92 (API validation)

**To fix critical issues:**
1. useVoiceOrderWebRTC.ts: Replace hardcoded UUID with auth context
2. useVoiceOrderWebRTC.ts: Add isSubmitting state guard
3. ServerView.tsx: Add scope check before setShowVoiceOrder(true)
4. useVoiceOrderWebRTC.ts: Only clear items on success

**To improve UX:**
1. Add submission timeout (30s) in submitOrder()
2. Add pre-submission modal with total price
3. Show confidence scores on matched items
4. Add audio visualization during recording

---

Generated: 2025-11-04
Full analysis location: `/Users/mikeyoung/CODING/rebuild-6.0/docs/VOICE_ORDER_WORKFLOW_ANALYSIS.md`
