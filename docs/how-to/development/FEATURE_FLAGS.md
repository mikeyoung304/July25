# Feature Flags Guide

**Last Updated**: 2025-11-05 (Security Hardening Complete)
**Owner**: Engineering Team
**Status**: Production-Ready ✅

---

## Overview

Feature flags enable gradual rollout, A/B testing, and safe deployment of new features. Our lightweight custom implementation supports:

- ✅ Environment-based configuration (`.env` files)
- ✅ Percentage-based rollouts (0-100%)
- ✅ User/restaurant targeting
- ✅ Local overrides for testing (development only)
- ✅ TypeScript type safety
- ✅ **Cryptographic hashing (SHA-256)** for uniform distribution
- ✅ **Production security hardening** (XSS protection)

---

## Quick Start

### 1. Define a Feature Flag

Add to `.env.local`:
```bash
# Enable for all users
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=true

# 50% rollout (gradual deployment)
VITE_FEATURE_HIGH_CONFIDENCE_THRESHOLD=50

# Disabled
VITE_FEATURE_EXPERIMENTAL_FEATURE=false
```

### 2. Use in React Components

```tsx
import { useFeatureFlag, FEATURE_FLAGS } from '@/services/featureFlags';

function MyComponent() {
  const isNewFlowEnabled = useFeatureFlag(FEATURE_FLAGS.NEW_CUSTOMER_ID_FLOW);

  return (
    <div>
      {isNewFlowEnabled ? (
        <NewImplementation />
      ) : (
        <OldImplementation />
      )}
    </div>
  );
}
```

### 3. Use in Service/Utility Code

```typescript
import { featureFlagService, FEATURE_FLAGS } from '@/services/featureFlags';

async function processOrder(order: Order, userId: string, restaurantId: string) {
  const useNewFlow = await featureFlagService.isEnabled(
    FEATURE_FLAGS.NEW_CUSTOMER_ID_FLOW,
    userId,
    restaurantId
  );

  if (useNewFlow) {
    return processOrderV2(order);
  }

  return processOrderV1(order);
}
```

**Note**: `isEnabled()` is async because it uses SHA-256 for cryptographic hashing.

---

## Security Features

### SHA-256 Cryptographic Hashing

Feature flags use **SHA-256** (Web Crypto API) for consistent hashing to ensure:

1. **Uniform Distribution**: Users are evenly distributed across percentage buckets
2. **No Collision Attacks**: Cryptographically secure against hash manipulation
3. **Consistent Bucketing**: Same user always gets same result for A/B testing

**Implementation**:
```typescript
// Internal implementation (FeatureFlagService.ts)
private async cryptoHash(str: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hash = (hashArray[0] << 24) | (hashArray[1] << 16) |
               (hashArray[2] << 8) | hashArray[3];
  return Math.abs(hash);
}
```

### Production Security Hardening

**localStorage overrides are DISABLED in production** to prevent XSS attacks:

```typescript
// ✅ Development: localStorage overrides work
if (import.meta.env.PROD === false) {
  featureFlagService.setLocalOverride('MY_FLAG', { enabled: true });
}

// ❌ Production: localStorage overrides blocked (logs warning)
if (import.meta.env.PROD === true) {
  featureFlagService.setLocalOverride('MY_FLAG', { enabled: true });
  // Warning logged: "Local overrides disabled in production"
}
```

**Why this matters**:
- Prevents XSS attacks from enabling experimental features
- Prevents malicious users from manipulating feature flags via browser console
- Ensures production rollout percentages are accurate

---

## Configuration Formats

### Boolean Flags
```bash
# Enabled for all
VITE_FEATURE_MY_FEATURE=true

# Disabled for all
VITE_FEATURE_MY_FEATURE=false
```

### Percentage Rollout
```bash
# Enable for 25% of users (consistent hashing)
VITE_FEATURE_MY_FEATURE=25

# Enable for 75% of users
VITE_FEATURE_MY_FEATURE=75
```

