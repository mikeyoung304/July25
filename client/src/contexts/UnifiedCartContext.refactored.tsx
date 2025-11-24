/**
 * UnifiedCartContext - Refactored with Deterministic Sync Manager
 *
 * PHASE 4: Replaced 3 racing useEffect hooks with a deterministic sync manager.
 *
 * Original Issues (ARCHITECTURAL_AUDIT_REPORT_V2.md Line 77):
 * - Effect 1 (hydration): Load from localStorage on mount
 * - Effect 2 (persistence): Save to localStorage on every cart change
 * - Effect 3 (restaurant change): Clear cart if restaurantId changes
 *
 * Race Condition Scenario:
 * 1. User navigates from Restaurant A → Restaurant B
 * 2. Effect 3 fires: clears cart
 * 3. Effect 1 fires: loads stale Restaurant A cart from localStorage
 * 4. Result: Wrong restaurant's cart items displayed
 *
 * Solution:
 * - Replaced useState with useReducer for atomic state updates
 * - Sync manager explicitly handles hydration → persistence → invalidation
 * - No more racing effects
 *
 * @see docs/reports/ARCHITECTURAL_AUDIT_REPORT_V2.md - Line 77
 */

import React, { createContext, useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import { MenuItem, Cart, CartItem, calculateCartTotals } from '@rebuild/shared';
import { useParams } from 'react-router-dom';
import { logger } from '@/services/logger';
import { useRestaurantConfig } from '@/hooks/useRestaurantConfig';

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
}

export const UnifiedCartContext = createContext<UnifiedCartContextType | undefined>(undefined);

const DEFAULT_RESTAURANT_ID = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || 'grow';

interface UnifiedCartProviderProps {
  children: React.ReactNode;
  persistKey?: string; // Allow different persistence keys for different contexts
}

// Reducer actions
type CartAction =
  | { type: 'HYDRATE'; items: UnifiedCartItem[]; tip: number; restaurantId: string }
  | { type: 'ADD_ITEM'; item: UnifiedCartItem }
  | { type: 'UPDATE_QUANTITY'; itemId: string; quantity: number }
  | { type: 'UPDATE_ITEM'; itemId: string; updates: Partial<CartItem> }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'CLEAR' }
  | { type: 'UPDATE_TIP'; tip: number }
  | { type: 'INVALIDATE_RESTAURANT'; restaurantId: string };

// Reducer state
interface CartState {
  items: UnifiedCartItem[];
  tip: number;
  restaurantId: string;
  isHydrated: boolean;
}

/**
 * Deterministic cart reducer - all state updates flow through here
 */
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      // Hydration only happens if restaurant matches AND not already hydrated
      if (action.restaurantId === state.restaurantId && !state.isHydrated) {
        return {
          ...state,
          items: action.items,
          tip: action.tip,
          isHydrated: true
        };
      }
      return state;

    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.item]
      };

    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.itemId)
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.itemId ? { ...item, quantity: action.quantity } : item
        )
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.itemId ? { ...item, ...action.updates } : item
        )
      };

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.itemId)
      };

    case 'CLEAR':
      return {
        ...state,
        items: [],
        tip: 0
      };

    case 'UPDATE_TIP':
      return {
        ...state,
        tip: action.tip
      };

    case 'INVALIDATE_RESTAURANT':
      // Restaurant changed - clear cart and reset hydration
      if (action.restaurantId !== state.restaurantId) {
        return {
          items: [],
          tip: 0,
          restaurantId: action.restaurantId,
          isHydrated: false // Allow re-hydration for new restaurant
        };
      }
      return state;

    default:
      return state;
  }
}

