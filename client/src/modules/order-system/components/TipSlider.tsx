import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DollarSign } from 'lucide-react';

interface TipSliderProps {
  subtotal: number;
  onTipChange: (tip: number) => void;
  initialTip?: number;
}

export const TipSlider: React.FC<TipSliderProps> = ({ subtotal, onTipChange, initialTip = 0 }) => {
  const [tipPercentage, setTipPercentage] = useState(18);
  const [customTip, setCustomTip] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tipOptions = useMemo(() => [
    { percentage: 15, label: '15%' },
    { percentage: 18, label: '18%' },
    { percentage: 20, label: '20%' },
    { percentage: 25, label: '25%' }
  ], []);

  const calculateTip = useCallback((percentage: number) => {
    return Math.round(subtotal * (percentage / 100) * 100) / 100;
  }, [subtotal]);

  useEffect(() => {
    if (initialTip > 0 && subtotal > 0) {
      const percentage = Math.round((initialTip / subtotal) * 100);
      if (tipOptions.some(opt => opt.percentage === percentage)) {
        setTipPercentage(percentage);
        setIsCustom(false);
      } else {
        setIsCustom(true);
        setCustomTip(initialTip.toFixed(2));
      }
    }
  }, [initialTip, subtotal, tipOptions]);

  useEffect(() => {
    if (!isCustom && subtotal > 0) {
      // Debounce tip changes to prevent glitching
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        onTipChange(calculateTip(tipPercentage));
      }, 100);
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipPercentage, subtotal, isCustom]);

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    const numValue = parseFloat(value);
    
    // Debounce custom tip changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (!isNaN(numValue) && numValue >= 0) {
        onTipChange(Math.round(numValue * 100) / 100);
      } else if (value === '' || numValue === 0) {
        onTipChange(0);
      }
    }, 300);
  };

  const handlePresetClick = (percentage: number) => {
    setIsCustom(false);
    setTipPercentage(percentage);
    setCustomTip('');
  };

  const tipAmount = isCustom ? parseFloat(customTip) || 0 : calculateTip(tipPercentage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Add a tip</h3>
        <div className="flex items-center text-lg font-semibold text-green-600">
          <DollarSign className="w-5 h-5" />
          <span>{tipAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Preset Options */}
      <div className="grid grid-cols-4 gap-2">
        {tipOptions.map((option) => (
          <button
            key={option.percentage}
            onClick={() => handlePresetClick(option.percentage)}
            className={`py-2 px-3 rounded-lg font-medium transition-colors ${
              !isCustom && tipPercentage === option.percentage
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={`Set tip to ${option.label}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Custom Tip Input */}
      <div className="relative">
        <label htmlFor="custom-tip" className="sr-only">
          Custom tip amount
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="custom-tip"
            type="number"
            value={customTip}
            onChange={(e) => {
              setIsCustom(true);
              handleCustomTipChange(e.target.value);
            }}
            placeholder="Custom amount"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Tip Summary */}
      <div className="text-sm text-gray-600">
        {isCustom ? (
          <span>Custom tip amount</span>
        ) : (
          <span>{tipPercentage}% of ${subtotal.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
};