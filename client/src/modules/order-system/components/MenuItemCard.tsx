import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../menu/types';
import { Minus, Plus } from 'lucide-react';
import { useUnifiedCart } from '@/contexts/cart.hooks';
import { OptimizedImage } from '@/components/shared/OptimizedImage';
import { formatPrice } from '@rebuild/shared';

interface MenuItemCardProps {
  item: MenuItem;
  onClick?: () => void;
  onQuickAdd?: (item: MenuItem) => void; // Optional: direct add handler (bypasses UnifiedCart)
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onClick: _onClick, onQuickAdd }) => {
  // Always call hook (React rules), but use onQuickAdd if provided
  const { cart, addToCart: unifiedCartAdd, removeFromCart } = useUnifiedCart();
  const [localQuantity, setLocalQuantity] = useState(0);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);

  // Calculate total quantity of this item in cart
  const cartQuantity = cart.items
    .filter(cartItem => cartItem.menuItemId === item.id)
    .reduce((sum, cartItem) => sum + cartItem.quantity, 0);

  // Sync local quantity with cart quantity
  useEffect(() => {
    if (cartQuantity > 0) {
      setLocalQuantity(cartQuantity);
      setShowQuantitySelector(true);
    } else {
      setLocalQuantity(0);
      setShowQuantitySelector(false);
    }
  }, [cartQuantity]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Use onQuickAdd if provided (VoiceOrderModal context), otherwise use UnifiedCart
    if (onQuickAdd) {
      onQuickAdd(item);
    } else {
      unifiedCartAdd({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1
      });
    }

    // Update local state
    setLocalQuantity(prev => prev + 1);
    setShowQuantitySelector(true);

    // Show feedback
    setShowAddedFeedback(true);
    setTimeout(() => setShowAddedFeedback(false), 1500);
  };

  const handleQuantityChange = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (delta > 0) {
      // Add one more item
      if (onQuickAdd) {
        onQuickAdd(item);
      } else {
        unifiedCartAdd({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1
        });
      }
    } else if (delta < 0 && localQuantity > 0) {
      // Find the cart item to remove
      const cartItem = cart.items.find(ci => ci.menuItemId === item.id);
      if (cartItem && !onQuickAdd) {
        removeFromCart(cartItem.id);
      }
      setLocalQuantity(prev => Math.max(0, prev - 1));
      if (localQuantity === 1) {
        setShowQuantitySelector(false);
      }
    }
  };

  // Check availability
  const isAvailable = item.is_available !== false;

  return (
    <div className={`h-full flex flex-col bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200 relative ${!isAvailable ? 'opacity-60' : ''}`}>
      {/* Sold Out Badge */}
      {!isAvailable && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            Sold Out
          </span>
        </div>
      )}

      {/* Added to Cart Feedback */}
      {showAddedFeedback && isAvailable && (
        <div className="absolute top-4 right-4 z-10 bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg">
          ✓ Added!
        </div>
      )}

      {/* Image Zone - Fixed aspect ratio 4:3 */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        <OptimizedImage
          src={item.image_url}
          alt={`${item.name} - ${item.category || 'menu item'}`}
          width={400}
          height={300}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Content Zone - Centered text with proper spacing */}
      <div className="flex-1 flex flex-col p-6 space-y-4">
        {/* Title - Centered, max 2 lines */}
        <h3 className="text-center text-lg font-semibold leading-tight text-gray-900 line-clamp-2 overflow-hidden">
          {item.name}
        </h3>
        
        {/* Description - Centered, max 2 lines */}
        {item.description && (
          <p className="text-center text-sm leading-relaxed text-gray-600 line-clamp-2 overflow-hidden">
            {item.description}
          </p>
        )}
        
        {/* Spacer to push price/button to bottom */}
        <div className="flex-1" />
        
        {/* Price/Button Zone - Fixed height, justified */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Price - Left aligned */}
          <div className={`text-xl font-bold ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
            {formatPrice(item.price)}
          </div>

          {/* Button/Quantity Selector - Right aligned (hidden when unavailable) */}
          {isAvailable ? (
            showQuantitySelector && localQuantity > 0 ? (
              <div className="flex items-center gap-2">
                {/* Inline Quantity Controls */}
                <div className="inline-flex items-center bg-gray-100 rounded-lg">
                  <button
                    onClick={(e) => handleQuantityChange(-1, e)}
                    className="w-11 h-11 flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-900">
                    {localQuantity}
                  </span>
                  <button
                    onClick={(e) => handleQuantityChange(1, e)}
                    className="w-11 h-11 flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {/* Compact Add More Button */}
                <button
                  onClick={handleAddToCart}
                  className="bg-teal-600 text-white font-medium text-sm py-2 px-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1"
                  aria-label="Add another to cart"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            ) : (
              /* Compact Add Button */
              <button
                onClick={handleAddToCart}
                className="bg-teal-600 text-white font-medium text-sm py-3 px-6 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
                aria-label={`Add ${item.name} to cart for ${formatPrice(item.price)}`}
              >
                <Plus className="w-4 h-4" />
                Add to Cart
              </button>
            )
          ) : (
            /* Unavailable message */
            <span className="text-sm font-medium text-gray-400">
              Currently Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
};