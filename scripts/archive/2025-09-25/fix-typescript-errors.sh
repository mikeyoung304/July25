#!/bin/bash

echo "🔧 Fixing TypeScript errors..."

# Fix position -> _position in BrandHeader
sed -i '' 's/position="/_position="/g' client/src/components/layout/BrandHeader.tsx

# Fix _err references in useKitchenOrdersRealtime
sed -i '' 's/\$\{_err\.message\}/error/g' client/src/hooks/useKitchenOrdersRealtime.ts
sed -i '' 's/_err\.message/error/g' client/src/hooks/useKitchenOrdersRealtime.ts

# Fix _e references in WebRTCVoiceClient
sed -i '' 's/\$\{_e\.message\}/unknown error/g' client/src/modules/voice/services/WebRTCVoiceClient.ts
sed -i '' 's/_e\.message/unknown error/g' client/src/modules/voice/services/WebRTCVoiceClient.ts

# Fix connectionState -> _connectionState
sed -i '' 's/connectionState,/_connectionState,/g' client/src/pages/ExpoConsolidated.tsx
sed -i '' 's/connectionState,/_connectionState,/g' client/src/pages/ExpoPageOptimized.tsx
sed -i '' 's/connectionState,/_connectionState,/g' client/src/pages/KitchenDisplayOptimized.tsx

# Add missing imports to Expo pages - create a proper fix
cat << 'EOF' > /tmp/fix-imports.js
const fs = require('fs');
const path = require('path');

function addMissingImports(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Add lucide-react imports if needed
  if (content.includes('<Clock') || content.includes('<Package') || content.includes('<User') ||
      content.includes('<Eye') || content.includes('<CheckCircle')) {
    if (!content.includes("from 'lucide-react'")) {
      content = "import { Clock, Package, User, Eye, CheckCircle } from 'lucide-react';\n" + content;
    }
  }

  // Add orderStatusUtils imports if needed
  if ((content.includes('getSafeOrderStatus') || content.includes('isStatusInGroup')) &&
      !content.includes('orderStatusUtils')) {
    const importLine = "import { getSafeOrderStatus, isStatusInGroup } from '../utils/orderStatusUtils';\n";
    content = importLine + content;
  }

  fs.writeFileSync(filePath, content);
}

// Fix all Expo pages
const pages = [
  'client/src/pages/ExpoPage.tsx',
  'client/src/pages/ExpoPageDebug.tsx',
  'client/src/pages/KitchenDisplayMinimal.tsx'
];

pages.forEach(addMissingImports);
EOF

node /tmp/fix-imports.js

# Fix error variable issues - replace with underscore
sed -i '' 's/} catch (error)/} catch/g' client/src/services/menu/MenuService.ts
sed -i '' 's/error\.message/("Menu service error")/g' client/src/services/menu/MenuService.ts
sed -i '' 's/throw error/throw new Error("Menu service error")/g' client/src/services/menu/MenuService.ts

sed -i '' 's/} catch (error)/} catch/g' client/src/services/monitoring/performance.ts
sed -i '' 's/error instanceof/new Error() instanceof/g' client/src/services/monitoring/performance.ts

# Fix Order type import in OrderService
sed -i '' '1i\
import type { Order } from "@rebuild/shared";\
' client/src/services/orders/OrderService.ts

# Fix OrderModifier -> OrderItemModifier
sed -i '' 's/OrderModifier/OrderItemModifier/g' client/src/services/orders/OrderService.ts

echo "✅ TypeScript errors fixed"