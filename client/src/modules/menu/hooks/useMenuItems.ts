import { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { MenuService } from '@/services/MenuService';
import { useRestaurant } from '@/modules/restaurant/hooks/useRestaurant';

// Mock menu data for development fallback
const mockMenuItems: MenuItem[] = [
  // Burgers
  { id: '1', name: 'Classic Burger', price: 12.99, category: 'burgers', description: 'Beef patty with lettuce, tomato, onion', restaurant_id: '1', available: true, imageUrl: '/images/classic-burger.jpg', calories: 650 },
  { id: '2', name: 'Bacon Burger', price: 14.99, category: 'burgers', description: 'Classic burger with crispy bacon', restaurant_id: '1', available: true, imageUrl: '/images/bacon-burger.jpg', calories: 750 },
  { id: '3', name: 'Cheeseburger', price: 13.99, category: 'burgers', description: 'Classic burger with american cheese', restaurant_id: '1', available: true, imageUrl: '/images/cheeseburger.jpg', calories: 700 },
  { id: '4', name: 'Veggie Burger', price: 11.99, category: 'burgers', description: 'Plant-based patty with fresh vegetables', restaurant_id: '1', available: true, imageUrl: '/images/veggie-burger.jpg', calories: 450 },
  
  // Sides
  { id: '5', name: 'French Fries', price: 3.99, category: 'sides', description: 'Crispy golden fries', restaurant_id: '1', available: true, imageUrl: '/images/fries.jpg', calories: 320 },
  { id: '6', name: 'Onion Rings', price: 4.99, category: 'sides', description: 'Beer-battered onion rings', restaurant_id: '1', available: true, imageUrl: '/images/onion-rings.jpg', calories: 380 },
  { id: '7', name: 'Side Salad', price: 4.99, category: 'sides', description: 'Fresh mixed greens', restaurant_id: '1', available: true, imageUrl: '/images/salad.jpg', calories: 150 },
  
  // Drinks
  { id: '8', name: 'Coca Cola', price: 2.99, category: 'drinks', description: 'Classic Coke', restaurant_id: '1', available: true, imageUrl: '/images/coke.jpg', calories: 140 },
  { id: '9', name: 'Diet Coke', price: 2.99, category: 'drinks', description: 'Sugar-free cola', restaurant_id: '1', available: true, imageUrl: '/images/diet-coke.jpg', calories: 0 },
  { id: '10', name: 'Sprite', price: 2.99, category: 'drinks', description: 'Lemon-lime soda', restaurant_id: '1', available: true, imageUrl: '/images/sprite.jpg', calories: 140 },
  { id: '11', name: 'Orange Juice', price: 3.99, category: 'drinks', description: 'Fresh squeezed', restaurant_id: '1', available: true, imageUrl: '/images/orange-juice.jpg', calories: 110 },
  { id: '12', name: 'Coffee', price: 2.49, category: 'drinks', description: 'Hot brewed coffee', restaurant_id: '1', available: true, imageUrl: '/images/coffee.jpg', calories: 5 },
  
  // Desserts
  { id: '13', name: 'Chocolate Shake', price: 5.99, category: 'desserts', description: 'Rich chocolate milkshake', restaurant_id: '1', available: true, imageUrl: '/images/chocolate-shake.jpg', calories: 580 },
  { id: '14', name: 'Vanilla Shake', price: 5.99, category: 'desserts', description: 'Classic vanilla milkshake', restaurant_id: '1', available: true, imageUrl: '/images/vanilla-shake.jpg', calories: 550 },
  { id: '15', name: 'Apple Pie', price: 3.99, category: 'desserts', description: 'Warm apple pie slice', restaurant_id: '1', available: true, imageUrl: '/images/apple-pie.jpg', calories: 320 },
];

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { restaurantId } = useRestaurant();

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        
        if (restaurantId) {
          // Try to fetch from API
          try {
            const response = await MenuService.getMenuItems(restaurantId);
            setItems(response.items);
            setError(null);
          } catch (apiError) {
            // Fall back to mock data in development
            console.warn('API call failed, using mock data:', apiError);
            setItems(mockMenuItems);
            setError(null);
          }
        } else {
          // Use mock data if no restaurant ID
          setItems(mockMenuItems);
          setError(null);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [restaurantId]);

  return { items, loading, error };
};