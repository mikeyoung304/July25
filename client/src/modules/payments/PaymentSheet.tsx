import React, { useState, useCallback, useEffect } from 'react';
import { useSquarePayment } from './useSquarePayment';
import { CreditCard, Smartphone, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { logger } from '../../services/monitoring/logger';

interface PaymentSheetProps {
  amount: number; // Amount in dollars
  onSuccess: (paymentToken: string, method: string) => void;
  onCancel: () => void;
  restaurantId: string;
}

export const PaymentSheet: React.FC<PaymentSheetProps> = ({
  amount,
  onSuccess,
  onCancel,
  restaurantId
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'apple' | 'google' | 'card' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  const {
    isInitialized,
    initializeError,
    tokenizeApplePay,
    tokenizeGooglePay,
    tokenizeCard,
    isApplePayAvailable,
    isGooglePayAvailable
  } = useSquarePayment(restaurantId, amount);

  // Auto-select available payment method
  useEffect(() => {
    if (isInitialized && !selectedMethod) {
      if (isApplePayAvailable) {
        setSelectedMethod('apple');
      } else if (isGooglePayAvailable) {
        setSelectedMethod('google');
      } else {
        setSelectedMethod('card');
      }
    }
  }, [isInitialized, isApplePayAvailable, isGooglePayAvailable, selectedMethod]);

  const handlePayment = useCallback(async () => {
    if (!selectedMethod) {
      setError('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let result;

      switch (selectedMethod) {
        case 'apple':
          result = await tokenizeApplePay();
          break;
        case 'google':
          result = await tokenizeGooglePay();
          break;
        case 'card':
          result = await tokenizeCard();
          break;
        default:
          throw new Error('Invalid payment method');
      }

      if (result.success && result.token) {
        logger.info('[PaymentSheet] Payment tokenized successfully', {
          method: selectedMethod,
          tokenLength: result.token.length
        });

        setPaymentSucceeded(true);

        // Wait a moment to show success state
        setTimeout(() => {
          onSuccess(result.token!, selectedMethod);
        }, 1000);
      } else {
        throw new Error(result.error || 'Payment tokenization failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      logger.error('[PaymentSheet] Payment failed', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMethod, tokenizeApplePay, tokenizeGooglePay, tokenizeCard, onSuccess]);

  // Handle initialization errors
  if (initializeError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Payment System Unavailable</p>
              <p className="text-xs mt-1">{initializeError}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel Order
          </button>
        </div>
      </div>
    );
  }

  // Payment succeeded state
  if (paymentSucceeded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-sm text-gray-600">
              Submitting your order...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main payment sheet UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Complete Payment
          </h2>
          <p className="text-gray-600">
            Total: ${amount.toFixed(2)}
          </p>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3 mb-6">
          {isApplePayAvailable && (
            <button
              type="button"
              onClick={() => setSelectedMethod('apple')}
              className={`w-full p-3 border rounded-lg flex items-center justify-between transition-all ${
                selectedMethod === 'apple'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={isProcessing}
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">Apple Pay</span>
              </div>
              {selectedMethod === 'apple' && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          )}

          {isGooglePayAvailable && (
            <button
              type="button"
              onClick={() => setSelectedMethod('google')}
              className={`w-full p-3 border rounded-lg flex items-center justify-between transition-all ${
                selectedMethod === 'google'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={isProcessing}
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">Google Pay</span>
              </div>
              {selectedMethod === 'google' && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedMethod('card')}
            className={`w-full p-3 border rounded-lg flex items-center justify-between transition-all ${
              selectedMethod === 'card'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            disabled={isProcessing}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">Credit or Debit Card</span>
            </div>
            {selectedMethod === 'card' && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </button>
        </div>

        {/* Card Form (only show when card is selected) */}
        {selectedMethod === 'card' && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div id="square-card-container" className="min-h-[120px]">
              {/* Square Web Payments SDK will inject the card form here */}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={!isInitialized || isProcessing || !selectedMethod}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${amount.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};