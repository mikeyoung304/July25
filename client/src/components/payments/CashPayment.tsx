import React, { useState, useCallback } from 'react';
import { ArrowLeft, DollarSign, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHttpClient } from '@/services/http';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/services/logger';

interface CashPaymentProps {
  orderId: string;
  total: number;
  onBack: () => void;
  onSuccess: () => void;
  onUpdateTableStatus?: () => Promise<void>;
}

export const CashPayment: React.FC<CashPaymentProps> = ({
  orderId,
  total,
  onBack,
  onSuccess,
  onUpdateTableStatus,
}) => {
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { post } = useHttpClient();
  const { toast } = useToast();

  const change = cashReceived - total;
  const isSufficient = cashReceived >= total;

  const handleQuickAmount = useCallback((amount: number) => {
    setCashReceived(amount);
    setCustomAmount('');
  }, []);

  const handleCustomAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseFloat(value);

    // Reject values exceeding $100,000
    if (!isNaN(numValue) && numValue > 100000) {
      return;
    }

    setCustomAmount(value);

    if (!isNaN(numValue) && numValue >= 0) {
      setCashReceived(numValue);
    }
  }, []);

  const handleCompletePayment = useCallback(async () => {
    if (!isSufficient) return;

    setIsProcessing(true);
    try {
      // Call the cash payment API
      const response = await post('/api/v1/payments/cash', {
        order_id: orderId,
        amount_received: cashReceived,
        amount_due: total,
        change_given: change,
      });

      if (!response) {
        throw new Error('Failed to process cash payment');
      }

      // Update table status if handler provided
      if (onUpdateTableStatus) {
        await onUpdateTableStatus();
      }

      // Show success toast with change amount
      if (change > 0) {
        toast.success(`Payment successful! Change: $${change.toFixed(2)}`);
      } else {
        toast.success('Payment successful!');
      }

      // Call success handler
      onSuccess();
    } catch (error) {
      logger.error('Cash payment error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to process cash payment';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [orderId, cashReceived, total, change, isSufficient, post, toast, onSuccess, onUpdateTableStatus]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            disabled={isProcessing}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            aria-label="Go back to tender selection"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Cash Payment</h2>
          <div className="w-20" />
        </div>

        {/* Amount Due Display */}
        <div className="text-center py-6 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-200">
          <p className="text-sm text-gray-600 mb-1">Amount Due</p>
          <p className="text-5xl font-bold text-gray-900">
            ${total.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 gap-6 max-w-2xl mx-auto w-full">
        {/* Fast Cash Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quick Amounts
          </label>
          <div className="grid grid-cols-3 gap-4">
            {[20, 50, 100].map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                disabled={isProcessing}
                className={`h-16 rounded-lg border-2 font-bold text-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  cashReceived === amount
                    ? 'bg-green-500 text-white border-green-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
                aria-label={`Quick select $${amount}`}
                aria-pressed={cashReceived === amount}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount Input */}
        <div>
          <label htmlFor="custom-amount" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <Input
              id="custom-amount"
              type="number"
              step="0.01"
              min="0"
              max="100000"
              value={customAmount}
              onChange={handleCustomAmountChange}
              disabled={isProcessing}
              placeholder="Enter amount received"
              className="pl-10 text-lg h-14"
              aria-label="Custom cash amount received"
            />
          </div>
        </div>

        {/* Change Display */}
        {cashReceived > 0 && (
          <div className={`p-6 rounded-lg border-2 transition-all duration-300 ${
            isSufficient
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Cash Received
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ${cashReceived.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Change Due
                </p>
                <p className={`text-3xl font-bold ${
                  isSufficient ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Math.abs(change).toFixed(2)}
                </p>
              </div>
            </div>
            {!isSufficient && (
              <p className="mt-3 text-sm text-red-600 font-medium" role="alert">
                Insufficient payment - ${Math.abs(change).toFixed(2)} short
              </p>
            )}
          </div>
        )}

        {/* Complete Payment Button */}
        <Button
          onClick={handleCompletePayment}
          disabled={!isSufficient || isProcessing}
          className="h-16 text-xl font-bold bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400"
          aria-label="Complete cash payment"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <Check className="w-6 h-6 mr-2" aria-hidden="true" />
              Complete Payment
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
