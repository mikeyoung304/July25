# TODO-015: Remove Unused VoiceOrderContext

## Metadata
- **Status**: completed
- **Priority**: P2 (Important)
- **Issue ID**: 015
- **Tags**: dead-code, voice, cleanup
- **Dependencies**: None
- **Created**: 2025-11-24
- **Completed**: 2025-11-27
- **Source**: Code Review - Architecture Strategist Agent

---

## Resolution: Context IS Being Used

**VoiceOrderContext is NOT dead code.** It is actively used by DriveThruPage.

---

## Current Usage (2025-11-27)

### Active Implementation: DriveThruPage
```typescript
// client/src/pages/DriveThruPage.tsx
import { VoiceOrderProvider } from '@/modules/voice/contexts/VoiceOrderContext';
import { useVoiceOrder } from '@/modules/voice/hooks/useVoiceOrder';

const DriveThruPageContent: React.FC = () => {
  const { items, addItem, total, itemCount } = useVoiceOrder();
  // ... uses voice order state for drive-thru ordering
};

const DriveThruPage: React.FC = () => {
  return (
    <VoiceOrderProvider>
      <DriveThruPageContent />
    </VoiceOrderProvider>
  );
};
```

### Module Exports
The context is properly exported from the voice module:
```typescript
// client/src/modules/voice/index.ts
export * from './hooks/useVoiceOrder'
export * from './contexts/VoiceOrderContext'
```

---

## Original Problem Statement (Now Outdated)

`VoiceOrderContext` (81 lines) is defined but never used by either kiosk or server implementations. It creates confusion about the "canonical" way to manage voice order state.

### What Changed

The original assessment was based on checking only kiosk and server implementations. However, the DriveThruPage feature uses VoiceOrderContext as its dedicated state management solution.

---

## Current Architecture

Three different state management systems exist, each for a different use case:

1. **VoiceOrderContext** - Used by DriveThruPage for drive-thru voice ordering
2. **useUnifiedCart** - Used by Kiosk for in-store ordering
3. **useState in useVoiceOrderWebRTC** - Used by ServerView for server-assisted ordering

This is intentional architecture, not redundancy. Each context serves a different customer journey.

---

## Verification Performed

```bash
# Found active usage:
grep -r "VoiceOrderProvider" client/src/
# Result: client/src/pages/DriveThruPage.tsx imports and uses it

grep -r "useVoiceOrder" client/src/
# Result: client/src/pages/DriveThruPage.tsx:13 calls useVoiceOrder()
```

---

## Acceptance Criteria

- [x] Verify VoiceOrderContext usage in codebase
- [x] Document actual usage (DriveThruPage)
- [x] Confirm no dead code exists
- [x] Update TODO status to completed
- [x] Document architectural rationale

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From architecture review |
| 2025-11-27 | Investigated | Found active usage in DriveThruPage |
| 2025-11-27 | Resolved | Context is NOT dead code - marked completed |
