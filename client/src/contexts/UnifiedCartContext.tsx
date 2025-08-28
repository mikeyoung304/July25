import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MenuItem, Cart, CartItem, calculateCartTotals } from '@rebuild/shared';
import { useParams } from 'react-router-dom';

// Unified cart item interface that works for both regular and kiosk
export interface UnifiedCartItem extends CartItem {
  modifications?: string[];
  specialInstructions?: string;
  menuItem?: MenuItem; // Add for KioskCartItem compatibility
}

// Unified cart interface
export interface UnifiedCart extends Cart {
  items: UnifiedCartItem[];
  itemCount: number;
}

// Context interface that combines both cart systems
interface UnifiedCartContextType {
  cart: UnifiedCart;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  
  // Core cart operations
  addItem: (menuItem: MenuItem, quantity?: number, modifications?: string[], specialInstructions?: string) => void;
  addToCart: (item: Omit<CartItem, 'id'>) => void; // Legacy support
  updateItemQuantity: (itemId: string, quantity: number) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  updateTip: (tip: number) => void;
  
  // Computed values
  itemCount: number;
  restaurantId: string;
}

const UnifiedCartContext = createContext<UnifiedCartContextType | undefined>(undefined);

const DEFAULT_RESTAURANT_ID = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';
const TAX_RATE = 0.0875; // 8.75% tax rate

interface UnifiedCartProviderProps {
  children: React.ReactNode;
  persistKey?: string; // Allow different persistence keys for different contexts
}

export const UnifiedCartProvider: React.FC<UnifiedCartProviderProps> = ({ 
  children, 
  persistKey = 'cart_current' 
}) => {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId || DEFAULT_RESTAURANT_ID;
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [items, setItems] = useState<UnifiedCartItem[]>(() => {
    const savedCart = localStorage.getItem(persistKey);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (parsed.restaurantId === restaurantId) {
          // Validate and migrate cart items to ensure compatibility
          const validatedItems = (parsed.items || []).map((item: any) => {
            // Handle both old (with menuItem) and new (flat) structures
            const migratedItem: UnifiedCartItem = {
              id: item.id,
              name: item.name || item.menuItem?.name || 'Unknown Item',
              price: item.price || item.menuItem?.price || 0,
              quantity: item.quantity || 1,
              menuItemId: item.menuItemId || item.menuItem?.id || item.menu_item_id,
              modifications: item.modifications || item.modifiers || [],
              specialInstructions: item.specialInstructions || ''
            };
            
            // Only return items that have essential fields
            if (migratedItem.name && migratedItem.price >= 0 && migratedItem.quantity > 0) {
              return migratedItem;
            }
            return null;
          }).filter(Boolean);
          
          return validatedItems;
        }
      } catch (e) {
        console.error('Failed to parse saved cart:', e);
        // Clear corrupted cart data
        localStorage.removeItem(persistKey);
      }
    }
    return [];
  });
  
  const [tip, setTip] = useState(0);

  // Calculate cart totals
  const cart = useMemo<UnifiedCart>(() => {
    const totals = calculateCartTotals(items, tip);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      items,
      itemCount,
      ...totals,
      tip,
      restaurantId
    };
  }, [items, tip, restaurantId]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(persistKey, JSON.stringify({
      items,
      restaurantId,
      tip
    }));
  }, [items, restaurantId, tip, persistKey]);

  // Clear cart if restaurant changes
  useEffect(() => {
    const savedCart = localStorage.getItem(persistKey);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (parsed.restaurantId && parsed.restaurantId !== restaurantId) {
          setItems([]);
          setTip(0);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [restaurantId, persistKey]);

  // Add item with kiosk-style interface
  const addItem = useCallback((
    menuItem: MenuItem, 
    quantity: number = 1, 
    modifications?: string[], 
    specialInstructions?: string
  ) => {
    const newItem: UnifiedCartItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      modifications,
      specialInstructions,
      menuItemId: menuItem.id
    };
    
    setItems(prev => [...prev, newItem]);
    setIsCartOpen(true); // Show cart after adding
  }, []);

  // Legacy addToCart for backward compatibility
  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    const newItem: UnifiedCartItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setItems(prev => [...prev, newItem]);
    setIsCartOpen(true);
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

  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setTip(0);
    setIsCartOpen(false);
    // Also clear from localStorage
    localStorage.removeItem(persistKey);
  }, [persistKey]);

  const updateTip = useCallback((newTip: number) => {
    setTip(newTip);
  }, []);

  const value: UnifiedCartContextType = {
    cart,
    isCartOpen,
    setIsCartOpen,
    addItem,
    addToCart,
    updateItemQuantity,
    updateCartItem,
    removeFromCart,
    clearCart,
    updateTip,
    itemCount: cart.itemCount,
    restaurantId
  };

  return (
    <UnifiedCartContext.Provider value={value}>
      {children}
    </UnifiedCartContext.Provider>
  );
};

// Hook to use the unified cart
export const useUnifiedCart = () => {
  const context = useContext(UnifiedCartContext);
  if (!context) {
    throw new Error('useUnifiedCart must be used within UnifiedCartProvider');
  }
  return context;
};

// Re-export the hook with common aliases for consistency
export const useCart = useUnifiedCart;
export const useKioskCart = useUnifiedCart;