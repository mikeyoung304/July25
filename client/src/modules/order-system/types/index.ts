export interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: CartModifier[];
  specialInstructions?: string;
  imageUrl?: string;
}

export interface CartModifier {
  id: string;
  name: string;
  price: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  restaurantId: string;
}

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
  order_number: string;
  estimatedTime: string;
  items: CartItem[];
  total: number;
}