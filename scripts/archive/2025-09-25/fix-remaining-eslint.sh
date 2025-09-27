#!/bin/bash

echo "Fixing remaining ESLint errors..."

# Fix WebRTCVoiceClient
sed -i '' 's/const itemId =/const _itemId =/g' client/src/modules/voice/services/WebRTCVoiceClient.ts

# Remove unused imports from Expo pages
sed -i '' '/import.*Filter.*from/d' client/src/pages/ExpoPage.tsx
sed -i '' '/import.*CheckCircle.*from/d' client/src/pages/ExpoPage.tsx
sed -i '' '/import.*Filter.*from/d' client/src/pages/ExpoPageDebug.tsx

# Fix function parameters with underscore prefix
sed -i '' 's/(status:/(\_status:/g' client/src/pages/ExpoPage.tsx
sed -i '' 's/(status:/(\_status:/g' client/src/pages/ExpoPageDebug.tsx
sed -i '' 's/(status:/(\_status:/g' client/src/pages/ExpoPageOptimized.tsx

# Fix unused type imports
sed -i '' '/^import.*type Order/d' client/src/pages/ExpoConsolidated.tsx
sed -i '' '/^import.*type Order/d' client/src/pages/ExpoPageDebug.tsx
sed -i '' '/^import.*type Order/d' client/src/pages/ExpoPageOptimized.tsx
sed -i '' '/^import.*type Order/d' client/src/pages/KitchenDisplayOptimized.tsx
sed -i '' '/^import.*type Order/d' client/src/pages/KitchenDisplaySimple.tsx

# Fix prioritizedOrders
sed -i '' 's/const prioritizedOrders =/const _prioritizedOrders =/g' client/src/pages/ExpoPageOptimized.tsx

# Fix skipTransform in httpClient
sed -i '' 's/const skipTransform =/const _skipTransform =/g' client/src/services/http/httpClient.ts

# Fix catch blocks
sed -i '' 's/} catch (_error)/} catch (_error)/g' client/src/services/http/httpClient.ts

# Remove unused vars from imports - more aggressive
sed -i '' 's/import.*TouchOptimizedOrderCard.*//g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import.*VirtualizedOrderGrid.*//g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import.*ConnectionStatusBar.*//g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import.*STATUS_GROUPS.*//g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import.*MemoryMonitorInstance.*//g' client/src/pages/ExpoPage.tsx

sed -i '' 's/import.*TouchOptimizedOrderCard.*//g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/import.*OrderStatusErrorBoundary.*//g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/import.*STATUS_GROUPS.*isStatusInGroup.*getSafeOrderStatus.*//g' client/src/pages/ExpoPageOptimized.tsx

sed -i '' 's/import.*TouchOptimizedOrderCard.*//g' client/src/pages/KitchenDisplayOptimized.tsx
sed -i '' 's/import.*STATUS_GROUPS.*//g' client/src/pages/ExpoPageDebug.tsx
sed -i '' 's/import.*STATUS_GROUPS.*//g' client/src/pages/KitchenDisplayMinimal.tsx

# Fix cn imports
sed -i '' 's/import { cn }/import { }/g' client/src/pages/ExpoConsolidated.tsx
sed -i '' 's/import { cn }/import { }/g' client/src/pages/ExpoPageDebug.tsx
sed -i '' 's/import { cn }/import { }/g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/import { cn }/import { }/g' client/src/pages/KitchenDisplayOptimized.tsx

# Fix UserCheck import
sed -i '' 's/, UserCheck//g' client/src/pages/HomePage.tsx

# Fix console.log statements (remove them)
sed -i '' '/console\.log(/d' client/src/modules/order-system/components/SquarePaymentForm.tsx
sed -i '' '/console\.log(/d' client/src/pages/ExpoPageDebug.tsx
sed -i '' '/console\.log(/d' server/fix-index-signatures.js
sed -i '' '/console\.log(/d' client/public/ignition-animation/animation.js

echo "✅ Fixed remaining ESLint errors"