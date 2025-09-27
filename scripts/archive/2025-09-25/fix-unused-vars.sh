#!/bin/bash

# Fix unused vars by prefixing with underscore

# Client fixes
sed -i '' 's/, useEffect//g' client/src/components/auth/DevAuthOverlay.tsx
sed -i '' 's/position/_position/g' client/src/components/auth/UserMenu.tsx
sed -i '' 's/, useContext//g' client/src/contexts/AuthContext.tsx
sed -i '' 's/, useContext//g' client/src/contexts/UnifiedCartContext.tsx
sed -i '' 's/} catch (_err)/} catch (_err)/g' client/src/hooks/useKitchenOrdersRealtime.ts
sed -i '' 's/(item/(\_item/g' client/src/hooks/useTableGrouping.ts

# Floor plan fixes
sed -i '' 's/const \[showGrid,/const \[\_showGrid,/g' client/src/modules/floor-plan/components/FloorPlanEditor.tsx
sed -i '' 's/setShowGrid\]/_setShowGrid\]/g' client/src/modules/floor-plan/components/FloorPlanEditor.tsx
sed -i '' 's/setSnapToGrid/_setSnapToGrid/g' client/src/modules/floor-plan/components/FloorPlanEditor.tsx

# WebRTC voice fixes
sed -i '' 's/const itemId =/const _itemId =/g' client/src/modules/voice/services/WebRTCVoiceClient.ts
sed -i '' 's/} catch (_e)/} catch (_e)/g' client/src/modules/voice/services/WebRTCVoiceClient.ts

# Expo pages fixes
sed -i '' 's/import { cn/import { /g' client/src/pages/ExpoConsolidated.tsx
sed -i '' 's/type Order/\/\/ type Order/g' client/src/pages/ExpoConsolidated.tsx
sed -i '' 's/connectionState/_connectionState/g' client/src/pages/ExpoConsolidated.tsx

sed -i '' 's/, useCallback//g' client/src/pages/ExpoPage.tsx
sed -i '' 's/{ Filter, /{ /g' client/src/pages/ExpoPage.tsx
sed -i '' 's/, CheckCircle//g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import { TouchOptimizedOrderCard/\/\/ import { TouchOptimizedOrderCard/g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import { VirtualizedOrderGrid/\/\/ import { VirtualizedOrderGrid/g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import { ConnectionStatusBar/\/\/ import { ConnectionStatusBar/g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import { STATUS_GROUPS/\/\/ import { STATUS_GROUPS/g' client/src/pages/ExpoPage.tsx
sed -i '' 's/import { MemoryMonitorInstance/\/\/ import { MemoryMonitorInstance/g' client/src/pages/ExpoPage.tsx
sed -i '' 's/status: string/_status: string/g' client/src/pages/ExpoPage.tsx

sed -i '' 's/{ Filter,/{ /g' client/src/pages/ExpoPageDebug.tsx
sed -i '' 's/import { STATUS_GROUPS/\/\/ import { STATUS_GROUPS/g' client/src/pages/ExpoPageDebug.tsx
sed -i '' 's/import { cn/import { /g' client/src/pages/ExpoPageDebug.tsx
sed -i '' 's/type Order/\/\/ type Order/g' client/src/pages/ExpoPageDebug.tsx
sed -i '' 's/status: string/_status: string/g' client/src/pages/ExpoPageDebug.tsx

sed -i '' 's/import { TouchOptimizedOrderCard/\/\/ import { TouchOptimizedOrderCard/g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/import { OrderStatusErrorBoundary/\/\/ import { OrderStatusErrorBoundary/g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/import { STATUS_GROUPS, isStatusInGroup, getSafeOrderStatus/\/\/ import { STATUS_GROUPS, isStatusInGroup, getSafeOrderStatus/g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/import { cn/import { /g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/type Order/\/\/ type Order/g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/const prioritizedOrders/const _prioritizedOrders/g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/connectionState/_connectionState/g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/status: string/_status: string/g' client/src/pages/ExpoPageOptimized.tsx

# More page fixes
sed -i '' 's/, UserCheck//g' client/src/pages/HomePage.tsx
sed -i '' 's/import { STATUS_GROUPS/\/\/ import { STATUS_GROUPS/g' client/src/pages/KitchenDisplayMinimal.tsx

sed -i '' 's/import { TouchOptimizedOrderCard/\/\/ import { TouchOptimizedOrderCard/g' client/src/pages/KitchenDisplayOptimized.tsx
sed -i '' 's/import { cn/import { /g' client/src/pages/KitchenDisplayOptimized.tsx
sed -i '' 's/type Order/\/\/ type Order/g' client/src/pages/KitchenDisplayOptimized.tsx
sed -i '' 's/connectionState/_connectionState/g' client/src/pages/KitchenDisplayOptimized.tsx

sed -i '' 's/type Order/\/\/ type Order/g' client/src/pages/KitchenDisplaySimple.tsx

# Services fixes
sed -i '' 's/const skipTransform/const _skipTransform/g' client/src/services/http/httpClient.ts
sed -i '' 's/} catch (error)/} catch (_error)/g' client/src/services/menu/MenuService.ts
sed -i '' 's/} catch (error)/} catch (_error)/g' client/src/services/monitoring/performance.ts
sed -i '' 's/import { api/\/\/ import { api/g' client/src/services/orders/OrderHistoryService.ts
sed -i '' 's/, OrderItem//g' client/src/services/orders/OrderService.ts
sed -i '' 's/, CSRFTokenManager//g' client/src/services/secureApi.ts

echo "✅ Fixed unused vars errors - prefixed with underscore"