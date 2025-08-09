import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Search } from 'lucide-react';
import { MenuSections } from './MenuSections';
import { SectionNavigation } from './SectionNavigation';
import { CartDrawer } from './CartDrawer';
import { ItemDetailModal } from './ItemDetailModal';
import { DietaryFilters } from './DietaryFilters';
import { SortOptions } from './SortOptions';
import { MenuItem } from '../../menu/types';
import { useRestaurant } from '@/core/restaurant-hooks';
import { useCart } from '../context/cartContext.hooks';
import { CartProvider } from '../context/CartContext';
import { CartItem } from '../../../../../shared/cart';
import { useRestaurantData } from '../hooks/useRestaurantData';

const CustomerOrderPageContent: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { setRestaurant } = useRestaurant();
  const { cart, addToCart, setIsCartOpen } = useCart();
  const { restaurant: restaurantData } = useRestaurantData(restaurantId);
  
  const [activeSection, setActiveSection] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [dietaryFilters, setDietaryFilters] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('default');

  // Set restaurant context when data loads
  useEffect(() => {
    if (restaurantData) {
      setRestaurant({
        id: restaurantData.id,
        name: restaurantData.name,
        timezone: restaurantData.timezone,
        currency: restaurantData.currency
      });
    }
  }, [restaurantData, setRestaurant]);

  const handleItemClick = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsItemModalOpen(true);
  };

  const handleAddToCart = (item: Omit<CartItem, 'id'>) => {
    addToCart(item);
  };

  const handleFilterToggle = (filter: string) => {
    setDietaryFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Much larger and more prominent */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {restaurantData?.name || 'Restaurant'}
              </h1>
            </div>
            
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center space-x-3 px-6 py-4 bg-teal-600 text-white font-bold text-lg rounded-2xl hover:bg-teal-700 active:bg-teal-800 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[56px]"
              aria-label={`Open cart with ${cartItemCount} items`}
            >
              <ShoppingCart className="w-6 h-6" />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span className="bg-white text-teal-600 text-base font-bold rounded-full h-8 w-8 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - More prominent */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-12">
          <h2 className="text-xl md:text-2xl font-medium text-gray-700 leading-relaxed">
            {restaurantData?.description || 'Fresh food made with love'}
          </h2>
        </div>
      </div>

      {/* Search and Filters - Much larger and more accessible */}
      <div className="sticky top-20 md:top-24 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-4 md:space-y-0 md:space-x-6 py-6">
            {/* Search - Much larger */}
            <div className="flex-1 max-w-2xl relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for your favorite dishes..."
                className="w-full pl-14 pr-6 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all duration-200"
              />
            </div>
            
            {/* Filters and Sort - Larger buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-3">
                <DietaryFilters 
                  selectedFilters={dietaryFilters}
                  onFilterToggle={handleFilterToggle}
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-700 whitespace-nowrap">Sort:</span>
                <SortOptions 
                  currentSort={sortOption}
                  onSortChange={setSortOption}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Navigation - Only show when not searching */}
      {!searchQuery && dietaryFilters.length === 0 && (
        <SectionNavigation
          activeSection={activeSection}
          onSectionClick={setActiveSection}
        />
      )}

      {/* Menu Sections - More generous spacing */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
        <MenuSections
          searchQuery={searchQuery}
          dietaryFilters={dietaryFilters}
          sortOption={sortOption}
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