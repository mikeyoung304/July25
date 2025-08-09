import { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { menuService } from '@/services';
import { useRestaurant } from '@/core/restaurant-hooks';

// Grow Fresh Local Food actual menu items with images
// Using consistent numeric string IDs to match voice ordering and KDS
const growFreshMenuItems: MenuItem[] = [
  // Beverages
  { id: '101', name: 'Sweet Tea w. Lemon', price: 3.00, category: 'Beverages', description: 'Southern-style sweet tea with fresh lemon', imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '102', name: 'Unsweet Tea w. Lemon', price: 3.00, category: 'Beverages', description: 'Fresh brewed tea with lemon', imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '103', name: 'Lemonade', price: 3.00, category: 'Beverages', description: 'Fresh-squeezed lemonade', imageUrl: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  
  // Starters
  { id: '201', name: 'Summer Sampler', price: 16.00, category: 'Starters', description: 'A selection of our favorite seasonal starters', imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '202', name: 'Jalapeno Pimento Bites', price: 10.00, category: 'Starters', description: 'Spicy pimento cheese bites with fresh jalapeños', imageUrl: 'https://images.unsplash.com/photo-1605711285075-b9253b17b2b7?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '203', name: 'Peach & Prosciutto Caprese', price: 12.00, category: 'Starters', description: 'Fresh Georgia peaches with prosciutto and mozzarella', imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '204', name: 'Watermelon Tataki', price: 10.00, category: 'Starters', description: 'Fresh watermelon with a savory twist', imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784390?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '205', name: 'Tea Sandwiches', price: 10.00, category: 'Starters', description: 'Assorted finger sandwiches perfect for sharing', imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  
  // Salads
  { id: '301', name: 'Summer Salad', price: 12.00, category: 'Salads', description: 'Fresh seasonal greens with summer vegetables', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '302', name: 'Greek Salad', price: 12.00, category: 'Salads', description: 'Crisp greens with feta, olives, and Greek dressing', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '303', name: 'Peach Arugula Salad', price: 12.00, category: 'Salads', description: 'Peppery arugula with fresh Georgia peaches', imageUrl: 'https://images.unsplash.com/photo-1623428187969-5da2dcea8677?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '304', name: 'Tuna Salad', price: 14.00, category: 'Salads', description: 'House-made tuna salad on fresh greens', imageUrl: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '305', name: "Mom's Chicken Salad", price: 13.00, category: 'Salads', description: 'Traditional chicken salad with grapes and pecans', imageUrl: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '306', name: 'Grilled Chicken Salad', price: 14.00, category: 'Salads', description: 'Grilled chicken breast on mixed greens', imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  
  // Sandwiches
  { id: '401', name: 'Chicken Salad Sandwich', price: 12.00, category: 'Sandwiches', description: 'House-made chicken salad with lettuce and tomato', imageUrl: 'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '402', name: 'BLT Sandwich', price: 12.00, category: 'Sandwiches', description: 'Classic bacon, lettuce, and tomato', imageUrl: 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '403', name: 'Tuna Salad Sandwich', price: 12.00, category: 'Sandwiches', description: 'Fresh tuna salad on your choice of bread', imageUrl: 'https://images.unsplash.com/photo-1626078323320-a3dd5c1a998e?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '404', name: 'Jalapeno Pimento Cheese Sandwich', price: 12.00, category: 'Sandwiches', description: 'Spicy pimento cheese sandwich', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  { id: '405', name: 'Chopped Italian Sandwich', price: 14.00, category: 'Sandwiches', description: 'Italian meats and cheeses with peppers and onions', imageUrl: 'https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=400&h=300&fit=crop', restaurant_id: '1', available: true },
  
  // Bowls
  { id: '501', name: 'Soul Bowl', price: 14.00, category: 'Bowls', description: 'Georgia-made soul food with field peas, collards, and rice', imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 450 },
  { id: '502', name: 'Chicken Fajita Keto Bowl', price: 14.00, category: 'Bowls', description: 'Grilled chicken with peppers and onions, keto-friendly', imageUrl: 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 380 },
  { id: '503', name: 'Greek Bowl', price: 14.00, category: 'Bowls', description: 'Mediterranean flavors with chicken, feta, and olives', imageUrl: 'https://images.unsplash.com/photo-1580013759735-ccea85c1d16e?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 420 },
  
  // Vegan
  { id: '601', name: 'Summer Vegan Bowl (Cold)', price: 14.00, category: 'Vegan', description: 'Fresh seasonal vegetables and grains', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 350 },
  { id: '602', name: 'Summer Succotash', price: 10.00, category: 'Vegan', description: 'Traditional Southern succotash, served hot', imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 280 },
  
  // Entrees
  { id: '701', name: 'Peach Chicken', price: 16.00, category: 'Entrees', description: 'Grilled chicken with Georgia peach glaze, served with 2 sides', imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 550 },
  { id: '702', name: 'Teriyaki Salmon', price: 16.00, category: 'Entrees', description: 'Fresh salmon with teriyaki glaze, served with 2 sides', imageUrl: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 480 },
  { id: '703', name: 'Hamburger Steak', price: 15.00, category: 'Entrees', description: 'Southern-style hamburger steak with gravy, served with 2 sides', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 650 },
  { id: '704', name: 'Greek Chicken Thighs', price: 15.00, category: 'Entrees', description: '2 Greek-seasoned chicken thighs over rice', imageUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&h=300&fit=crop', restaurant_id: '1', available: true, calories: 520 },
];

// Map of item names to image URLs for Grow Fresh menu
const imageUrlMap: Record<string, string> = {
  // Beverages
  'Sweet Tea w. Lemon': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
  'Unsweet Tea w. Lemon': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop',
  'Lemonade': 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400&h=300&fit=crop',
  
  // Starters
  'Summer Sampler': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
  'Jalapeno Pimento Bites': 'https://images.unsplash.com/photo-1605711285075-b9253b17b2b7?w=400&h=300&fit=crop',
  'Peach & Prosciutto Caprese': 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400&h=300&fit=crop',
  'Watermelon Tataki': 'https://images.unsplash.com/photo-1587049352846-4a222e784390?w=400&h=300&fit=crop',
  'Tea Sandwiches': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
  
  // Salads
  'Summer Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'Greek Salad': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
  'Peach Arugula Salad': 'https://images.unsplash.com/photo-1623428187969-5da2dcea8677?w=400&h=300&fit=crop',
  'Tuna Salad': 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400&h=300&fit=crop',
  "Mom's Chicken Salad": 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=300&fit=crop',
  'Grilled Chicken Salad': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop',
  
  // Sandwiches
  'Chicken Salad Sandwich': 'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=400&h=300&fit=crop',
  'BLT Sandwich': 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=400&h=300&fit=crop',
  'Tuna Salad Sandwich': 'https://images.unsplash.com/photo-1626078323320-a3dd5c1a998e?w=400&h=300&fit=crop',
  'Jalapeno Pimento Cheese Sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Chopped Italian Sandwich': 'https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=400&h=300&fit=crop',
  
  // Bowls
  'Soul Bowl': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop',
  'Chicken Fajita Keto Bowl': 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400&h=300&fit=crop',
  'Greek Bowl': 'https://images.unsplash.com/photo-1580013759735-ccea85c1d16e?w=400&h=300&fit=crop',
  
  // Vegan
  'Summer Vegan Bowl (Cold)': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'Summer Succotash': 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400&h=300&fit=crop',
  
  // Entrees
  'Peach Chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop',
  'Teriyaki Salmon': 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
  'Hamburger Steak': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Greek Chicken Thighs': 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&h=300&fit=crop',
};

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
            const apiItems = await menuService.getMenuItems();
            // Add image URLs if missing
            const itemsWithImages = apiItems.map(item => ({
              ...item,
              imageUrl: item.imageUrl || imageUrlMap[item.name] || undefined
            }));
            setItems(itemsWithImages);
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