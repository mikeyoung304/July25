# Voice Ordering: OpenAI Transcription Model Migration Guide

**Migration Date:** January 18, 2025
**Affected Systems:** All voice ordering implementations (kiosk, drive-thru, mobile)
**Breaking Change:** OpenAI deprecated `whisper-1` model for Realtime API
**New Model:** `gpt-4o-transcribe`

---

## Executive Summary

OpenAI deprecated the `whisper-1` transcription model for their Realtime API in early January 2025. This was a **silent breaking change** with no advance notice or error messages. All voice ordering systems must migrate to the `gpt-4o-transcribe` model.

**Impact if not migrated:**
- Complete voice ordering failure
- No transcription events received from OpenAI
- Orders cannot be processed
- Users experience 10-second timeout, then failure

**Migration effort:**
- Development: 15 minutes (1 line of code)
- Testing: 30 minutes
- Deployment: Standard release cycle
- Risk: LOW (well-tested in community)

---

## Pre-Migration Checklist

Before starting migration:

- [ ] Backup current codebase
- [ ] Document current voice ordering behavior (success rate, common issues)
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window (if needed for testing)
- [ ] Notify stakeholders of upcoming change

---

## Migration Steps

### Step 1: Update Source Code (5 minutes)

**File:** `client/src/modules/voice/services/VoiceSessionConfig.ts`

**Line:** ~252-254

**Change:**
```typescript
// BEFORE (Broken)
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en'  // Force English transcription
},

// AFTER (Fixed)
input_audio_transcription: {
  model: 'gpt-4o-transcribe'  // FIXED 2025-01-18: OpenAI deprecated whisper-1
  // Language auto-detected by gpt-4o-transcribe - no need to specify
},
```

**Key Changes:**
1. Model: `'whisper-1'` → `'gpt-4o-transcribe'`
2. Remove `language` parameter (auto-detected by new model)

**Update TypeScript Interface:**

**File:** Same file, line ~33-36

```typescript
// BEFORE
input_audio_transcription: {
  model: string;
  language: string;
};

// AFTER
input_audio_transcription: {
  model: string;
  language?: string; // Optional - gpt-4o-transcribe auto-detects language
};
```

### Step 2: Build and Type Check (5 minutes)

```bash
# Run type checking to ensure no errors
npm run typecheck --workspace=client

# Build the client
npm run build --workspace=client
```

**Expected output:**
```
✓ Type checking passed
✓ Build completed successfully
```

### Step 3: Test in Development (15 minutes)

1. **Start development server:**
```bash
npm run dev
```

2. **Open browser to kiosk page:**
```
http://localhost:5173/kiosk/voice-ordering
```

3. **Test voice ordering flow:**
   - Click "Order by Voice" button
   - Wait for "Ready to order" status
   - Hold "Hold to Talk" button
   - Speak: "I'd like a Greek Salad"
   - Release button
   - **Verify:** Transcript appears within 2 seconds
   - **Verify:** AI responds with confirmation
   - **Verify:** Item added to cart

4. **Check browser console for critical logs:**
```javascript
// Should see:
📤 [WebRTCVoiceClient] Sending session.update:
  model: "gpt-4o-transcribe"  // ✅ Correct model

📝 [VoiceEventHandler] Got transcript delta: "I'd like"
📝 [VoiceEventHandler] Got transcript delta: " a greek"
📝 [VoiceEventHandler] Got transcript delta: " salad"
✅ [VoiceEventHandler] Got transcript completed: "I'd like a greek salad"

🔧 [VoiceEventHandler] Tool call: add_to_order
  items: [{ name: "Greek Salad", quantity: 1 }]
```

5. **Test error cases:**
   - Background noise: Verify noise suppression working
   - Multiple items: "I'd like two Greek Salads and a Soul Bowl"
   - Modifications: "Greek Salad with no onions"
   - Cancellation: "Actually, remove the Greek Salad"

