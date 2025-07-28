import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({ 
  quantity, 
  onQuantityChange,
  min = 1,
  max = 99
}) => {
  const handleDecrease = () => {
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div className="inline-flex items-center border border-gray-300 rounded-lg">
      <button
        onClick={handleDecrease}
        disabled={quantity <= min}
        className={`p-3 transition-colors duration-200 ${
          quantity <= min
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Decrease quantity"
      >
        <Minus className="w-5 h-5" />
      </button>
      
      <div className="px-6 py-2 min-w-[4rem] text-center">
        <span className="text-lg font-semibold">{quantity}</span>
      </div>
      
      <button
        onClick={handleIncrease}
        disabled={quantity >= max}
        className={`p-3 transition-colors duration-200 ${
          quantity >= max
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Increase quantity"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};