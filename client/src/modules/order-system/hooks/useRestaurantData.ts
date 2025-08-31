import { useState, useEffect } from 'react';
import { httpClient } from '@/services/http';

export interface RestaurantData {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  taxRate: number;
  defaultTipPercentages: number[];
  logoUrl?: string;
  address?: string;
  phone?: string;
  businessHours?: string;
  description?: string;
}

export function useRestaurantData(restaurantId: string | undefined) {
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await httpClient.get<RestaurantData>(`/restaurants/${restaurantId}`);
        
        if (response && 'success' in response && response.success && (response as any).data) {
          setRestaurant((response as any).data);
        } else {
          throw new Error('Failed to load restaurant data');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId]);

  return { restaurant, loading, error };
}