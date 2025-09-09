import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Check } from 'lucide-react';

interface SplitCheckFlowProps {
  session: any;
  check: any;
  onComplete: () => void;
  onCancel: () => void;
}

export const SplitCheckFlow: React.FC<SplitCheckFlowProps> = ({
  session,
  check,
  onComplete,
  onCancel
}) => {
  const [numSplits, setNumSplits] = useState(2);
  const [splitType, setSplitType] = useState<'even' | 'custom'>('even');
  const [customAmounts, setCustomAmounts] = useState<number[]>([]);
  const [completedSplits, setCompletedSplits] = useState<Set<number>>(new Set());

  const handleSplitTypeChange = (type: 'even' | 'custom') => {
    setSplitType(type);
    if (type === 'custom') {
      // Initialize custom amounts
      const baseAmount = check.total / numSplits;
      setCustomAmounts(Array(numSplits).fill(baseAmount));
    }
  };

  const handleCustomAmountChange = (index: number, value: string) => {
    const amount = parseFloat(value) || 0;
    const newAmounts = [...customAmounts];
    newAmounts[index] = amount;
    setCustomAmounts(newAmounts);
  };

  const handlePaySplit = (splitIndex: number) => {
    // In production, this would navigate to payment for this split
    // For now, simulate payment completion
    setTimeout(() => {
      setCompletedSplits(prev => new Set(prev).add(splitIndex));
      
      // Check if all splits are complete
      if (completedSplits.size + 1 === numSplits) {
        setTimeout(onComplete, 1000);
      }
    }, 2000);
  };

  const getSplitAmount = (index: number) => {
    if (splitType === 'even') {
      const baseAmount = Math.floor(check.total * 100 / numSplits) / 100;
      const remainder = Math.round((check.total * 100) % numSplits);
      return baseAmount + (index < remainder ? 0.01 : 0);
    } else {
      return customAmounts[index] || 0;
    }
  };

  const getTotalCustom = () => {
    return customAmounts.reduce((sum, amount) => sum + amount, 0);
  };

  const isValidSplit = () => {
    if (splitType === 'even') return true;
    const total = getTotalCustom();
    return Math.abs(total - check.total) < 0.01;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white p-6 text-center">
        <h1 className="text-3xl font-bold">Split Check</h1>
        <p className="text-xl mt-2">Total: ${check.total.toFixed(2)}</p>
      </div>

      {/* Split Configuration */}
      <div className="p-6 max-w-4xl mx-auto w-full">
        {/* Number of Splits */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            How many ways to split?
          </h2>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => setNumSplits(num)}
                className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                  numSplits === num
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Split Type */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Split method
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSplitTypeChange('even')}
              className={`p-4 rounded-lg border-2 transition-all ${
                splitType === 'even'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-semibold text-lg">Split Evenly</h3>
              <p className="text-gray-600 text-sm mt-1">
                Divide total equally
              </p>
            </button>
            <button
              onClick={() => handleSplitTypeChange('custom')}
              className={`p-4 rounded-lg border-2 transition-all ${
                splitType === 'custom'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-semibold text-lg">Custom Amounts</h3>
              <p className="text-gray-600 text-sm mt-1">
                Enter specific amounts
              </p>
            </button>
          </div>
        </div>

        {/* Split Cards */}
        <div className="space-y-4">
          {Array.from({ length: numSplits }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 rounded-xl border-2 ${
                completedSplits.has(index)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    completedSplits.has(index)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {completedSplits.has(index) ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Users className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Person {index + 1}
                    </h3>
                    {splitType === 'custom' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-600">$</span>
                        <input
                          type="number"
                          value={customAmounts[index]?.toFixed(2) || ''}
                          onChange={(e) => handleCustomAmountChange(index, e.target.value)}
                          className="w-24 px-2 py-1 border rounded"
                          step="0.01"
                          disabled={completedSplits.has(index)}
                        />
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-gray-800">
                        ${getSplitAmount(index).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                
                {completedSplits.has(index) ? (
                  <div className="text-green-600 font-semibold">
                    Paid ✓
                  </div>
                ) : (
                  <button
                    onClick={() => handlePaySplit(index)}
                    disabled={!isValidSplit()}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      isValidSplit()
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Pay Now
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Validation Message */}
        {splitType === 'custom' && !isValidSplit() && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              Split amounts must equal the total: ${check.total.toFixed(2)}
              <br />
              Current total: ${getTotalCustom().toFixed(2)}
            </p>
          </div>
        )}

        {/* Progress */}
        {completedSplits.size > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-800 font-medium">
                Payment Progress
              </span>
              <span className="text-blue-800">
                {completedSplits.size} of {numSplits} paid
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(completedSplits.size / numSplits) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 bg-gray-50 border-t mt-auto">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onCancel}
            className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to payment options
          </button>
        </div>
      </div>
    </div>
  );
};