The same user/restaurant will always get the same result for consistent A/B testing.

---

## Rollout Strategy

### Recommended Gradual Rollout Plan

**Week 1: Dark Launch (0%)**
```bash
VITE_FEATURE_NEW_FEATURE=0
```
- Deploy code to production
- Monitor for errors/crashes
- Verify feature flag works

**Week 2: Canary (10%)**
```bash
VITE_FEATURE_NEW_FEATURE=10
```
- Enable for 10% of users
- Monitor metrics: errors, performance, user feedback
- Fix any issues discovered

**Week 3: Expansion (25%)**
```bash
VITE_FEATURE_NEW_FEATURE=25
```
- Expand to 25% if canary successful
- Continue monitoring

**Week 4: Majority (50%)**
```bash
VITE_FEATURE_NEW_FEATURE=50
```
- Expand to 50%
- Compare A/B test results

**Week 5: Full Rollout (100%)**
```bash
VITE_FEATURE_NEW_FEATURE=100
# or
VITE_FEATURE_NEW_FEATURE=true
```
- Enable for all users
- Remove feature flag in next release (cleanup)

---

## Testing Feature Flags

### Local Override (Development Only)

**⚠️ Note**: localStorage overrides only work in development (`import.meta.env.PROD === false`). They are disabled in production for security.

Open browser console in **development environment**:
```javascript
// Enable a feature locally
featureFlagService.setLocalOverride('NEW_CUSTOMER_ID_FLOW', {
  enabled: true
});

// Enable for specific percentage
featureFlagService.setLocalOverride('HIGH_CONFIDENCE_THRESHOLD', {
  enabled: true,
  rolloutPercentage: 50
});

// Clear all overrides
featureFlagService.clearLocalOverrides();

// Reload page to see changes
window.location.reload();
```

**In production**: Use environment variables (`.env.production`) to control flags.

### Environment-Specific Configs

**.env.development**
```bash
# Enable all features in development
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=true
VITE_FEATURE_HIGH_CONFIDENCE_THRESHOLD=true
```

**.env.staging**
```bash
# Test gradual rollout in staging
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=50
```

**.env.production**
```bash
# Gradual production rollout
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=10
```

---

## Current Feature Flags

### Phase 1: Crisis Response & Baseline

| Flag | Purpose | Status | Rollout |
|------|---------|--------|---------|
| `NEW_CUSTOMER_ID_FLOW` | Use dynamic restaurant ID from context instead of hardcoded UUID | ✅ **INTEGRATED** | 🚀 **Ready: 0% → 100%** |
| `IDEMPOTENCY_ENABLED` | Server-side idempotency key checking | ⏳ Phase 2A | - |

**NEW_CUSTOMER_ID_FLOW Details**:
- **File**: `client/src/pages/hooks/useVoiceOrderWebRTC.ts:253-255`
- **Current**: 0% (feature flag disabled, uses fallback hardcoded ID)
- **Rollout Plan**: 0% → 10% → 25% → 50% → 100% over 4 weeks
- **Fallback**: Safely falls back to hardcoded ID when disabled

### Phase 2A: Backend Reliability

| Flag | Purpose | Status | Rollout |
|------|---------|--------|---------|
| `TURN_SERVERS_ENABLED` | Enable TURN servers for NAT traversal | ⏳ Phase 2A | - |
| `STATE_PRESERVATION_ENABLED` | Save order state to sessionStorage on disconnect | ⏳ Phase 2A | - |

### Phase 2B: Voice UX Improvements

| Flag | Purpose | Status | Rollout |
|------|---------|--------|---------|
| `HIGH_CONFIDENCE_THRESHOLD` | Use 0.75 confidence threshold instead of 0.5 | ⏳ Phase 2B | - |
| `ITEM_CONFIRMATION_UI` | Show confidence scores before adding items | ⏳ Phase 2B | - |
| `UNMATCHED_ITEM_SUGGESTIONS` | Suggest similar items when no exact match | ⏳ Phase 2B | - |

