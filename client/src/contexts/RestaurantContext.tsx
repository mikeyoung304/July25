import React, { createContext, useContext, useMemo } from 'react';

export interface RestaurantSettings {
  orderPrefix?: string;
  autoAcceptOrders?: boolean;
  kitchenDisplayMode?: 'list' | 'grid' | 'table';
}

export interface Restaurant {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  settings?: RestaurantSettings;
}

export interface RestaurantContextType {
  restaurant: Restaurant | null;
  setRestaurant: (restaurant: Restaurant | null) => void;
  isLoading: boolean;
  error: Error | null;
}

export interface RestaurantProviderProps {
  value: RestaurantContextType;
  children: React.ReactNode;
}

const noop: RestaurantContextType['setRestaurant'] = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('setRestaurant called without RestaurantProvider');
  }
};

const defaultContextValue: RestaurantContextType = {
  restaurant: null,
  setRestaurant: noop,
  isLoading: true,
  error: null,
};

export const RestaurantContext = createContext<RestaurantContextType>(defaultContextValue);

// Preserve stable identifier for legacy logging helpers
;(RestaurantContext as { __contextId?: string }).__contextId = 'restaurant-context-default';

export const RestaurantProvider: React.FC<RestaurantProviderProps> = ({ value, children }) => {
  const memoValue = useMemo(
    () => value,
    [
      value.restaurant?.id,
      value.restaurant?.name,
      value.isLoading,
      value.error,
      value.setRestaurant,
    ],
  );

  return <RestaurantContext.Provider value={memoValue}>{children}</RestaurantContext.Provider>;
};

export function useRestaurantContext(): RestaurantContextType {
  const ctx = useContext(RestaurantContext);

  if (!ctx) {
    throw new Error('RestaurantContext not available');
  }

  return ctx;
}

export const useRestaurant = useRestaurantContext;