export const UnifiedCartProvider: React.FC<UnifiedCartProviderProps> = ({
  children,
  persistKey = 'cart_current'
}) => {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId || DEFAULT_RESTAURANT_ID;
  const [isCartOpen, setIsCartOpen] = React.useState(false);

  // Fetch restaurant config (tax rate, currency, etc.)
  const { taxRate, isLoading: isConfigLoading, error: configError } = useRestaurantConfig(restaurantId);

  // Initialize reducer with current restaurant
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    tip: 0,
    restaurantId,
    isHydrated: false
  });

  // Track if we've persisted to avoid double-writes
  const lastPersistedState = useRef<string>('');

  // Log config errors (but don't block cart functionality during loading)
  useEffect(() => {
    if (configError) {
      logger.error('Failed to load restaurant config for cart', {
        error: configError,
        restaurantId
      });
    }
  }, [configError, restaurantId]);

  /**
   * SYNC MANAGER - Phase 1: Hydration
   * Load cart from localStorage ONCE on mount (client-side only)
   */
  useEffect(() => {
    // SSR guard - only run on client
    if (typeof window === 'undefined') return;

    const savedCart = localStorage.getItem(persistKey);
    if (savedCart && !state.isHydrated) {
      try {
        const parsed = JSON.parse(savedCart);

        // Only hydrate if restaurant matches
        if (parsed.restaurantId === restaurantId) {
          // Validate and migrate cart items to ensure compatibility
          const validatedItems = (parsed.items || []).map((item: any) => {
            let itemId = item.id;

            // Phase 3 Fix: Validate UUID format and regenerate if legacy integer ID
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(itemId);

            if (!isValidUUID) {
              const newUUID = crypto.randomUUID();
              logger.warn('Cart hydration: Regenerated UUID for legacy item', {
                oldId: itemId,
                newId: newUUID,
                itemName: item.name || item.menuItem?.name
              });
              itemId = newUUID;
            }

            const migratedItem: UnifiedCartItem = {
              id: itemId,
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

          dispatch({
            type: 'HYDRATE',
            items: validatedItems,
            tip: parsed.tip || 0,
            restaurantId
          });
        }
      } catch (e) {
        logger.error('Failed to parse saved cart:', e);
        // Clear corrupted cart data
        localStorage.removeItem(persistKey);
      }
    }
  }, [persistKey, restaurantId, state.isHydrated]);

  /**
   * SYNC MANAGER - Phase 2: Persistence
   * Save cart to localStorage whenever state changes (client-only)
   * Only persists AFTER hydration to avoid overwriting with empty cart
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!state.isHydrated) return; // Don't persist until hydrated

    const stateToSave = {
      items: state.items,
      restaurantId: state.restaurantId,
      tip: state.tip
    };

    const serialized = JSON.stringify(stateToSave);

    // Avoid redundant writes
    if (serialized !== lastPersistedState.current) {
      localStorage.setItem(persistKey, serialized);
      lastPersistedState.current = serialized;
    }
  }, [state.items, state.restaurantId, state.tip, state.isHydrated, persistKey]);

  /**
   * SYNC MANAGER - Phase 3: Invalidation
   * Clear cart if restaurant changes (client-only)
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Restaurant changed - invalidate cart
    if (restaurantId !== state.restaurantId) {
      dispatch({ type: 'INVALIDATE_RESTAURANT', restaurantId });
    }
  }, [restaurantId, state.restaurantId]);

  // Calculate cart totals with dynamic tax rate
  const cart = useMemo<UnifiedCart>(() => {
    // Use fetched tax rate (0 during loading, real value when loaded)
    const totals = calculateCartTotals(state.items, taxRate, state.tip);
    const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items: state.items,
      itemCount,
      ...totals,
      tip: state.tip,
      restaurantId: state.restaurantId
    };
  }, [state.items, taxRate, state.tip, state.restaurantId]);

  // Add item with kiosk-style interface
  const addItem = useCallback((
    menuItem: MenuItem,
    quantity: number = 1,
    modifications?: string[],
    specialInstructions?: string
  ) => {
    const newItem: UnifiedCartItem = {
      id: crypto.randomUUID(),
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      modifications,
      specialInstructions,
      menuItemId: menuItem.id
    };

    dispatch({ type: 'ADD_ITEM', item: newItem });
    setIsCartOpen(true); // Show cart after adding
  }, []);

  // Legacy addToCart for backward compatibility
  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    const newItem: UnifiedCartItem = {
      ...item,
      id: crypto.randomUUID()
    };

    dispatch({ type: 'ADD_ITEM', item: newItem });
    setIsCartOpen(true);
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', itemId, quantity });
  }, []);

  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) => {
    dispatch({ type: 'UPDATE_ITEM', itemId, updates });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    setIsCartOpen(false);
    // Also clear from localStorage (client-only)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(persistKey);
    }
  }, [persistKey]);

  const updateTip = useCallback((newTip: number) => {
    dispatch({ type: 'UPDATE_TIP', tip: newTip });
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
    restaurantId: state.restaurantId
  };

  return (
    <UnifiedCartContext.Provider value={value}>
      {children}
    </UnifiedCartContext.Provider>
  );
};

// Default export for convenience
export default UnifiedCartProvider;