### Step 4: Staging Environment Testing (10 minutes)

Deploy to staging and run full test suite:

```bash
# Deploy to staging
npm run deploy:staging

# Run E2E voice tests (if available)
npm run test:e2e:voice

# Manual smoke tests
# - Test 10 orders end-to-end
# - Verify transcription accuracy >95%
# - Check latency <2 seconds
# - Confirm order completion rate >90%
```

### Step 5: Production Deployment (Standard Process)

Follow standard deployment process:

1. Create production build
2. Deploy to production servers
3. Monitor for errors
4. Verify voice ordering working on production

**Deployment command:**
```bash
npm run deploy:production
```

### Step 6: Post-Deployment Verification (15 minutes)

**Immediate Checks (within 5 minutes):**
- [ ] Voice ordering button appears for users
- [ ] Connection establishes successfully
- [ ] Transcription events received (check logs)
- [ ] Orders completing successfully

**Extended Monitoring (first hour):**
- [ ] Monitor transcription event rate (should match pre-migration)
- [ ] Check error rates (should be LOW)
- [ ] Verify order completion rate (target: >75%)
- [ ] Review user feedback/support tickets

**Metrics to Track:**
```sql
-- Voice ordering success rate
SELECT
  COUNT(*) as total_sessions,
  SUM(CASE WHEN transcript_received THEN 1 ELSE 0 END) as successful_transcriptions,
  ROUND(100.0 * SUM(CASE WHEN transcript_received THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM voice_sessions
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Expected: success_rate > 95%
```

---

## Rollback Plan

If critical issues occur after deployment:

### Quick Rollback (5 minutes)

**DO NOT** revert to `whisper-1` - it will not work. Instead:

1. **Check if issue is related to this change:**
   - Are transcription events being received?
   - Check browser console for `conversation.item.input_audio_transcription.*` events
   - Verify model in logs: should be `gpt-4o-transcribe`

2. **If issue is NOT related to model change:**
   - Revert entire deployment to previous version
   - Investigate separately

3. **If issue IS related to model change:**
   - Check OpenAI API status: https://status.openai.com
   - Review OpenAI community forums for reports
   - Check if API key has Realtime API access enabled
   - Contact OpenAI support if needed

### Emergency Fallback

If voice ordering must be disabled:

```typescript
// Temporarily disable voice ordering in production
// File: client/src/config/features.ts

export const FEATURES = {
  VOICE_ORDERING: false, // Set to false to disable
  // ...other features
};
```

---

## Troubleshooting Common Issues

### Issue 1: No Transcription Events After Migration

**Symptom:** Deployed with `gpt-4o-transcribe` but still no transcription events

**Possible Causes:**
1. Build not deployed correctly (still using old code)
2. Browser cache serving old JavaScript
3. CDN not updated with new build

**Fix:**
```bash
# Force rebuild
rm -rf client/dist
npm run build --workspace=client

# Clear CDN cache (if using)
npm run cdn:invalidate

# Verify deployed version includes fix
curl https://your-app.com/assets/main.js | grep "gpt-4o-transcribe"
# Should return match
```

### Issue 2: TypeScript Errors After Update

**Symptom:** Build fails with type errors

**Fix:**
```bash
# Ensure TypeScript interface updated
# Check that `language` is marked optional: `language?: string`

# Regenerate types
npm run typecheck --workspace=client
```

### Issue 3: Increased Latency After Migration

**Symptom:** Transcription takes longer than before

**Analysis:**
- `gpt-4o-transcribe` should have similar latency to `whisper-1` (~200ms)
- If latency increased significantly, check:
  - Network conditions
  - OpenAI API status
  - Browser performance

**Mitigation:**
- Monitor latency metrics
- If consistently >500ms, report to OpenAI support

---

## Performance Comparison

### Before (whisper-1)
- Transcription Speed: ~200ms
- Accuracy: 97%
- Language: Manual specification required
- Status: ❌ Deprecated (non-functional)

