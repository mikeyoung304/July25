import { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { MenuService } from '@/services/MenuService';
import { useRestaurant } from '@/core/restaurant-hooks';

// Grow Fresh Local Food actual menu items
const growFreshMenuItems: MenuItem[] = [
  // Beverages
  { id: 'bev-1', name: 'Sweet Tea w. Lemon', price: 3.00, category: 'Beverages', description: 'Southern-style sweet tea with fresh lemon', restaurant_id: '1', available: true },
  { id: 'bev-2', name: 'Unsweet Tea w. Lemon', price: 3.00, category: 'Beverages', description: 'Fresh brewed tea with lemon', restaurant_id: '1', available: true },
  { id: 'bev-3', name: 'Lemonade', price: 3.00, category: 'Beverages', description: 'Fresh-squeezed lemonade', restaurant_id: '1', available: true },
  
  // Starters
  { id: 'start-1', name: 'Summer Sampler', price: 16.00, category: 'Starters', description: 'A selection of our favorite seasonal starters', restaurant_id: '1', available: true },
  { id: 'start-2', name: 'Jalapeno Pimento Bites', price: 10.00, category: 'Starters', description: 'Spicy pimento cheese bites with fresh jalapeños', restaurant_id: '1', available: true },
  { id: 'start-3', name: 'Peach & Prosciutto Caprese', price: 12.00, category: 'Starters', description: 'Fresh Georgia peaches with prosciutto and mozzarella', restaurant_id: '1', available: true },
  { id: 'start-4', name: 'Watermelon Tataki', price: 10.00, category: 'Starters', description: 'Fresh watermelon with a savory twist', restaurant_id: '1', available: true },
  { id: 'start-5', name: 'Tea Sandwiches', price: 10.00, category: 'Starters', description: 'Assorted finger sandwiches perfect for sharing', restaurant_id: '1', available: true },
  
  // Salads
  { id: 'salad-1', name: 'Summer Salad', price: 12.00, category: 'Salads', description: 'Fresh seasonal greens with summer vegetables', restaurant_id: '1', available: true },
  { id: 'salad-2', name: 'Greek Salad', price: 12.00, category: 'Salads', description: 'Crisp greens with feta, olives, and Greek dressing', restaurant_id: '1', available: true },
  { id: 'salad-3', name: 'Peach Arugula Salad', price: 12.00, category: 'Salads', description: 'Peppery arugula with fresh Georgia peaches', restaurant_id: '1', available: true },
  { id: 'salad-4', name: 'Tuna Salad', price: 14.00, category: 'Salads', description: 'House-made tuna salad on fresh greens', restaurant_id: '1', available: true },
  { id: 'salad-5', name: "Mom's Chicken Salad", price: 13.00, category: 'Salads', description: 'Traditional chicken salad with grapes and pecans', restaurant_id: '1', available: true },
  { id: 'salad-6', name: 'Grilled Chicken Salad', price: 14.00, category: 'Salads', description: 'Grilled chicken breast on mixed greens', restaurant_id: '1', available: true },
  
  // Sandwiches
  { id: 'sand-1', name: 'Chicken Salad Sandwich', price: 12.00, category: 'Sandwiches', description: 'House-made chicken salad with lettuce and tomato', restaurant_id: '1', available: true },
  { id: 'sand-2', name: 'BLT Sandwich', price: 12.00, category: 'Sandwiches', description: 'Classic bacon, lettuce, and tomato', restaurant_id: '1', available: true },
  { id: 'sand-3', name: 'Tuna Salad Sandwich', price: 12.00, category: 'Sandwiches', description: 'Fresh tuna salad on your choice of bread', restaurant_id: '1', available: true },
  { id: 'sand-4', name: 'Jalapeno Pimento Cheese Sandwich', price: 12.00, category: 'Sandwiches', description: 'Spicy pimento cheese sandwich', restaurant_id: '1', available: true },
  { id: 'sand-5', name: 'Chopped Italian Sandwich', price: 14.00, category: 'Sandwiches', description: 'Italian meats and cheeses with peppers and onions', restaurant_id: '1', available: true },
  
  // Bowls
  { id: 'bowl-1', name: 'Soul Bowl', price: 14.00, category: 'Bowls', description: 'Georgia-made soul food with field peas, collards, and rice', restaurant_id: '1', available: true },
  { id: 'bowl-2', name: 'Chicken Fajita Keto Bowl', price: 14.00, category: 'Bowls', description: 'Grilled chicken with peppers and onions, keto-friendly', restaurant_id: '1', available: true },
  { id: 'bowl-3', name: 'Greek Bowl', price: 14.00, category: 'Bowls', description: 'Mediterranean flavors with chicken, feta, and olives', restaurant_id: '1', available: true },
  
  // Vegan
  { id: 'vegan-1', name: 'Summer Vegan Bowl (Cold)', price: 14.00, category: 'Vegan', description: 'Fresh seasonal vegetables and grains', restaurant_id: '1', available: true },
  { id: 'vegan-2', name: 'Summer Succotash', price: 10.00, category: 'Vegan', description: 'Traditional Southern succotash, served hot', restaurant_id: '1', available: true },
  
  // Entrees
  { id: 'entree-1', name: 'Peach Chicken', price: 16.00, category: 'Entrees', description: 'Grilled chicken with Georgia peach glaze, served with 2 sides', restaurant_id: '1', available: true },
  { id: 'entree-2', name: 'Teriyaki Salmon', price: 16.00, category: 'Entrees', description: 'Fresh salmon with teriyaki glaze, served with 2 sides', restaurant_id: '1', available: true },
  { id: 'entree-3', name: 'Hamburger Steak', price: 15.00, category: 'Entrees', description: 'Southern-style hamburger steak with gravy, served with 2 sides', restaurant_id: '1', available: true },
  { id: 'entree-4', name: 'Greek Chicken Thighs', price: 15.00, category: 'Entrees', description: '2 Greek-seasoned chicken thighs over rice', restaurant_id: '1', available: true },
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
            const response = await MenuService.getMenuItems(restaurant.id);
            setItems(response.items);
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