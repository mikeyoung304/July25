# Payment Components


**Last Updated:** 2025-10-29

Complete checkout flow components for table-based ordering with cash and card payment support.

## Components

### CheckClosingScreen
Main orchestrator for the entire checkout flow. Displays order summary, handles step navigation, and processes payments.

```tsx
import { CheckClosingScreen } from '@/pages/CheckClosingScreen';

<CheckClosingScreen
  tableId="A-5"
  orders={ordersArray}
  onClose={() => setShowCheckout(false)}
  onPaymentComplete={async () => {
    await updateTableStatus('available');
  }}
/>
```

### TenderSelection
Payment method selection screen with large touch-friendly buttons.

```tsx
import { TenderSelection } from '@/components/payments';

<TenderSelection
  total={125.50}
  onSelectCard={() => setStep('card')}
  onSelectCash={() => setStep('cash')}
  onBack={() => setStep('summary')}
/>
```

### CashPayment
Cash payment processing with quick amount buttons and change calculation.

```tsx
import { CashPayment } from '@/components/payments';

<CashPayment
  orderId="order-123"
  total={125.50}
  onBack={() => setStep('tender')}
  onSuccess={() => handlePaymentComplete()}
  onUpdateTableStatus={async () => await updateTable()}
/>
```

### CardPayment
Card payment via Stripe Elements with demo mode support.

```tsx
import { CardPayment } from '@/components/payments';

<CardPayment
  orderId="order-123"
  total={125.50}
  onBack={() => setStep('tender')}
  onSuccess={() => handlePaymentComplete()}
  onUpdateTableStatus={async () => await updateTable()}
/>
```

## Usage Example

```tsx
import React, { useState } from 'react';
import { CheckClosingScreen } from '@/pages/CheckClosingScreen';

function TableView() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [tableOrders, setTableOrders] = useState([]);

  const handleCloseCheck = async () => {
    // Update table status to available
    await updateTableStatus(tableId, 'available');

    // Clear orders
    setTableOrders([]);

    // Close checkout screen
    setShowCheckout(false);
  };

  return (
    <div>
      {/* Your table UI */}
      <button onClick={() => setShowCheckout(true)}>
        Close Check
      </button>

      {showCheckout && (
        <CheckClosingScreen
          tableId={tableId}
          orders={tableOrders}
          onClose={() => setShowCheckout(false)}
          onPaymentComplete={handleCloseCheck}
        />
      )}
    </div>
  );
}
```

## API Requirements

### Cash Payment
Requires backend endpoint: `POST /api/v1/payments/cash`

Request body:
```typescript
{
  order_id: string;
  amount_received: number;
  amount_due: number;
  change_given: number;
}
```

### Card Payment
Uses existing endpoint: `POST /api/v1/payments/create`

Request body:
```typescript
{
  order_id: string;
  token: string; // From Square SDK
  idempotency_key: string;
}
```

## Environment Variables

For Stripe integration (CardPayment):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key  # or pk_live_ for production
```

Demo mode is automatically enabled if `STRIPE_SECRET_KEY=demo` on server.

## Features

- Full-screen checkout experience
- Step-based flow (summary → tender → payment)
- Real-time change calculation
- Stripe Elements integration
- Demo mode support
- Touch-friendly design (60px+ buttons)
- Responsive on all devices
- Complete accessibility (ARIA labels, keyboard nav)
- Loading and error states
- Toast notifications
- Table status updates

## Design System

Uses existing Tailwind CSS design tokens:
- Teal: `#4ECDC4` (primary, card payment)
- Green: `#4CAF50` (success, cash payment)
- Large text: `text-3xl` to `text-5xl` for amounts
- Touch targets: Minimum 60px height
- Smooth transitions: `duration-200` to `duration-300`

## Accessibility

All components include:
- ARIA labels on interactive elements
- ARIA pressed states on buttons
- Alert roles for errors
- Keyboard navigation support
- Focus visible states
- Semantic HTML
- Screen reader compatible
