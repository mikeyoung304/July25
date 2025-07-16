import React, { useState, useCallback } from 'react';
import { MenuItem } from '@/services/types';
import type { OrderModification, VoiceOrderItem } from './types';
import { VoiceOrderContext } from './context';

export const VoiceOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<VoiceOrderItem[]>([]);

  const calculateSubtotal = useCallback((menuItem: MenuItem, quantity: number, mods: OrderModification[]) => {
    const basePrice = menuItem.price * quantity;
    const modPrice = mods.reduce((sum, mod) => sum + (mod.price || 0), 0) * quantity;
    return basePrice + modPrice;
  }, []);

  const addItem = useCallback((menuItem: MenuItem, quantity = 1, mods: OrderModification[] = []) => {
    const newItem: VoiceOrderItem = {
      id: `${Date.now()}-${Math.random()}`,
      menuItem,
      quantity,
      modifications: mods,
      subtotal: calculateSubtotal(menuItem, quantity, mods)
    };
    
    setItems(prev => [...prev, newItem]);
  }, [calculateSubtotal]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            quantity,
            subtotal: calculateSubtotal(item.menuItem, quantity, item.modifications)
          }
        : item
    ));
  }, [removeItem, calculateSubtotal]);

  const updateModifications = useCallback((id: string, mods: OrderModification[]) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            modifications: mods,
            subtotal: calculateSubtotal(item.menuItem, item.quantity, mods)
          }
        : item
    ));
  }, [calculateSubtotal]);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <VoiceOrderContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateModifications,
      clear,
      total,
      itemCount
    }}>
      {children}
    </VoiceOrderContext.Provider>
  );
};

