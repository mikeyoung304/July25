import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TipSelectorProps {
  subtotal: number;
  currentTip: number;
  onTipSelected: (tipAmount: number) => void;
  onBack: () => void;
}

export const TipSelector: React.FC<TipSelectorProps> = ({
  subtotal,
  currentTip,
  onTipSelected,
  onBack
}) => {
  const [selectedOption, setSelectedOption] = useState<'preset' | 'custom' | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const tipPercentages = [
    { percentage: 18, label: '18%' },
    { percentage: 20, label: '20%', recommended: true },
    { percentage: 22, label: '22%' }
  ];

  const handlePresetTip = (percentage: number) => {
    const tipAmount = (subtotal * percentage) / 100;
    setSelectedPreset(percentage);
    setSelectedOption('preset');
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setCustomAmount(value);
      setSelectedOption('custom');
      setSelectedPreset(null);
    }
  };

  const handleContinue = () => {
    let tipAmount = 0;
    
    if (selectedOption === 'preset' && selectedPreset !== null) {
      tipAmount = (subtotal * selectedPreset) / 100;
    } else if (selectedOption === 'custom' && customAmount) {
      tipAmount = parseFloat(customAmount);
    }
    
    onTipSelected(tipAmount);
  };

  const handleNoTip = () => {
    onTipSelected(0);
  };

  const getTotalWithTip = () => {
    let tip = 0;
    if (selectedOption === 'preset' && selectedPreset !== null) {
      tip = (subtotal * selectedPreset) / 100;
    } else if (selectedOption === 'custom' && customAmount) {
      tip = parseFloat(customAmount) || 0;
    }
    return (subtotal * 1.08 + tip); // Including 8% tax
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white p-6 text-center">
        <h1 className="text-3xl font-bold">Add a Tip?</h1>
        <p className="text-lg mt-2 opacity-90">Thank you for your service</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        {/* Preset Options */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Select tip amount
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {tipPercentages.map((option) => (
              <motion.button
                key={option.percentage}
                onClick={() => handlePresetTip(option.percentage)}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  selectedPreset === option.percentage
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {option.recommended && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Recommended
                  </span>
                )}
                <div className="text-2xl font-bold text-gray-800">
                  {option.label}
                </div>
                <div className="text-lg text-gray-600 mt-1">
                  ${((subtotal * option.percentage) / 100).toFixed(2)}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Or enter custom amount
          </h2>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl text-gray-600">
              $
            </span>
            <input
              type="text"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder="0.00"
              className={`w-full pl-10 pr-4 py-4 text-2xl border-2 rounded-xl ${
                selectedOption === 'custom'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300'
              } focus:outline-none focus:border-primary`}
            />
          </div>
        </div>

        {/* Total Preview */}
        <div className="bg-gray-100 rounded-xl p-6">
          <div className="flex justify-between items-center text-2xl font-bold">
            <span>Total with tip:</span>
            <span className="text-primary">
              ${getTotalWithTip().toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 bg-gray-50 border-t">
        <div className="max-w-2xl mx-auto space-y-3">
          <button
            onClick={handleContinue}
            disabled={!selectedOption}
            className={`w-full py-5 text-xl font-semibold rounded-xl transition-all shadow-lg ${
              selectedOption
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue to Payment
          </button>
          
          <button
            onClick={handleNoTip}
            className="w-full py-4 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Continue without tip
          </button>
          
          <button
            onClick={onBack}
            className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            ← Back to check
          </button>
        </div>
      </div>
    </div>
  );
};