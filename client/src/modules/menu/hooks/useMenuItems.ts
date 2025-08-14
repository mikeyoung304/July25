import { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { menuService } from '@/services';
import { useRestaurant } from '@/core/restaurant-hooks';

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { restaurant } = useRestaurant();

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!restaurant?.id) {
          const noContextError = new Error('No restaurant context');
          setError(noContextError);
          setItems([]);
          return;
        }

        // Only use mocks if explicitly enabled in dev mode
        const useMocks = import.meta.env.VITE_USE_MOCK_DATA === 'true' && 
                        import.meta.env.MODE === 'development';
        
        if (useMocks) {
          console.warn('🚧 Using mock menu data (dev mode)');
          // Will be handled by MenuService
        }
        
        const apiItems = await menuService.getMenuItems();
        setItems(apiItems);
        
      } catch (err) {
        console.error('Failed to load menu:', err);
        setError(err as Error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [restaurant?.id]);

  return { items, loading, error };
};