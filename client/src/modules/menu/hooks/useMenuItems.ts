import { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { menuService } from '@/services';
import { useRestaurant } from '@/core/restaurant-hooks';

// Grow Fresh Local Food actual menu items
// Using consistent numeric string IDs to match voice ordering and KDS
const growFreshMenuItems: MenuItem[] = [
  // Beverages
  { id: '101', name: 'Sweet Tea w. Lemon', price: 3.00, category: 'Beverages', description: 'Southern-style sweet tea with fresh lemon', restaurant_id: '1', available: true },
  { id: '102', name: 'Unsweet Tea w. Lemon', price: 3.00, category: 'Beverages', description: 'Fresh brewed tea with lemon', restaurant_id: '1', available: true },
  { id: '103', name: 'Lemonade', price: 3.00, category: 'Beverages', description: 'Fresh-squeezed lemonade', restaurant_id: '1', available: true },
  
  // Starters
  { id: '201', name: 'Summer Sampler', price: 16.00, category: 'Starters', description: 'A selection of our favorite seasonal starters', restaurant_id: '1', available: true },
  { id: '202', name: 'Jalapeno Pimento Bites', price: 10.00, category: 'Starters', description: 'Spicy pimento cheese bites with fresh jalapeños', restaurant_id: '1', available: true },
  { id: '203', name: 'Peach & Prosciutto Caprese', price: 12.00, category: 'Starters', description: 'Fresh Georgia peaches with prosciutto and mozzarella', restaurant_id: '1', available: true },
  { id: '204', name: 'Watermelon Tataki', price: 10.00, category: 'Starters', description: 'Fresh watermelon with a savory twist', restaurant_id: '1', available: true },
  { id: '205', name: 'Tea Sandwiches', price: 10.00, category: 'Starters', description: 'Assorted finger sandwiches perfect for sharing', restaurant_id: '1', available: true },
  
  // Salads
  { id: '301', name: 'Summer Salad', price: 12.00, category: 'Salads', description: 'Fresh seasonal greens with summer vegetables', restaurant_id: '1', available: true },
  { id: '302', name: 'Greek Salad', price: 12.00, category: 'Salads', description: 'Crisp greens with feta, olives, and Greek dressing', restaurant_id: '1', available: true },
  { id: '303', name: 'Peach Arugula Salad', price: 12.00, category: 'Salads', description: 'Peppery arugula with fresh Georgia peaches', restaurant_id: '1', available: true },
  { id: '304', name: 'Tuna Salad', price: 14.00, category: 'Salads', description: 'House-made tuna salad on fresh greens', restaurant_id: '1', available: true },
  { id: '305', name: "Mom's Chicken Salad", price: 13.00, category: 'Salads', description: 'Traditional chicken salad with grapes and pecans', restaurant_id: '1', available: true },
  { id: '306', name: 'Grilled Chicken Salad', price: 14.00, category: 'Salads', description: 'Grilled chicken breast on mixed greens', restaurant_id: '1', available: true },
  
  // Sandwiches
  { id: '401', name: 'Chicken Salad Sandwich', price: 12.00, category: 'Sandwiches', description: 'House-made chicken salad with lettuce and tomato', restaurant_id: '1', available: true },
  { id: '402', name: 'BLT Sandwich', price: 12.00, category: 'Sandwiches', description: 'Classic bacon, lettuce, and tomato', restaurant_id: '1', available: true },
  { id: '403', name: 'Tuna Salad Sandwich', price: 12.00, category: 'Sandwiches', description: 'Fresh tuna salad on your choice of bread', restaurant_id: '1', available: true },
  { id: '404', name: 'Jalapeno Pimento Cheese Sandwich', price: 12.00, category: 'Sandwiches', description: 'Spicy pimento cheese sandwich', restaurant_id: '1', available: true },
  { id: '405', name: 'Chopped Italian Sandwich', price: 14.00, category: 'Sandwiches', description: 'Italian meats and cheeses with peppers and onions', restaurant_id: '1', available: true },
  
  // Bowls
  { id: '501', name: 'Soul Bowl', price: 14.00, category: 'Bowls', description: 'Georgia-made soul food with field peas, collards, and rice', restaurant_id: '1', available: true },
  { id: '502', name: 'Chicken Fajita Keto Bowl', price: 14.00, category: 'Bowls', description: 'Grilled chicken with peppers and onions, keto-friendly', restaurant_id: '1', available: true },
  { id: '503', name: 'Greek Bowl', price: 14.00, category: 'Bowls', description: 'Mediterranean flavors with chicken, feta, and olives', restaurant_id: '1', available: true },
  
  // Vegan
  { id: '601', name: 'Summer Vegan Bowl (Cold)', price: 14.00, category: 'Vegan', description: 'Fresh seasonal vegetables and grains', restaurant_id: '1', available: true },
  { id: '602', name: 'Summer Succotash', price: 10.00, category: 'Vegan', description: 'Traditional Southern succotash, served hot', restaurant_id: '1', available: true },
  
  // Entrees
  { id: '701', name: 'Peach Chicken', price: 16.00, category: 'Entrees', description: 'Grilled chicken with Georgia peach glaze, served with 2 sides', restaurant_id: '1', available: true },
  { id: '702', name: 'Teriyaki Salmon', price: 16.00, category: 'Entrees', description: 'Fresh salmon with teriyaki glaze, served with 2 sides', restaurant_id: '1', available: true },
  { id: '703', name: 'Hamburger Steak', price: 15.00, category: 'Entrees', description: 'Southern-style hamburger steak with gravy, served with 2 sides', restaurant_id: '1', available: true },
  { id: '704', name: 'Greek Chicken Thighs', price: 15.00, category: 'Entrees', description: '2 Greek-seasoned chicken thighs over rice', restaurant_id: '1', available: true },
];

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { restaurant } = useRestaurant();

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        
        if (restaurant?.id) {
          // Try to fetch from API
          try {
            const items = await menuService.getMenuItems();
            setItems(items);
            setError(null);
          } catch (apiError) {
            // Fall back to Grow Fresh menu in development
            console.warn('API call failed, using Grow Fresh menu:', apiError);
            setItems(growFreshMenuItems);
            setError(null);
          }
        } else {
          // Use Grow Fresh menu if no restaurant ID
          setItems(growFreshMenuItems);
          setError(null);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [restaurant?.id]);

  return { items, loading, error };
};