import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { MenuGrid } from './MenuGrid';
import { CategoryFilter } from './CategoryFilter';
import { MenuSearch } from './MenuSearch';
import { CartDrawer } from './CartDrawer';
import { ItemDetailModal } from './ItemDetailModal';
import { Cart, CartItem as CartItemType } from '../types';
import { MenuItem } from '../../menu/types';
import { useRestaurant } from '@/core/restaurant-hooks';

const TAX_RATE = 0.0825; // 8.25% tax rate

export const CustomerOrderPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { setRestaurant } = useRestaurant();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  
  const [cart, setCart] = useState<Cart>(() => {
    const savedCart = localStorage.getItem(`cart_${restaurantId}`);
    if (savedCart) {
      return JSON.parse(savedCart);
    }
    return {
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      restaurantId: restaurantId || ''
    };
  });

  // Set restaurant context
  useEffect(() => {
    if (restaurantId) {
      setRestaurant({
        id: restaurantId,
        name: 'Restaurant',
        timezone: 'UTC',
        currency: 'USD'
      });
    }
  }, [restaurantId, setRestaurant]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (restaurantId) {
      localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
    }
  }, [cart, restaurantId]);

  const calculateCartTotals = (items: CartItemType[]): Omit<Cart, 'items' | 'restaurantId'> => {
    const subtotal = items.reduce((sum, item) => {
      const itemPrice = item.price + (item.modifiers?.reduce((modSum, mod) => modSum + mod.price, 0) || 0);
      return sum + (itemPrice * item.quantity);
    }, 0);
    
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const addToCart = (item: CartItemType) => {
    setCart(prevCart => {
      const newItems = [...prevCart.items, item];
      const totals = calculateCartTotals(newItems);
      
      return {
        ...prevCart,
        items: newItems,
        ...totals
      };
    });
    
    // Show cart drawer after adding item
    setIsCartOpen(true);
  };

  const updateCartItem = (itemId: string, updates: Partial<CartItemType>) => {
    setCart(prevCart => {
      const newItems = prevCart.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );
      const totals = calculateCartTotals(newItems);
      
      return {
        ...prevCart,
        items: newItems,
        ...totals
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.id !== itemId);
      const totals = calculateCartTotals(newItems);
      
      return {
        ...prevCart,
        items: newItems,
        ...totals
      };
    });
  };

  const handleItemClick = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsItemModalOpen(true);
  };

  const handleCheckout = () => {
    // TODO: Implement checkout flow with Square
    console.log('Proceeding to checkout with cart:', cart);
  };

  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              Grow Fresh Menu
            </h1>
            
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 bg-macon-orange text-white rounded-lg hover:bg-macon-orange-dark transition-colors duration-200"
              aria-label={`Open cart with ${cartItemCount} items`}
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <MenuSearch 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Menu Grid */}
      <main className="max-w-7xl mx-auto">
        <MenuGrid
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onItemClick={handleItemClick}
        />
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateItem={updateCartItem}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
      />

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setSelectedMenuItem(null);
        }}
        item={selectedMenuItem}
        onAddToCart={addToCart}
      />
    </div>
  );
};