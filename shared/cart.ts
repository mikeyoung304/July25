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

export const TAX_RATE = 0.0825;

export function calculateCartTotals(items: CartItem[], tip: number = 0): Pick<Cart, 'subtotal' | 'tax' | 'tip' | 'total'> {
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price + (item.modifiers?.reduce((modSum, mod) => modSum + mod.price, 0) || 0);
    return sum + (itemPrice * item.quantity);
  }, 0);
  
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax + tip;
  
  return { subtotal, tax, tip, total };
}