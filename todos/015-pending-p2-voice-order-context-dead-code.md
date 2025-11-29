# TODO-015: Remove Unused VoiceOrderContext

## Metadata
- **Status**: invalid
- **Priority**: P2 (Important)
- **Issue ID**: 015
- **Tags**: dead-code, voice, cleanup, false-positive
- **Dependencies**: None
- **Created**: 2025-11-24
- **Resolved**: 2025-11-29
- **Source**: Code Review - Architecture Strategist Agent

---

## Problem Statement

**INVALID**: `VoiceOrderContext` (81 lines) is defined but never used by either kiosk or server implementations. It creates confusion about the "canonical" way to manage voice order state.

**RESOLUTION**: VoiceOrderContext IS actively used by DriveThruPage. The three different state management approaches serve three different user flows and are not redundant.

---

## Findings

### VoiceOrderContext Exists
```typescript
// client/src/modules/voice/contexts/VoiceOrderContext.tsx
export const VoiceOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<VoiceOrderItem[]>([]);
  // ... item management, total calculation
};
```

### But Neither Uses It

**Kiosk**: Uses `useUnifiedCart` (line 60 of VoiceOrderingMode.tsx)
**Server**: Uses `voiceOrder.setOrderItems` from useVoiceOrderWebRTC

### Result
Three different state management systems for voice orders:
1. VoiceOrderContext (unused)
2. useUnifiedCart (kiosk)
3. useState in useVoiceOrderWebRTC (server)

---

## Proposed Solutions

### Option A: Delete VoiceOrderContext (Recommended)
Remove dead code, reduce confusion.

**Effort**: Very Low (15 min)
**Risk**: Very Low (verify no imports first)

### Option B: Migrate to Use It
Make it the single source of truth.

**Effort**: High (would need to refactor both implementations)
**Risk**: Medium

---

## Recommended Action

**Option A** - Delete:

```bash
# Verify no imports
grep -r "VoiceOrderContext" client/src/
grep -r "VoiceOrderProvider" client/src/
grep -r "useVoiceOrder" client/src/ # Check for hook usage

# If no usage, delete
rm client/src/modules/voice/contexts/VoiceOrderContext.tsx
```

---

## Technical Details

### File to Remove
- `client/src/modules/voice/contexts/VoiceOrderContext.tsx`

### Related Exports to Update
- `client/src/modules/voice/contexts/index.ts` (if exported)

---

## Acceptance Criteria

- [ ] Verify VoiceOrderContext has zero imports
- [ ] Delete file
- [ ] Update any index.ts exports
- [ ] No build errors
- [ ] Both kiosk and server still work

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From architecture review |
| 2025-11-29 | Investigated | Found VoiceOrderContext IS used by DriveThruPage |
| 2025-11-29 | Marked Invalid | Three different state approaches serve different user flows |

---

## Investigation Results

### VoiceOrderContext IS Actively Used

**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/contexts/VoiceOrderContext.tsx`

**Active Usage**:
1. **DriveThruPage.tsx** (line 2) - Imports `VoiceOrderProvider`
2. **DriveThruPage.tsx** (line 173) - Wraps page: `<VoiceOrderProvider><DriveThruPageContent /></VoiceOrderProvider>`
3. **useVoiceOrder.ts** hook - Uses context via `useContext(VoiceOrderContext)`
4. **DriveThruPage.tsx** (line 13) - Calls `useVoiceOrder()` to access cart state

### Three Different Voice Flows (NOT Redundant)

1. **DriveThru Flow** - Uses `VoiceOrderContext`
   - Standalone voice ordering page
   - Customer speaks entire order via WebRTC
   - Context manages cart state for this flow

2. **Kiosk Flow** - Uses `useUnifiedCart`
   - Voice integrated into existing kiosk experience
   - Shares cart with touch-based ordering
   - Uses unified cart to maintain state across input modes

3. **Server Flow** - Uses `useVoiceOrderWebRTC` state
   - Server staff taking orders for seated customers
   - Modal-based workflow
   - Local state in hook for temporary order building

### Conclusion

The original TODO assumed redundancy, but these are three distinct user journeys with appropriate state management for each context. VoiceOrderContext is NOT dead code.
