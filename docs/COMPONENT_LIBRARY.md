# Component Library Reference

## Overview

This document provides a comprehensive reference for all reusable UI components in the Restaurant OS client application.

## Component Categories

### 1. Form Components

#### Button
Location: `/client/src/components/ui/Button.tsx`

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `disabled`: boolean
- `loading`: boolean
- `onClick`: () => void
- `children`: React.ReactNode

**Usage:**
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="lg" onClick={handleSubmit}>
  Submit Order
</Button>
```

#### Input
Location: `/client/src/components/ui/Input.tsx`

**Props:**
- `type`: string
- `placeholder`: string
- `value`: string
- `onChange`: (e: ChangeEvent) => void
- `error`: string
- `disabled`: boolean

**Usage:**
```tsx
import { Input } from '@/components/ui/Input';

<Input
  type="email"
  placeholder="Enter email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
/>
```

### 2. Display Components

#### Card
Location: `/client/src/components/ui/Card.tsx`

**Props:**
- `title`: string
- `subtitle`: string
- `children`: React.ReactNode
- `actions`: React.ReactNode
- `className`: string

**Usage:**
```tsx
import { Card } from '@/components/ui/Card';

<Card title="Order #123" subtitle="Table 5">
  <OrderItems items={items} />
</Card>
```

#### Badge
Location: `/client/src/components/ui/Badge.tsx`

**Props:**
- `variant`: 'default' | 'success' | 'warning' | 'danger' | 'info'
- `size`: 'sm' | 'md' | 'lg'
- `children`: React.ReactNode

**Usage:**
```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="success" size="lg">
  Ready
</Badge>
```

### 3. Navigation Components

#### Tabs
Location: `/client/src/components/ui/Tabs.tsx`

**Props:**
- `tabs`: Array<{ id: string, label: string, content: ReactNode }>
- `defaultTab`: string
- `onChange`: (tabId: string) => void

**Usage:**
```tsx
import { Tabs } from '@/components/ui/Tabs';

<Tabs
  tabs={[
    { id: 'orders', label: 'Orders', content: <OrderList /> },
    { id: 'history', label: 'History', content: <OrderHistory /> }
  ]}
  defaultTab="orders"
/>
```

### 4. Feedback Components

#### Toast
Location: `/client/src/components/ui/Toast.tsx`

**Props:**
- `type`: 'success' | 'error' | 'warning' | 'info'
- `message`: string
- `duration`: number
- `onClose`: () => void

**Usage:**
```tsx
import { toast } from '@/hooks/useToast';

toast.success('Order submitted successfully!');
toast.error('Failed to process payment');
```

#### Spinner
Location: `/client/src/components/ui/Spinner.tsx`

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `color`: string
- `className`: string

**Usage:**
```tsx
import { Spinner } from '@/components/ui/Spinner';

{isLoading && <Spinner size="lg" />}
```

### 5. Layout Components

#### Container
Location: `/client/src/components/ui/Container.tsx`

**Props:**
- `maxWidth`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
- `padding`: boolean
- `children`: React.ReactNode

**Usage:**
```tsx
import { Container } from '@/components/ui/Container';

<Container maxWidth="xl" padding>
  <YourContent />
</Container>
```

#### Grid
Location: `/client/src/components/ui/Grid.tsx`

**Props:**
- `cols`: number | { sm?: number, md?: number, lg?: number, xl?: number }
- `gap`: number
- `children`: React.ReactNode

**Usage:**
```tsx
import { Grid } from '@/components/ui/Grid';

<Grid cols={{ sm: 1, md: 2, lg: 3 }} gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

### 6. Kitchen Display Components

#### TableGroupCard
Location: `/client/src/components/kitchen/TableGroupCard.tsx`

**Props:**
- `tableNumber`: string
- `orders`: Order[]
- `onStatusChange`: (orderId: string, status: OrderStatus) => void
- `urgencyLevel`: 'normal' | 'warning' | 'urgent'

**Usage:**
```tsx
import { TableGroupCard } from '@/components/kitchen/TableGroupCard';

<TableGroupCard
  tableNumber="12"
  orders={tableOrders}
  onStatusChange={handleStatusChange}
  urgencyLevel={getUrgencyLevel(orders)}
/>
```

