import React from 'react';
import { CreditCard, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TenderSelectionProps {
  total: number;
  onSelectCard: () => void;
  onSelectCash: () => void;
  onBack: () => void;
}

export const TenderSelection: React.FC<TenderSelectionProps> = ({
  total,
  onSelectCard,
  onSelectCash,
  onBack,
}) => {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Go back to summary"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Select Payment Method</h2>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {/* Total Amount Display */}
        <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
          <p className="text-5xl font-bold text-gray-900">
            ${total.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payment Method Buttons */}
      <div className="flex-1 flex flex-col justify-center p-8 gap-6 max-w-2xl mx-auto w-full">
        <button
          onClick={onSelectCard}
          className="group relative flex items-center justify-center gap-4 h-24 px-8 bg-gradient-to-br from-[#4ECDC4] to-[#44b3ab] text-white rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#4ECDC4]/30"
          aria-label="Pay with card"
        >
          <CreditCard className="w-10 h-10" aria-hidden="true" />
          <span className="text-3xl font-bold">Card Payment</span>
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
        </button>

        <button
          onClick={onSelectCash}
          className="group relative flex items-center justify-center gap-4 h-24 px-8 bg-gradient-to-br from-[#4CAF50] to-[#45a049] text-white rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/30"
          aria-label="Pay with cash"
        >
          <DollarSign className="w-10 h-10" aria-hidden="true" />
          <span className="text-3xl font-bold">Cash Payment</span>
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
        </button>
      </div>

      {/* Helper Text */}
      <div className="p-6 text-center text-sm text-gray-500">
        Select how the customer will pay for this check
      </div>
    </div>
  );
};
