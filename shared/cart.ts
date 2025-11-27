export interface CartModifier {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: CartModifier[];
  specialInstructions?: string;
  imageUrl?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  restaurantId: string;
}

export interface CheckoutPayload {
  cart: Cart;
  customerEmail: string;
  customerPhone: string;
  paymentNonce: string;
}

export interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  estimatedTime: string;
  items: CartItem[];
  total: number;
}

/**
 * DEPRECATED: TAX_RATE constant removed as part of Phase 1: Unified Truth Protocol
 * Tax rates are now restaurant-specific and must be fetched from the server.
 *
 * Migration: Use calculateCartTotals() with explicit taxRate parameter instead.
 */

/**
 * Calculate cart totals with explicit tax rate
 *
 * ⚠️ **DISPLAY-ONLY FUNCTION** - DO NOT USE FOR ORDER SUBMISSION
 *
 * This function is for UI preview purposes only. The server ALWAYS recalculates
 * all financial values and never trusts client-provided totals (Phase 5).
 *
 * ⚠️ **FLOATING-POINT FIX (TODO-051)** - Calculations use cents (integer) arithmetic
 * to avoid floating-point rounding errors. Only converted to dollars for display.
 *
 * @param items - Cart items to calculate totals for
 * @param taxRate - Tax rate as decimal (e.g., 0.0825 for 8.25%)
 * @param tip - Tip amount (default: 0)
 * @returns Cart totals (subtotal, tax, tip, total) FOR DISPLAY ONLY
 *
 * IMPORTANT:
 * - Tax rate must be fetched from server via restaurant config endpoint
 * - Never hardcode tax rates - they are restaurant-specific and legally binding
 * - Server recalculates everything on order submission (CreateOrderRequest omits financial fields)
 * - This function exists only to show cart preview to users before checkout
 *
 * @see server/src/services/orders.service.ts:177-192 for authoritative calculation
 */
export function calculateCartTotals(
  items: CartItem[],
  taxRate: number,
  tip: number = 0
): Pick<Cart, 'subtotal' | 'tax' | 'tip' | 'total'> {
  // Work in cents (integers) to avoid floating-point errors
  const subtotalCents = items.reduce((sumCents, item) => {
    // Convert prices to cents (integer arithmetic)
    const itemPriceCents = Math.round(item.price * 100);
    const modifierPriceCents = Math.round(
      (item.modifiers?.reduce((modSum, mod) => modSum + mod.price, 0) || 0) * 100
    );
    const itemTotalCents = (itemPriceCents + modifierPriceCents) * item.quantity;
    return sumCents + itemTotalCents;
  }, 0);

  // Calculate tax in cents
  const taxCents = Math.round(subtotalCents * taxRate);

  // Convert tip to cents
  const tipCents = Math.round(tip * 100);

  // Calculate total in cents
  const totalCents = subtotalCents + taxCents + tipCents;

  // Convert back to dollars for display
  return {
    subtotal: subtotalCents / 100,
    tax: taxCents / 100,
    tip: tipCents / 100,
    total: totalCents / 100
  };
}