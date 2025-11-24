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
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price + (item.modifiers?.reduce((modSum, mod) => modSum + mod.price, 0) || 0);
    return sum + (itemPrice * item.quantity);
  }, 0);

  const tax = subtotal * taxRate;
  const total = subtotal + tax + tip;

  return { subtotal, tax, tip, total };
}