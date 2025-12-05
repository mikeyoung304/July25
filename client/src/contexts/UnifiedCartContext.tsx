import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MenuItem, Cart, CartItem, calculateCartTotals } from '@rebuild/shared';
import { useParams } from 'react-router-dom';
import { logger } from '@/services/logger';
import { useRestaurantConfig } from '@/hooks/useRestaurantConfig';

// UUID generation for cart items (Phase 1: Unified Truth Protocol)
// Server strictly enforces UUID v4 format - no more counter-based IDs

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
export interface UnifiedCartContextType {
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

  // Config state for checkout blocking
  isConfigReady: boolean;
  isConfigLoading: boolean;
  configError: string | null;
}

export const UnifiedCartContext = createContext<UnifiedCartContextType | undefined>(undefined);

const DEFAULT_RESTAURANT_ID = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || 'grow';

// REMOVED: Hardcoded tax rate (Phase 1: Unified Truth Protocol)
// Tax rates are now fetched dynamically from the server via useRestaurantConfig
// See: server/src/services/orders.service.ts:88-153 for server-side implementation

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

  // Fetch restaurant config (tax rate, currency, etc.)
  const { taxRate, isLoading: isConfigLoading, error: configError } = useRestaurantConfig(restaurantId);

  // Initialize with empty array to avoid localStorage SSR issues
  const [items, setItems] = useState<UnifiedCartItem[]>([]);
  const [tip, setTip] = useState(0);

  // Log config errors (but don't block cart functionality during loading)
  useEffect(() => {
    if (configError) {
      logger.error('Failed to load restaurant config for cart', {
        error: configError,
        restaurantId
      });
    }
  }, [configError, restaurantId]);

  // Load cart from localStorage on client-side only (after hydration)
  useEffect(() => {
    // SSR guard - only run on client
    if (typeof window === 'undefined') return;

    const savedCart = localStorage.getItem(persistKey);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (parsed.restaurantId === restaurantId) {
          // Validate and migrate cart items to ensure compatibility
          const validatedItems = (parsed.items || []).map((item: { id: string; name?: string; price?: number; quantity?: number; menuItem?: { name: string; price: number } }) => {
            // Handle both old (with menuItem) and new (flat) structures
            let itemId = item.id;

            // Phase 3 Fix: Validate UUID format and regenerate if legacy integer ID
            // Server strictly enforces UUID v4 format (see orders.service.ts:616)
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(itemId);

            if (!isValidUUID) {
              // Legacy integer ID detected - regenerate UUID to prevent server rejection
              const newUUID = crypto.randomUUID();
              logger.warn('Cart hydration: Regenerated UUID for legacy item', {
                oldId: itemId,
                newId: newUUID,
                itemName: item.name || (item as any).menuItem?.name
              });
              itemId = newUUID;
            }

            const migratedItem: UnifiedCartItem = {
              id: itemId,
              name: item.name || (item as any).menuItem?.name || 'Unknown Item',
              price: item.price || (item as any).menuItem?.price || 0,
              quantity: item.quantity || 1,
              menuItemId: (item as any).menuItemId || (item as any).menuItem?.id || (item as any).menu_item_id,
              modifications: (item as any).modifications || (item as any).modifiers || [],
              specialInstructions: (item as any).specialInstructions || ''
            };

            // Only return items that have essential fields
            if (migratedItem.name && migratedItem.price >= 0 && migratedItem.quantity > 0) {
              return migratedItem;
            }
            return null;
          }).filter(Boolean);

          setItems(validatedItems);
          if (parsed.tip) {
            setTip(parsed.tip);
          }
        }
      } catch (e) {
        logger.error('Failed to parse saved cart:', e);
        // Clear corrupted cart data
        localStorage.removeItem(persistKey);
      }
    }
  }, [persistKey, restaurantId]);

  // Calculate cart totals with dynamic tax rate
  const cart = useMemo<UnifiedCart>(() => {
    // Use fetched tax rate (0 during loading, real value when loaded)
    const totals = calculateCartTotals(items, taxRate, tip);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      itemCount,
      ...totals,
      tip,
      restaurantId
    };
  }, [items, taxRate, tip, restaurantId]);

  // Save cart to localStorage whenever it changes (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(persistKey, JSON.stringify({
      items,
      restaurantId,
      tip
    }));
  }, [items, restaurantId, tip, persistKey]);

  // Clear cart if restaurant changes (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedCart = localStorage.getItem(persistKey);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (parsed.restaurantId && parsed.restaurantId !== restaurantId) {
          setItems([]);
          setTip(0);
        }
      } catch {
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
    // Generate UUID v4 for cart item (server enforces UUID validation)
    const newItem: UnifiedCartItem = {
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID() // Generate UUID v4
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
    // Also clear from localStorage (client-only)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(persistKey);
    }
  }, [persistKey]);

  const updateTip = useCallback((newTip: number) => {
    setTip(newTip);
  }, []);

  // Config is ready when loaded without errors and has a valid tax rate
  const isConfigReady = !isConfigLoading && !configError && taxRate > 0;

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
    restaurantId,
    isConfigReady,
    isConfigLoading,
    configError: configError ? configError.message : null
  };

  return (
    <UnifiedCartContext.Provider value={value}>
      {children}
    </UnifiedCartContext.Provider>
  );
};

// Hooks moved to cart.hooks.ts for better Fast Refresh compatibility
// Context is already exported above

// Default export for convenience
export default UnifiedCartProvider;
