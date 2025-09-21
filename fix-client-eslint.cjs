const fs = require('fs');
const path = require('path');

// Fix unused imports and variables by prefixing with _
const fixes = [
  // Remove unused imports
  {
    file: 'client/src/components/auth/DevAuthOverlay.tsx',
    pattern: /import \{[^}]*useEffect[^}]*\} from 'react'/,
    replace: (match) => match.replace('useEffect, ', '').replace(', useEffect', '').replace('useEffect', '')
  },
  {
    file: 'client/src/contexts/AuthContext.tsx',
    pattern: /import \{[^}]*useContext[^}]*\} from 'react'/,
    replace: (match) => match.replace('useContext, ', '').replace(', useContext', '').replace('useContext', '')
  },
  {
    file: 'client/src/contexts/UnifiedCartContext.tsx',
    pattern: /import \{[^}]*useContext[^}]*\} from 'react'/,
    replace: (match) => match.replace('useContext, ', '').replace(', useContext', '').replace('useContext', '')
  },
  // Prefix unused params with _
  {
    file: 'client/src/components/auth/UserMenu.tsx',
    pattern: /\(position\)/g,
    replace: '(_position)'
  },
  {
    file: 'client/src/hooks/useKitchenOrdersRealtime.ts',
    pattern: /catch \(err\)/g,
    replace: 'catch (_err)'
  },
  {
    file: 'client/src/hooks/useTableGrouping.ts',
    pattern: /\.reduce\(\(groups, item\)/g,
    replace: '.reduce((groups, _item)'
  },
  {
    file: 'client/src/modules/voice/services/VoiceOrderProcessor.ts',
    pattern: /restaurantId: string/g,
    replace: '_restaurantId: string'
  },
  {
    file: 'client/src/pages/DriveThruPage.tsx',
    pattern: /\(order: any\)/g,
    replace: '(_order: any)'
  },
  {
    file: 'client/src/pages/ExpoPage.tsx',
    pattern: /\.filter\(\(order, status\)/g,
    replace: '.filter((order, _status)'
  },
  {
    file: 'client/src/pages/ExpoPageDebug.tsx',
    pattern: /\.filter\(\(order, status\)/g,
    replace: '.filter((order, _status)'
  },
  {
    file: 'client/src/pages/ExpoPageOptimized.tsx',
    pattern: /\.filter\(\(order, status\)/g,
    replace: '.filter((order, _status)'
  },
  // Prefix unused variables with _
  {
    file: 'client/src/modules/floor-plan/components/FloorPlanEditor.tsx',
    pattern: /const showGrid/g,
    replace: 'const _showGrid'
  },
  {
    file: 'client/src/modules/floor-plan/components/FloorPlanEditor.tsx',
    pattern: /const setShowGrid/g,
    replace: 'const _setShowGrid'
  },
  {
    file: 'client/src/modules/floor-plan/components/FloorPlanEditor.tsx',
    pattern: /const setSnapToGrid/g,
    replace: 'const _setSnapToGrid'
  },
  {
    file: 'client/src/modules/floor-plan/components/FloorPlanEditor.tsx',
    pattern: /const distributeTablesEvenly/g,
    replace: 'const _distributeTablesEvenly'
  },
  {
    file: 'client/src/modules/floor-plan/components/FloorPlanEditor.tsx',
    pattern: /const minSpacing/g,
    replace: 'const _minSpacing'
  },
  {
    file: 'client/src/modules/floor-plan/components/FloorPlanEditor.tsx',
    pattern: /const applyForceDirectedLayout/g,
    replace: 'const _applyForceDirectedLayout'
  },
  {
    file: 'client/src/modules/floor-plan/components/FloorPlanEditor.tsx',
    pattern: /const duplicateTable/g,
    replace: 'const _duplicateTable'
  },
  {
    file: 'client/src/pages/CheckoutPage.tsx',
    pattern: /const formatPhoneNumber/g,
    replace: 'const _formatPhoneNumber'
  },
  {
    file: 'client/src/modules/orders/hooks/useOrderData.ts',
    pattern: /const \{ restaurant/g,
    replace: 'const { restaurant: _restaurant'
  },
  // Comment out unused imports
  {
    file: 'client/src/pages/AdminDashboard.tsx',
    pattern: /import \{ BackToDashboard \}/g,
    replace: '// import { BackToDashboard }'
  },
  {
    file: 'client/src/modules/floor-plan/components/__tests__/chip-monkey.test.tsx',
    pattern: /import \{ FloorPlanEditor \}/g,
    replace: '// import { FloorPlanEditor }'
  },
  {
    file: 'client/src/pages/ExpoConsolidated.tsx',
    pattern: /import \{ Eye[^}]* \}/g,
    replace: (match) => {
      const cleaned = match
        .replace('Eye, ', '')
        .replace(', Eye', '')
        .replace('Clock, ', '')
        .replace(', Clock', '')
        .replace('CheckCircle, ', '')
        .replace(', CheckCircle', '');
      return cleaned === 'import { } from' ? '// ' + match : cleaned;
    }
  },
  // Fix WebRTCVoiceClient prefixes
  {
    file: 'client/src/modules/voice/services/WebRTCVoiceClient.ts',
    pattern: /const mLines/g,
    replace: 'const _mLines'
  },
  {
    file: 'client/src/modules/voice/services/WebRTCVoiceClient.ts',
    pattern: /const itemId/g,
    replace: 'const _itemId'
  },
  {
    file: 'client/src/modules/voice/services/WebRTCVoiceClient.ts',
    pattern: /const logPrefix/g,
    replace: 'const _logPrefix'
  },
  {
    file: 'client/src/modules/voice/services/WebRTCVoiceClient.ts',
    pattern: /catch \(e\)/g,
    replace: 'catch (_e)'
  },
  // Remove unused variables from ExpoPage variants
  {
    file: 'client/src/pages/ExpoPage.tsx',
    pattern: /const \[viewMode, setViewMode\]/g,
    replace: 'const [_viewMode, _setViewMode]'
  },
  {
    file: 'client/src/pages/ExpoPage.tsx',
    pattern: /const \[showFilters, setShowFilters\]/g,
    replace: 'const [_showFilters, _setShowFilters]'
  },
  {
    file: 'client/src/pages/ExpoPageDebug.tsx',
    pattern: /const \[showFilters, setShowFilters\]/g,
    replace: 'const [_showFilters, _setShowFilters]'
  },
  {
    file: 'client/src/pages/ExpoPageOptimized.tsx',
    pattern: /const \{ prioritizedOrders/g,
    replace: 'const { prioritizedOrders: _prioritizedOrders'
  },
  {
    file: 'client/src/pages/ExpoPageOptimized.tsx',
    pattern: /connectionState,/g,
    replace: 'connectionState: _connectionState,'
  },
  {
    file: 'client/src/pages/KitchenDisplayOptimized.tsx',
    pattern: /connectionState,/g,
    replace: 'connectionState: _connectionState,'
  },
  {
    file: 'client/src/pages/KitchenDisplayMinimal.tsx',
    pattern: /import \{ STATUS_GROUPS \}/g,
    replace: '// import { STATUS_GROUPS }'
  },
  {
    file: 'client/src/pages/KitchenDisplaySimple.tsx',
    pattern: /const memoryMonitor/g,
    replace: 'const _memoryMonitor'
  },
  {
    file: 'client/src/services/api.ts',
    pattern: /const DEFAULT_RESTAURANT_ID/g,
    replace: 'const _DEFAULT_RESTAURANT_ID'
  },
  {
    file: 'client/src/services/http/httpClient.ts',
    pattern: /const skipTransform/g,
    replace: 'const _skipTransform'
  },
  {
    file: 'client/src/services/cache/ResponseCache.ts',
    pattern: /const now = Date\.now/g,
    replace: 'const _now = Date.now'
  }
];

let totalFixed = 0;

fixes.forEach(fix => {
  const filePath = path.join('/Users/mikeyoung/Projects/July25', fix.file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${fix.file} - not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  if (typeof fix.replace === 'function') {
    content = content.replace(fix.pattern, fix.replace);
  } else {
    content = content.replace(fix.pattern, fix.replace);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${fix.file}`);
    totalFixed++;
  } else {
    console.log(`⏭️  No changes needed for ${fix.file}`);
  }
});

console.log(`\n✅ Fixed ${totalFixed} files`);