### Phase 3: Connection Reliability

| Flag | Purpose | Status | Rollout |
|------|---------|--------|---------|
| `GRADUATED_TIMEOUT` | Gradually reduce timeout from 60s → 10s | ⏳ Phase 3 | - |
| `EXPONENTIAL_BACKOFF_RETRY` | Smart retry with exponential backoff | ⏳ Phase 3 | - |
| `RATE_LIMITING_WITH_RETRY` | Retry-aware rate limiting | ⏳ Phase 3 | - |

### Phase 4: UX Polish

| Flag | Purpose | Status | Rollout |
|------|---------|--------|---------|
| `AUDIO_VISUALIZATION` | Show waveform during recording | ⏳ Phase 4 | - |
| `PRE_SUBMISSION_REVIEW` | Review modal before submitting order | ⏳ Phase 4 | - |
| `CONVERSATIONAL_ERROR_MESSAGES` | Friendly error messages | ⏳ Phase 4 | - |
| `OPTIMISTIC_UI_UPDATES` | Update UI before server confirms | ⏳ Phase 4 | - |

---

## Best Practices

### 1. Always Use the Registry

✅ **Good**:
```typescript
import { FEATURE_FLAGS } from '@/services/featureFlags';

const enabled = useFeatureFlag(FEATURE_FLAGS.NEW_CUSTOMER_ID_FLOW);
```

❌ **Bad**:
```typescript
// Typos, no autocomplete, no refactoring support
const enabled = useFeatureFlag('NEW_CUSTMER_ID_FLOW'); // Typo!
```

### 2. Clean Up Old Flags

After 100% rollout for 2+ weeks:
1. Remove feature flag checks from code
2. Remove from `FEATURE_FLAGS` registry
3. Remove from environment variables
4. Use simple conditional or remove old code path entirely

### 3. Monitor Flag Usage

Track metrics separately for flag on/off:
```typescript
if (isNewFlowEnabled) {
  metrics.increment('order.submit.new_flow');
} else {
  metrics.increment('order.submit.old_flow');
}
```

### 4. Document Rollout Plans

Update this doc with rollout schedule:
```markdown
**NEW_CUSTOMER_ID_FLOW Rollout Plan**:
- Nov 5: 0% (dark launch)
- Nov 12: 10% (canary)
- Nov 19: 25%
- Nov 26: 50%
- Dec 3: 100%
- Dec 17: Remove flag (2 weeks stabilization)
```

---

## Troubleshooting

### Flag Not Working

1. **Check environment variable name**:
   - Must start with `VITE_FEATURE_`
   - Case-sensitive
   - Example: `VITE_FEATURE_NEW_CUSTOMER_ID_FLOW`

2. **Restart development server**:
   ```bash
   npm run dev
   ```
   Vite only reads `.env` files on startup.

3. **Check browser console**:
   ```javascript
   // See all loaded flags
   featureFlagService.getAllFlags()
   ```

4. **Clear localStorage**:
   ```javascript
   featureFlagService.clearLocalOverrides();
   ```

### Percentage Rollout Not Consistent

Feature flags use consistent hashing based on `userId` or `restaurantId`. The same user will always get the same result.

If you're seeing different results:
- Check that you're passing `userId` or `restaurantId` consistently
- Clear browser cache and cookies
- Verify localStorage overrides aren't interfering

---

## Admin Panel (Future)

Planned features for admin dashboard:
- [ ] UI to toggle flags without redeployment
- [ ] Real-time rollout percentage adjustment
- [ ] User/restaurant targeting UI
- [ ] A/B test results visualization
- [ ] Flag usage analytics

---

## References

- Implementation: `client/src/services/featureFlags/`
- Registry: `client/src/services/featureFlags/index.ts`
- Hook usage: `client/src/services/featureFlags/useFeatureFlag.ts`
- Rollout plan: `docs/PROJECT_HANDOFF_VOICE_ORDERING_2025-01.md`
