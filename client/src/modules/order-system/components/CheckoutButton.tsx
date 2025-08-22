import React from 'react';
import { CreditCard } from 'lucide-react';

interface CheckoutButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const CheckoutButton: React.FC<CheckoutButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center space-x-2 ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
      }`}
      aria-label="Proceed to checkout"
    >
      <CreditCard className="w-5 h-5" />
      <span>Proceed to Checkout</span>
    </button>
  );
};