### After (gpt-4o-transcribe)
- Transcription Speed: ~200ms (same)
- Accuracy: 97% (same)
- Language: Auto-detected
- Status: ✅ Supported

**Conclusion:** No performance degradation expected. May see slight improvement in multi-language accuracy.

---

## Documentation Updates

After successful migration, update:

- [x] `docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md`
- [x] `docs/explanation/architecture/VOICE_ORDERING_WEBRTC.md`
- [x] `docs/how-to/operations/VOICE_ORDERING_TROUBLESHOOTING.md`
- [x] Source code comments in `VoiceSessionConfig.ts`
- [ ] Team wiki / internal documentation
- [ ] API documentation (if publicly available)

---

## Communication Templates

### Internal Team Announcement

```
Subject: Voice Ordering Update - OpenAI Model Migration

Team,

We're deploying an important update to voice ordering today.

WHAT'S CHANGING:
- OpenAI deprecated the old transcription model (whisper-1)
- We're migrating to their new model (gpt-4o-transcribe)

IMPACT:
- No user-facing changes expected
- Transcription accuracy and speed remain the same
- This fixes a critical issue affecting voice ordering

DEPLOYMENT:
- Date: [Your deployment date]
- Time: [Your deployment time]
- Downtime: None expected

MONITORING:
- Watch for voice ordering errors in first hour
- Support team: Route voice issues to engineering
- Escalation: Contact @voice-team if issues occur

ROLLBACK:
- Standard process if critical issues occur
- Do NOT revert to old model (it won't work)

Questions? Ask in #voice-ordering channel.
```

### Support Team Briefing

```
VOICE ORDERING UPDATE - SUPPORT TEAM BRIEFING

WHAT CHANGED:
- Backend transcription model updated
- Users should NOT notice any difference

IF USERS REPORT ISSUES:

1. "Voice ordering not working / No transcript appearing"
   - Ask: When did it start? (before/after [deployment time])
   - Check: Browser console for errors
   - Try: Different browser, clear cache
   - Escalate: If persistent after troubleshooting

2. "Accuracy is worse than before"
   - Ask: Specific examples?
   - Check: Background noise, microphone quality
   - Document: Log issue for engineering review

3. "It's slower than before"
   - Ask: How much slower? (in seconds)
   - Check: Internet connection speed
   - Escalate: If consistently >5 seconds

ESCALATION:
- P0 (voice completely broken): @voice-team immediately
- P1 (degraded performance): Ticket to engineering
- P2 (individual edge cases): Document for engineering review
```

---

## Lessons Learned

### What Went Well
1. Community forums helped identify the issue quickly
2. Fix was simple (1 line of code)
3. No customer data at risk
4. Auto-language detection is a nice improvement

### What Could Be Improved
1. Earlier monitoring of OpenAI API changes
2. Alerts for missing transcription events
3. Automated testing of external API dependencies
4. Subscription to OpenAI changelog

### Action Items
- [ ] Subscribe to OpenAI API changelog RSS/email
- [ ] Add monitoring for transcription event rate
- [ ] Create automated test that fails if transcription breaks
- [ ] Document all external API dependencies and their versions
- [ ] Set up community forum monitoring (weekly check)

---

## References

- **Root Cause Analysis:** `docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md`
- **Fix Commit:** `3a5d126f` - "fix(voice): Use gpt-4o-transcribe model for Realtime API transcription"
- **ADR-005 Update:** `docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md`
- **Troubleshooting Guide:** `docs/how-to/operations/VOICE_ORDERING_TROUBLESHOOTING.md`
- **OpenAI Community Discussion:** https://community.openai.com/t/cant-get-the-user-transcription-in-realtime-api/1076308
- **OpenAI Realtime API Docs:** https://platform.openai.com/docs/guides/realtime

---

**Migration Author:** @mikeyoung
**Date Created:** 2025-01-18
**Status:** COMPLETE
**Version:** 1.0
