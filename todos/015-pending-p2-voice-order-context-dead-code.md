# TODO-015: Remove Unused VoiceOrderContext

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 015
- **Tags**: dead-code, voice, cleanup
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Architecture Strategist Agent

---

## Problem Statement

`VoiceOrderContext` (81 lines) is defined but never used by either kiosk or server implementations. It creates confusion about the "canonical" way to manage voice order state.

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
