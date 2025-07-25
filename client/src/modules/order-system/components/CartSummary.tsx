import React from 'react';

interface CartSummaryProps {
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
}

export const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, tax, tip, total }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Subtotal</span>
        <span className="font-medium">{formatPrice(subtotal)}</span>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Tax</span>
        <span className="font-medium">{formatPrice(tax)}</span>
      </div>
      
      {tip !== undefined && tip > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tip</span>
          <span className="font-medium">{formatPrice(tip)}</span>
        </div>
      )}
      
      <div className="border-t pt-2">
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="text-macon-orange">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
};