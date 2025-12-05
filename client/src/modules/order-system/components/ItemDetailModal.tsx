import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MenuItem, Modifier } from '../../menu/types';
import { ModifierSelector } from './ModifierSelector';
import { QuantitySelector } from './QuantitySelector';
import { CartItem, CartModifier } from '../types';
import { formatPrice } from '@rebuild/shared';

// Counter for generating unique IDs (avoids Date.now() hydration issues)
let itemDetailCounter = 0;

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  onAddToCart: (cartItem: CartItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  item,
  onAddToCart 
}) => {
  const [selectedModifiers, setSelectedModifiers] = useState<CartModifier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setSelectedModifiers([]);
      setQuantity(1);
      setSpecialInstructions('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const totalPrice = (item.price + selectedModifiers.reduce((sum, mod) => sum + mod.price, 0)) * quantity;

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      id: `${item.id}-${++itemDetailCounter}`,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      imageUrl: item.image_url
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div 
        className="fixed inset-x-4 top-1/2 transform -translate-y-1/2 max-w-lg mx-auto bg-white rounded-lg shadow-xl z-50 max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-title"
      >
        <div className="flex flex-col h-full">
          {/* Header with image */}
          <div className="relative">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
            )}
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <h2 id="item-title" className="text-2xl font-semibold mb-2">
              {item.name}
            </h2>
            
            {item.description && (
              <p className="text-gray-600 mb-4">{item.description}</p>
            )}
            
            {item.calories && (
              <p className="text-sm text-gray-500 mb-4">{item.calories} calories</p>
            )}

            {/* Modifiers */}
            {item.modifiers && item.modifiers.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Customize Your Order</h3>
                <ModifierSelector
                  modifiers={item.modifiers.filter(m => m.id) as Modifier[]}
                  selectedModifiers={selectedModifiers}
                  onModifierToggle={(modifier) => {
                    setSelectedModifiers(prev => {
                      const exists = prev.find(m => m.id === modifier.id);
                      if (exists) {
                        return prev.filter(m => m.id !== modifier.id);
                      } else {
                        return [...prev, {
                          id: modifier.id,
                          name: modifier.name,
                          price: modifier.price
                        }];
                      }
                    });
                  }}
                />
              </div>
            )}

            {/* Special instructions */}
            <div className="mb-6">
              <label htmlFor="special-instructions" className="block font-semibold mb-2">
                Special Instructions
              </label>
              <textarea
                id="special-instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests?"
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-macon-orange"
                rows={3}
              />
            </div>

            {/* Quantity selector */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Quantity</h3>
              <QuantitySelector
                quantity={quantity}
                onQuantityChange={setQuantity}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6">
            <button
              onClick={handleAddToCart}
              className="w-full bg-macon-orange text-white py-3 px-4 rounded-lg font-semibold hover:bg-macon-orange-dark transition-colors duration-200"
            >
              Add to Cart - {formatPrice(totalPrice)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};