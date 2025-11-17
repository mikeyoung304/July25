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
export declare const TAX_RATE = 0.0825;
export declare function calculateCartTotals(items: CartItem[], tip?: number): Pick<Cart, 'subtotal' | 'tax' | 'tip' | 'total'>;
//# sourceMappingURL=cart.d.ts.map