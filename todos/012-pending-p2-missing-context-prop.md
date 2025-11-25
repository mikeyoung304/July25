# TODO-012: Add Missing context="server" Prop

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 012
- **Tags**: voice, ui, server, quick-fix
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Pattern Recognition Specialist Agent

---

## Problem Statement

VoiceOrderModal doesn't pass `context="server"` to VoiceControlWebRTC, causing:

1. Different auto-connect behavior than kiosk
2. Slower startup (must wait for user interaction)
3. Inconsistent UX between contexts

---

## Findings

### Kiosk (Correct)
```typescript
// VoiceOrderingMode.tsx:260-263
<VoiceControlWebRTC
  context="kiosk"
  {...voiceControlProps}
  debug={true}
/>
```

### Server (Missing)
```typescript
// VoiceOrderModal.tsx:322-327
<VoiceControlWebRTC
  {...voiceCommerce.voiceControlProps}
  debug={true}
  muteAudioOutput={true}
  // Missing: context="server"
/>
```

### Impact
VoiceControlWebRTC uses context for auto-connect:
```typescript
// VoiceControlWebRTC.tsx:58
autoConnect: context === 'kiosk'  // Server gets undefined → false
```

---

## Proposed Solutions

### Option A: Add context prop (Recommended)
Simple one-line fix.

**Effort**: Very Low (5 min)
**Risk**: None

---

## Recommended Action

```typescript
// VoiceOrderModal.tsx:322-327
<VoiceControlWebRTC
  context="server"  // ADD THIS
  {...voiceCommerce.voiceControlProps}
  debug={true}
  muteAudioOutput={true}
/>
```

---

## Technical Details

### Affected Files
- `client/src/pages/components/VoiceOrderModal.tsx:322`

---

## Acceptance Criteria

- [ ] context="server" prop added
- [ ] Server voice modal has correct auto-connect behavior
- [ ] No regression in kiosk behavior

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | Quick fix from pattern review |
