# Component Migration Guide

This guide helps you migrate from old component patterns to the new unified components.

## 1. OrderCard Migration

### Old Pattern:
```tsx
import { OrderCard } from '@/modules/orders/components/OrderCard';
import { KDSOrderCard } from '@/modules/kitchen/components/KDSOrderCard';
```

### New Pattern:
```tsx
// For standard order cards
import { OrderCard } from '@/components/orders';

// For KDS order cards
import { KDSOrderCard } from '@/components/orders';

// Or use the base component directly
import { BaseOrderCard } from '@/components/orders';

<BaseOrderCard 
  order={order}
  variant="kds"  // or "standard" or "compact"
  layout="card"  // or "list"
  showOrderType={true}
/>
```

## 2. Voice Components Migration

### Old Pattern:
```tsx
import { VoiceControl } from '@/modules/voice/components/VoiceControl';
import { VoiceCapture } from '@/modules/voice/components/VoiceCapture';
```

### New Pattern:
```tsx
import { UnifiedVoiceRecorder } from '@/components/voice';

<UnifiedVoiceRecorder
  mode="tap-to-toggle"  // or "hold-to-talk"
  onTranscriptionComplete={handleTranscription}
  showConnectionStatus={true}
  showTranscription={true}
/>
```

## 3. Loading States Migration

### Old Pattern:
```tsx
// Inline spinner
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>

// With wrapper
<div className="flex items-center justify-center h-64">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
</div>
```

### New Pattern:
```tsx
import { LoadingSpinner } from '@/components/shared';

<LoadingSpinner 
  size="lg" 
  message="Loading orders..."
  variant="spinner"  // or "dots" or "icon"
/>
```

## 4. Empty States Migration

### Old Pattern:
```tsx
<div className="text-center py-12">
  <p className="text-gray-500 text-lg">No items found</p>
</div>
```

### New Pattern:
```tsx
import { EmptyState } from '@/components/shared';
import { Package } from 'lucide-react';

<EmptyState
  icon={Package}
  title="No orders yet"
  message="Orders will appear here when customers place them."
  action={{
    label: "Create Test Order",
    onClick: handleCreateTest
  }}
/>
```

## 5. Error Display Migration

### Old Pattern:
```tsx
<div className="text-center py-8">
  <p className="text-red-600">Error loading menu items</p>
</div>
```

### New Pattern:
```tsx
import { ErrorDisplay } from '@/components/shared';

<ErrorDisplay
  error={error}
  title="Failed to load menu"
  onRetry={handleRetry}
  variant="card"  // or "inline", "banner", "fullPage"
/>
```

## 6. Icon Buttons Migration

### Old Pattern:
```tsx
<button className="p-2 hover:bg-gray-100 rounded">
  <RefreshCw className="h-5 w-5" />
</button>
```

### New Pattern:
```tsx
import { IconButton } from '@/components/shared';
import { RefreshCw } from 'lucide-react';

<IconButton
  icon={RefreshCw}
  label="Refresh orders"
  size="md"
  variant="ghost"
  onClick={handleRefresh}
/>
```

## Component Benefits

1. **Consistency**: All components follow the same patterns
2. **Accessibility**: Built-in aria labels and keyboard support
3. **Customization**: Variants, sizes, and style props
4. **Type Safety**: Full TypeScript support
5. **Performance**: Optimized rendering and memoization

## Migration Strategy

1. **Phase 1**: Update high-traffic pages (Kitchen Display, Order Management)
2. **Phase 2**: Update customer-facing pages (Kiosk, Online Ordering)
3. **Phase 3**: Update admin and settings pages
4. **Phase 4**: Remove old component implementations