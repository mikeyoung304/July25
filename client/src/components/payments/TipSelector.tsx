import React, { useState, useCallback } from 'react';
import { DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TipSelectorProps {
  subtotal: number;
  tax: number;
  onTipChange: (tip_amount: number) => void;
  initial_tip?: number;
}

const TIP_PRESETS = [
  { percentage: 15, label: '15%' },
  { percentage: 18, label: '18%' },
  { percentage: 20, label: '20%' },
  { percentage: 25, label: '25%' },
];

export const TipSelector: React.FC<TipSelectorProps> = ({
  subtotal,
  tax,
  onTipChange,
  initial_tip = 0,
}) => {
  const [selected_preset, setSelectedPreset] = useState<number | null>(
    initial_tip > 0 ? null : 20
  );
  const [custom_amount, setCustomAmount] = useState<string>(
    initial_tip > 0 ? initial_tip.toFixed(2) : ''
  );
  const [is_custom, setIsCustom] = useState(initial_tip > 0);

  const calculate_tip = useCallback(
    (percentage: number) => {
      return Math.round(subtotal * (percentage / 100) * 100) / 100;
    },
    [subtotal]
  );

  const current_tip = is_custom
    ? parseFloat(custom_amount) || 0
    : selected_preset
      ? calculate_tip(selected_preset)
      : 0;

  const total = subtotal + tax + current_tip;

  const handlePresetClick = useCallback(
    (percentage: number) => {
      setIsCustom(false);
      setSelectedPreset(percentage);
      setCustomAmount('');
      onTipChange(calculate_tip(percentage));
    },
    [calculate_tip, onTipChange]
  );

  const handleNoTip = useCallback(() => {
    setIsCustom(false);
    setSelectedPreset(null);
    setCustomAmount('');
    onTipChange(0);
  }, [onTipChange]);

  const handleCustomAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCustomAmount(value);
      setIsCustom(true);
      setSelectedPreset(null);

      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onTipChange(Math.round(numValue * 100) / 100);
      } else if (value === '') {
        onTipChange(0);
      }
    },
    [onTipChange]
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Add a Tip
        </h2>

        {/* Subtotal Display */}
        <div className="text-center py-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Subtotal</p>
          <p className="text-3xl font-bold text-gray-900">
            ${subtotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 gap-6 max-w-2xl mx-auto w-full">
        {/* Tip Preset Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Tip Percentage
          </label>
          <div className="grid grid-cols-4 gap-3">
            {TIP_PRESETS.map(({ percentage, label }) => {
              const amount = calculate_tip(percentage);
              const isSelected = !is_custom && selected_preset === percentage;
              return (
                <button
                  key={percentage}
                  onClick={() => handlePresetClick(percentage)}
                  className={`h-20 rounded-xl border-2 font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-200 flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-green-500 text-white border-green-600 shadow-lg'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50'
                  }`}
                  aria-label={`Set tip to ${label}`}
                  aria-pressed={isSelected}
                >
                  <span className="text-2xl">{label}</span>
                  <span className={`text-sm ${isSelected ? 'text-green-100' : 'text-gray-500'}`}>
                    ${amount.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* No Tip Button */}
        <button
          onClick={handleNoTip}
          className={`h-14 rounded-xl border-2 font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-200 ${
            !is_custom && selected_preset === null
              ? 'bg-gray-500 text-white border-gray-600 shadow-lg'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
          aria-label="No tip"
          aria-pressed={!is_custom && selected_preset === null}
        >
          No Tip
        </button>

        {/* Custom Amount Input */}
        <div>
          <label
            htmlFor="custom-tip"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Custom Tip Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <Input
              id="custom-tip"
              type="number"
              step="0.01"
              min="0"
              value={custom_amount}
              onChange={handleCustomAmountChange}
              placeholder="Enter custom amount"
              className={`pl-10 text-lg h-14 ${
                is_custom && custom_amount
                  ? 'border-green-500 ring-2 ring-green-200'
                  : ''
              }`}
              aria-label="Custom tip amount"
            />
          </div>
        </div>

        {/* Tip Summary */}
        <div className="p-6 rounded-lg border-2 border-green-200 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700">Tax</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700">Tip</span>
            <span className="font-medium text-green-600">
              ${current_tip.toFixed(2)}
            </span>
          </div>
          <div className="border-t border-green-200 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
