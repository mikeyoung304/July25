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
import { useCart } from '../context/cartContext.hooks';
import { CartProvider } from '../context/CartContext';
import { CartItem } from '../../../../../shared/cart';
import { PageTitle } from '@/components/ui/Typography';
import { Button } from '@/components/ui/button';
import { spacing } from '@/lib/typography';
import { useRestaurantData } from '../hooks/useRestaurantData';

const CustomerOrderPageContent: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { setRestaurant } = useRestaurant();
  const { cart, addToCart, setIsCartOpen } = useCart();
  const { restaurant: restaurantData, loading: restaurantLoading, error: restaurantError } = useRestaurantData(restaurantId);
  
  const [activeSection, setActiveSection] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

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

  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-macon-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-glass shadow-elevation-2 border-b border-neutral-100/30">
        <div className={`${spacing.page.container} ${spacing.page.padding}`}>
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-teal rounded-xl">
                <span className="text-3xl">🌱</span>
              </div>
              <PageTitle className="text-primary">
                {restaurantData?.name || 'Restaurant'}
              </PageTitle>
            </div>
            
            <Button
              variant="teal"
              size="lg"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Open cart with ${cartItemCount} items`}
              className="relative gap-2 min-w-[120px]"
            >
              <ShoppingCart className="w-5 h-5" />
              Cart
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-glow-orange">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <HeroSection restaurant={restaurantData} loading={restaurantLoading} />

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
      <main className={`${spacing.page.container} ${spacing.page.padding}`}>
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