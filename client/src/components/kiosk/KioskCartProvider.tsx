import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { MenuItem } from '@rebuild/shared';

// Kiosk-specific cart item interface
export interface KioskCartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  modifications?: string[];
  specialInstructions?: string;
  price?: number; // Add price for order submission
}

// Alias for order submission hook compatibility
export type KioskOrderItem = KioskCartItem;

// Kiosk cart interface
interface KioskCart {
  items: KioskCartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

// Context interface
interface KioskCartContextType {
  cart: KioskCart;
  addItem: (menuItem: MenuItem, quantity?: number, modifications?: string[], specialInstructions?: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  updateTip: (tip: number) => void;
}

const KioskCartContext = createContext<KioskCartContextType | undefined>(undefined);

const TAX_RATE = 0.0875; // 8.75% tax rate

function calculateTotals(items: KioskCartItem[], tip: number = 0): Pick<KioskCart, 'subtotal' | 'tax' | 'total'> {
  const subtotal = items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax + tip;
  
  return { subtotal, tax, total };
}

interface KioskCartProviderProps {
  children: React.ReactNode;
}

export const KioskCartProvider: React.FC<KioskCartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<KioskCartItem[]>([]);
  const [tip, setTip] = useState(0);

  const cart = useMemo(() => {
    const totals = calculateTotals(items, tip);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      items,
      itemCount,
      ...totals,
      tip
    };
  }, [items, tip]);

  const addItem = useCallback((
    menuItem: MenuItem, 
    quantity: number = 1, 
    modifications?: string[], 
    specialInstructions?: string
  ) => {
    const newItem: KioskCartItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuItem,
      quantity,
      modifications,
      specialInstructions
    };
    
    setItems(prev => [...prev, newItem]);
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setTip(0);
  }, []);

  const updateTip = useCallback((newTip: number) => {
    setTip(newTip);
  }, []);

  const value = useMemo(() => ({
    cart,
    addItem,
    updateItemQuantity,
    removeFromCart,
    clearCart,
    updateTip
  }), [cart, addItem, updateItemQuantity, removeFromCart, clearCart, updateTip]);

  return (
    <KioskCartContext.Provider value={value}>
      {children}
    </KioskCartContext.Provider>
  );
};

export const useKioskCart = () => {
  const context = useContext(KioskCartContext);
  if (context === undefined) {
    throw new Error('useKioskCart must be used within a KioskCartProvider');
  }
  return context;
};