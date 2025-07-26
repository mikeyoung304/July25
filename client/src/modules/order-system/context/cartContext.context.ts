import { createContext } from 'react';
import { Cart, CartItem } from '../../../../../shared/cart';

export interface CartContextType {
  cart: Cart;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  updateTip: (tip: number) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);