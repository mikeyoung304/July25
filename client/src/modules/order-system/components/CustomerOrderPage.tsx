import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { MenuSections } from './MenuSections';
import { SectionNavigation } from './SectionNavigation';
import { MenuSearch } from './MenuSearch';
import { CartDrawer } from './CartDrawer';
import { ItemDetailModal } from './ItemDetailModal';
import { HeroSection } from './HeroSection';
import { MenuItem } from '../../menu/types';
import { useRestaurant } from '@/core/restaurant-hooks';
import { useCart } from '../context/CartContext';
import { CartProvider } from '../context/CartContext';
import { CartItem } from '../../../../../shared/cart';

const CustomerOrderPageContent: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { setRestaurant } = useRestaurant();
  const { cart, addToCart, setIsCartOpen } = useCart();
  
  const [activeSection, setActiveSection] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

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

  const handleItemClick = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsItemModalOpen(true);
  };

  const handleAddToCart = (item: Omit<CartItem, 'id'>) => {
    addToCart(item);
  };

  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🌱</span>
              <h1 className="text-xl font-bold text-gray-900">
                Grow Fresh
              </h1>
            </div>
            
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
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

      {/* Hero Section */}
      <HeroSection />

      {/* Search Bar */}
      <MenuSearch 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Section Navigation - Only show when not searching */}
      {!searchQuery && (
        <SectionNavigation
          activeSection={activeSection}
          onSectionClick={setActiveSection}
        />
      )}

      {/* Menu Sections */}
      <main className="max-w-7xl mx-auto">
        <MenuSections
          searchQuery={searchQuery}
          onItemClick={handleItemClick}
        />
      </main>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setSelectedMenuItem(null);
        }}
        item={selectedMenuItem}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};

export const CustomerOrderPage: React.FC = () => {
  return (
    <CartProvider>
      <CustomerOrderPageContent />
    </CartProvider>
  );
};