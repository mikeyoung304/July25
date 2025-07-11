import { useState, useEffect } from 'react';
import { MenuItem } from '../../orders/types';

// Mock menu data for development
const mockMenuItems: MenuItem[] = [
  // Burgers
  { id: '1', name: 'Classic Burger', price: 12.99, category: 'burgers', description: 'Beef patty with lettuce, tomato, onion', restaurant_id: '1', available: true },
  { id: '2', name: 'Bacon Burger', price: 14.99, category: 'burgers', description: 'Classic burger with crispy bacon', restaurant_id: '1', available: true },
  { id: '3', name: 'Cheeseburger', price: 13.99, category: 'burgers', description: 'Classic burger with american cheese', restaurant_id: '1', available: true },
  { id: '4', name: 'Veggie Burger', price: 11.99, category: 'burgers', description: 'Plant-based patty with fresh vegetables', restaurant_id: '1', available: true },
  
  // Sides
  { id: '5', name: 'French Fries', price: 3.99, category: 'sides', description: 'Crispy golden fries', restaurant_id: '1', available: true },
  { id: '6', name: 'Onion Rings', price: 4.99, category: 'sides', description: 'Beer-battered onion rings', restaurant_id: '1', available: true },
  { id: '7', name: 'Side Salad', price: 4.99, category: 'sides', description: 'Fresh mixed greens', restaurant_id: '1', available: true },
  
  // Drinks
  { id: '8', name: 'Coca Cola', price: 2.99, category: 'drinks', description: 'Classic Coke', restaurant_id: '1', available: true },
  { id: '9', name: 'Diet Coke', price: 2.99, category: 'drinks', description: 'Sugar-free cola', restaurant_id: '1', available: true },
  { id: '10', name: 'Sprite', price: 2.99, category: 'drinks', description: 'Lemon-lime soda', restaurant_id: '1', available: true },
  { id: '11', name: 'Orange Juice', price: 3.99, category: 'drinks', description: 'Fresh squeezed', restaurant_id: '1', available: true },
  { id: '12', name: 'Coffee', price: 2.49, category: 'drinks', description: 'Hot brewed coffee', restaurant_id: '1', available: true },
  
  // Desserts
  { id: '13', name: 'Chocolate Shake', price: 5.99, category: 'desserts', description: 'Rich chocolate milkshake', restaurant_id: '1', available: true },
  { id: '14', name: 'Vanilla Shake', price: 5.99, category: 'desserts', description: 'Classic vanilla milkshake', restaurant_id: '1', available: true },
  { id: '15', name: 'Apple Pie', price: 3.99, category: 'desserts', description: 'Warm apple pie slice', restaurant_id: '1', available: true },
];

export const useMenuItems = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        // In production, this would be an API call
        // For now, we'll use mock data
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        setMenuItems(mockMenuItems);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  return { menuItems, loading, error };
};