#### StationStatusBar
Location: `/client/src/components/kitchen/StationStatusBar.tsx`

**Props:**
- `stations`: Station[]
- `activeStation`: string
- `onStationChange`: (stationId: string) => void

**Usage:**
```tsx
import { StationStatusBar } from '@/components/kitchen/StationStatusBar';

<StationStatusBar
  stations={kitchenStations}
  activeStation={currentStation}
  onStationChange={setCurrentStation}
/>
```

### 7. Order Components

#### OrderCard
Location: `/client/src/components/orders/OrderCard.tsx`

**Props:**
- `order`: Order
- `onStatusChange`: (status: OrderStatus) => void
- `onExpand`: () => void
- `isExpanded`: boolean

**Usage:**
```tsx
import { OrderCard } from '@/components/orders/OrderCard';

<OrderCard
  order={order}
  onStatusChange={updateOrderStatus}
  onExpand={() => setExpandedOrder(order.id)}
  isExpanded={expandedOrder === order.id}
/>
```

### 8. Error Handling Components

#### ErrorBoundary
Location: `/client/src/components/errors/ErrorBoundary.tsx`

**Props:**
- `fallback`: React.ComponentType<{ error: Error }>
- `onError`: (error: Error, errorInfo: ErrorInfo) => void
- `children`: React.ReactNode

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

<ErrorBoundary fallback={ErrorFallback} onError={logError}>
  <YourApp />
</ErrorBoundary>
```

#### PaymentErrorBoundary
Location: `/client/src/components/errors/PaymentErrorBoundary.tsx`

**Props:**
- `onRetry`: () => void
- `children`: React.ReactNode

**Usage:**
```tsx
import { PaymentErrorBoundary } from '@/components/errors/PaymentErrorBoundary';

<PaymentErrorBoundary onRetry={retryPayment}>
  <CheckoutForm />
</PaymentErrorBoundary>
```

## Component Best Practices

### 1. Accessibility
- All interactive components support keyboard navigation
- ARIA labels are provided for screen readers
- Color contrast meets WCAG AA standards
- Focus indicators are visible and clear

### 2. Performance
- Components use React.memo where appropriate
- Large lists use virtualization
- Images are lazy-loaded
- Animations use CSS transforms for GPU acceleration

### 3. Responsive Design
- All components are mobile-first
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Touch targets are minimum 44x44 pixels on mobile

### 4. Theming
- Components use CSS variables for theming
- Dark mode support is built-in
- Custom themes can be created by overriding CSS variables

### 5. Testing
- All components have unit tests
- Critical paths have integration tests
- Visual regression tests for UI consistency

## Creating New Components

### Component Template
```tsx
import React from 'react';
import { cn } from '@/utils/cn';

interface ComponentNameProps {
  // Define props here
  className?: string;
  children?: React.ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('base-classes', className)} {...props}>
      {children}
    </div>
  );
};

ComponentName.displayName = 'ComponentName';
```

### Component Guidelines
1. Use TypeScript for all components
2. Export components as named exports
3. Include JSDoc comments for complex props
4. Provide default props where appropriate
5. Use forwardRef for components that need ref access
6. Include stories for Storybook (if available)
7. Write unit tests for all public APIs

## Component Status

| Component | Status | Tests | Docs | Notes |
|-----------|--------|-------|------|-------|
| Button | ✅ Stable | ✅ | ✅ | - |
| Input | ✅ Stable | ✅ | ✅ | - |
| Card | ✅ Stable | ✅ | ✅ | - |
| Badge | ✅ Stable | ✅ | ✅ | - |
| Tabs | ✅ Stable | ✅ | ✅ | - |
| Toast | ✅ Stable | ✅ | ✅ | - |
| Spinner | ✅ Stable | ✅ | ✅ | - |
| Container | ✅ Stable | ✅ | ✅ | - |
| Grid | ✅ Stable | ✅ | ✅ | - |
| TableGroupCard | ✅ Stable | ✅ | ✅ | KDS specific |
| StationStatusBar | ✅ Stable | ✅ | ✅ | KDS specific |
| OrderCard | ✅ Stable | ✅ | ✅ | - |
| ErrorBoundary | ✅ Stable | ✅ | ✅ | - |
| PaymentErrorBoundary | ✅ Stable | ✅ | ✅ | - |

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)