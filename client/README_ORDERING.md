# Customer Ordering UI

## Overview

```
Menu Browse → Cart → Checkout → Order Confirmation
     ↓          ↓         ↓            ↓
CartContext  localStorage  Square   Thank You
```

## Square Sandbox Setup

Environment variables in `client/.env.local`:
```env
VITE_SQUARE_APP_ID=sandbox-sq0idb-xxxxx
VITE_SQUARE_LOCATION_ID=L1234567890
```

## Routes & Components

**Routes:**
- `/order` - [CustomerOrderPage](src/modules/order-system/components/CustomerOrderPage.tsx)
- `/checkout` - [CheckoutPage](src/pages/CheckoutPage.tsx)
- `/order-confirmation` - [OrderConfirmationPage](src/pages/OrderConfirmationPage.tsx)

**Key Components:**
- [CartContext](src/modules/order-system/context/CartContext.tsx) - State management
- [CartDrawer](src/modules/order-system/components/CartDrawer.tsx) - Shopping cart UI
- [TipSlider](src/pages/CheckoutPage.tsx#L20) - Tip selection
- `SquarePaymentForm` - Payment processing

## Cart Persistence

CartContext uses localStorage with restaurant-specific keys:
```typescript
localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(items))
```

Persists: items, quantities, customizations
Clears: on successful order submission

## Testing

```bash
cd client && npm test -- CartContext
```