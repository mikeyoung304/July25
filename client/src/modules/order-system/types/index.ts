// Import shared types - using camelCase as canonical
export { CartItem, CartModifier, Cart } from '@rebuild/shared/cart';

export interface OrderSystemContextType {
  cart: Cart;
  addToCart: (item: CartItem) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isItemModalOpen: boolean;
  setIsItemModalOpen: (open: boolean) => void;
  selectedMenuItem: any | null;
  setSelectedMenuItem: (item: any | null) => void;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  estimatedTime: string;
  items: CartItem[];
  total: number;
}