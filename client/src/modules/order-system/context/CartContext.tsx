/**
 * @deprecated This CartContext is deprecated. Use UnifiedCartContext instead.
 * Import from '@/contexts/UnifiedCartContext'
 * This file is kept for backwards compatibility during migration.
 */
import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { Cart, CartItem } from '@rebuild/shared';
import { calculateCartTotals } from '@rebuild/shared/cart';
import { useParams } from 'react-router-dom';

interface CartContextType {
  cart: Cart;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  updateTip: (tip: number) => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: React.ReactNode;
}

// Use default restaurant ID from environment or fallback
const DEFAULT_RESTAURANT_ID = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId || DEFAULT_RESTAURANT_ID;
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [cart, setCart] = useState<Cart>(() => {
    // Use a consistent cart key for localStorage
    const savedCart = localStorage.getItem('cart_current');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        // Only use saved cart if it's for the same restaurant
        if (parsed.restaurantId === restaurantId) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved cart:', e);
      }
    }
    return {
      items: [],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      restaurantId: restaurantId
    };
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart_current', JSON.stringify(cart));
  }, [cart]);

  // Clear cart if restaurant changes
  useEffect(() => {
    if (restaurantId && cart.restaurantId && cart.restaurantId !== restaurantId) {
      setCart({
        items: [],
        subtotal: 0,
        tax: 0,
        tip: 0,
        total: 0,
        restaurantId
      });
    }
  }, [restaurantId, cart.restaurantId]);

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    setCart(prevCart => {
      const newItem: CartItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      const newItems = [...prevCart.items, newItem];
      const totals = calculateCartTotals(newItems, prevCart.tip);
      
      return {
        ...prevCart,
        items: newItems,
        ...totals
      };
    });
    
    // Show cart drawer after adding item
    setIsCartOpen(true);
  }, []);

  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) => {
    setCart(prevCart => {
      const newItems = prevCart.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );
      const totals = calculateCartTotals(newItems, prevCart.tip);
      
      return {
        ...prevCart,
        items: newItems,
        ...totals
      };
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.id !== itemId);
      const totals = calculateCartTotals(newItems, prevCart.tip);
      
      return {
        ...prevCart,
        items: newItems,
        ...totals
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(prevCart => ({
      items: [],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      restaurantId: prevCart.restaurantId
    }));
  }, []);

  const updateTip = useCallback((tip: number) => {
    setCart(prevCart => {
      const totals = calculateCartTotals(prevCart.items, tip);
      return {
        ...prevCart,
        ...totals
      };
    });
  }, []);

  const value = useMemo(() => ({
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    updateTip,
    isCartOpen,
    setIsCartOpen
  }), [cart, addToCart, updateCartItem, removeFromCart, clearCart, updateTip, isCartOpen]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};