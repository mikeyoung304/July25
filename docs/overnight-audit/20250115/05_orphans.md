# Orphan Files Action Plan

## Summary
- **41 orphaned files** identified
- **100+ unused exports** across 45 files
- **150-200KB** potential bundle reduction
- **31 unused npm packages**

## Immediate Deletion List (High Confidence)

### Test Files for Non-Existent Components
```bash
# Delete these immediately - components don't exist
rm client/src/__tests__/e2e/floor-plan.e2e.test.ts
rm client/src/__tests__/unit/voice-ordering.test.ts  
rm client/src/__tests__/components/VoiceButton.test.tsx
rm client/src/__tests__/integration/auth-flow.test.ts
```

### Duplicate Error Boundaries
```bash
# Keep UnifiedErrorBoundary, delete these:
rm client/src/components/errors/PaymentErrorBoundary.tsx
rm client/src/components/errors/ErrorBoundary.tsx

# Update imports:
find . -name "*.tsx" -exec sed -i '' 's/PaymentErrorBoundary/UnifiedErrorBoundary/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's|errors/ErrorBoundary|errors/UnifiedErrorBoundary|g' {} \;
```

### Unused Voice Components
```bash
# Old voice implementation - confirmed unused
rm client/src/modules/voice/services/WebRTCVoiceClientEnhanced.ts
rm client/src/modules/voice/components/VoiceOrderingWidget.tsx
rm client/src/modules/voice/components/VoiceAssistant.tsx
rm client/src/modules/voice/services/AudioProcessor.ts
```

### Never-Imported Modules
```bash
# Complete modules with no imports
rm client/src/components/kiosk/accessibility.ts  # 10 unused exports
rm client/src/components/pos/legacy/OldPOSInterface.tsx
rm client/src/utils/legacy-transforms.ts
```

## Archive for Review (Medium Confidence)

### Development Tools in Production
```bash
# Move to dev-only directory
mkdir -p client/src/dev-only
mv client/src/components/dev/MockDataBanner.tsx client/src/dev-only/
mv client/src/components/debug/VoiceDebugPanel.tsx client/src/dev-only/
mv client/src/utils/test-helpers.ts client/src/dev-only/
```

### Potentially Useful Utilities
```bash
# Review before deleting - mentioned in CLAUDE.md
mkdir -p archive/review-needed
mv client/src/hooks/useFormValidation.ts archive/review-needed/
mv client/src/hooks/useModal.ts archive/review-needed/
mv client/src/utils/validation/validators.ts archive/review-needed/
```

## Wire-In Candidates (Actually Needed)

### DRY Utilities Referenced but Unused
```typescript
// These are mentioned in CLAUDE.md but never imported
// Option 1: Delete references from CLAUDE.md
// Option 2: Actually use them

// useApiRequest - powerful but unused
import { useApiRequest } from '@/hooks/useApiRequest'

// PaymentErrorBoundary - referenced but we use UnifiedErrorBoundary
// Update CLAUDE.md to reference UnifiedErrorBoundary instead
```

## Package Cleanup

### Remove Unused Dependencies
```bash
# Extraneous packages to remove
npm uninstall @opentelemetry/api @opentelemetry/auto-instrumentations-node
npm uninstall dayjs  # Use date-fns
npm uninstall hono   # Use express

# Entire unused suite
npm uninstall @commitlint/cli @commitlint/config-conventional

# Run cleanup
npm prune --production
```

### Install Missing Dependencies
```bash
# Required but missing
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save jsonwebtoken
npm install --save-dev webpack-bundle-analyzer
```

## Documentation Cleanup

### Delete Stale Docs
```bash
# Ancient history
rm -rf docs/archive/2024/
rm docs/archive/voice/VOICE_ARCHITECTURE_OLD.md
rm docs/archive/auth/PIN_AUTH_DEPRECATED.md

# Duplicate ADRs
# Review both, keep the correct one
rm docs/decisions/drafts/ADR-007-*.md  # After choosing which to keep
```

### Update References
```bash
# Update CLAUDE.md
sed -i '' 's/PaymentErrorBoundary/UnifiedErrorBoundary/g' CLAUDE.md

# Remove references to deleted utilities
sed -i '' '/useFormValidation/d' CLAUDE.md  # If deleting
sed -i '' '/useModal/d' CLAUDE.md          # If deleting
```

## Verification Script

```bash
#!/bin/bash
# verify-orphans.sh

echo "Checking for broken imports after cleanup..."

# Check for imports of deleted files
DELETED_FILES=(
  "PaymentErrorBoundary"
  "ErrorBoundary"
  "VoiceOrderingWidget"
  "accessibility"
  "WebRTCVoiceClientEnhanced"
)

for file in "${DELETED_FILES[@]}"; do
  echo "Checking for imports of $file..."
  rg "import.*$file" --type ts --type tsx
done

echo "Running build to verify..."
npm run build

echo "Running tests..."
npm test
```

## Rollback Plan

```bash
# If anything breaks, restore from git
git stash  # Save any uncommitted work
git checkout -- .  # Restore all files
git stash pop  # Restore uncommitted work
```

## Expected Outcomes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total files | 750 | 709 | -41 files |
| Bundle size | 1.4MB | 1.25MB | -150KB |
| Build time | 45s | 40s | -5s |
| Node modules | 1.2GB | 900MB | -300MB |
| Test files | 120 | 116 | -4 stale |

## Implementation Checklist

- [ ] Create backup branch
- [ ] Delete high-confidence orphans
- [ ] Update import references
- [ ] Archive medium-confidence files
- [ ] Remove unused packages
- [ ] Install missing packages
- [ ] Run verification script
- [ ] Update documentation
- [ ] Commit with detailed message
- [ ] Monitor for runtime errors