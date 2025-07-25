import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Cart, CartItem, calculateCartTotals } from '../../../../../shared/cart';
import { useParams } from 'react-router-dom';

interface CartContextType {
  cart: Cart;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  updateTip: (tip: number) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: React.ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [cart, setCart] = useState<Cart>(() => {
    const savedCart = localStorage.getItem(`cart_${restaurantId}`);
    if (savedCart) {
      try {
        return JSON.parse(savedCart);
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
      restaurantId: restaurantId || ''
    };
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (restaurantId) {
      localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
    }
  }, [cart, restaurantId]);

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