# Customer Ordering UI

## Overview
```
Menu Browse → Cart → Checkout → Order Confirmation
     ↓          ↓         ↓            ↓
CartContext  localStorage  Square   Order Details
```

## Routes
- `/order/:restaurantId` - Menu browsing (CustomerOrderPage)
- `/checkout` - Guest checkout with payment
- `/order-confirmation` - Success page with order number

## CartContext API
```typescript
{
  cart: Cart;
  addToCart: (item: CartItem) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  removeItem: (itemId: string) => void;
  updateTip: (amount: number) => void;
  clearCart: () => void;
}
```
Persists to: `cart_${restaurantId}_v2`

## Environment Variables
```env
VITE_SQUARE_APP_ID=sandbox-sq0idb-xxxxx
VITE_SQUARE_LOCATION_ID=L1234567890
```

## Components
- [CartContext](src/modules/order-system/context/CartContext.tsx)
- [CheckoutPage](src/pages/CheckoutPage.tsx)
- [OrderConfirmationPage](src/pages/OrderConfirmationPage.tsx)
- [TipSlider](src/modules/order-system/components/TipSlider.tsx)
- [SquarePaymentForm](src/modules/order-system/components/SquarePaymentForm.tsx)

## Run Tests
```bash
npm test -- CartContext.test.tsx  # Cart tests
npm run dev                       # Start dev server
```