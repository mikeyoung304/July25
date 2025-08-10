import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { CartItem as CartItemType } from '../types';

interface CartItemProps {
  item: CartItemType;
  onUpdate: (updates: Partial<CartItemType>) => void;
  onRemove: () => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, onUpdate, onRemove }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const itemTotal = (item.price + (item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0)) * item.quantity;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    onUpdate({ quantity: newQuantity });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start space-x-3">
        {item.image_url && (
          <img 
            src={item.image_url} 
            alt={item.name}
            className="w-16 h-16 rounded-md object-cover"
          />
        )}
        
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{item.name}</h4>
          
          {item.modifiers && item.modifiers.length > 0 && (
            <div className="mt-1">
              {item.modifiers.map((modifier) => (
                <p key={modifier.id} className="text-sm text-gray-600">
                  + {modifier.name} ({formatPrice(modifier.price)})
                </p>
              ))}
            </div>
          )}
          
          {item.special_instructions && (
            <p className="text-sm text-gray-500 italic mt-1">
              Note: {item.special_instructions}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className="font-medium min-w-[2rem] text-center">
                {item.quantity}
              </span>
              
              <button
                onClick={() => handleQuantityChange(1)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-gray-900">
                {formatPrice(itemTotal)}
              </span>
              
              <button
                onClick={onRemove}
                className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                aria-label="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};