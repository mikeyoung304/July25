import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useToast } from '@/hooks/useToast';

interface CardPaymentProps {
  orderId: string;
  total: number;
  onBack: () => void;
  onSuccess: () => void;
  onUpdateTableStatus?: () => Promise<void>;
}

declare global {
  interface Window {
    Square?: any;
  }
}

export const CardPayment: React.FC<CardPaymentProps> = ({
  orderId,
  total,
  onBack,
  onSuccess,
  onUpdateTableStatus,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSquareLoaded, setIsSquareLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [squarePayments, setSquarePayments] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const api = useApiRequest();
  const { toast } = useToast();

  // Check if we should use demo mode
  const isDemoMode = !import.meta.env.VITE_SQUARE_APP_ID ||
                     import.meta.env.VITE_SQUARE_APP_ID === 'demo' ||
                     !import.meta.env.VITE_SQUARE_LOCATION_ID ||
                     import.meta.env.NODE_ENV === 'development';

  // Load Square Web Payments SDK
  useEffect(() => {
    let loadTimeout: NodeJS.Timeout;

    // If in demo mode, skip Square SDK loading
    if (isDemoMode) {
      setIsInitializing(false);
      setIsSquareLoaded(false);
      return;
    }

    const loadSquareSDK = async () => {
      // Check if Square is already loaded
      if (window.Square) {
        await initializeSquare();
        return;
      }

      // Set a timeout to detect if script is blocked
      loadTimeout = setTimeout(() => {
        if (!window.Square) {
          console.error('Square SDK load timeout - likely blocked by browser extension');
          setError('Payment system blocked. Switching to demo mode.');
          setIsInitializing(false);
        }
      }, 5000);

      // Load Square SDK script
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = async () => {
        clearTimeout(loadTimeout);
        await initializeSquare();
      };
      script.onerror = () => {
        clearTimeout(loadTimeout);
        console.error('Failed to load Square SDK - switching to demo mode');
        setError('Payment system unavailable. Using demo mode.');
        setIsInitializing(false);
      };
      document.head.appendChild(script);
    };

    const initializeSquare = async () => {
      try {
        if (!window.Square) {
          throw new Error('Square SDK not loaded');
        }

        const payments = window.Square.payments(
          import.meta.env.VITE_SQUARE_APP_ID,
          import.meta.env.VITE_SQUARE_LOCATION_ID
        );

        setSquarePayments(payments);
        setIsSquareLoaded(true);

        // Initialize card form
        const cardForm = await payments.card();
        await cardForm.attach(cardContainerRef.current);
        setCard(cardForm);
        setIsInitializing(false);

      } catch (error) {
        console.error('Square initialization error:', error);
        setError('Payment system initialization failed');
        setIsInitializing(false);
      }
    };

    loadSquareSDK();

    // Cleanup
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      if (card) {
        card.destroy();
      }
    };
  }, [card, isDemoMode]);

  const handleSquarePayment = useCallback(async () => {
    if (!card || !squarePayments) {
      setError('Payment form not ready');
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);

      // Tokenize the card
      const result = await card.tokenize();

      if (result.status !== 'OK') {
        const errorMessage = result.errors?.[0]?.message || 'Payment failed';
        throw new Error(errorMessage);
      }

      // Process payment via API
      const response = await api.post('/api/v1/payments/create', {
        order_id: orderId,
        token: result.token,
        idempotency_key: `card-checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      if (!response || !(response as any).success) {
        throw new Error('Payment processing failed');
      }

      // Update table status if handler provided
      if (onUpdateTableStatus) {
        await onUpdateTableStatus();
      }

      toast.success('Payment successful!');
      onSuccess();

    } catch (error) {
      console.error('Card payment error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Payment processing failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [card, squarePayments, orderId, api, toast, onSuccess, onUpdateTableStatus]);

  const handleDemoPayment = useCallback(async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Process demo payment via API
      const response = await api.post('/api/v1/payments/create', {
        order_id: orderId,
        token: 'demo-nonce-' + Date.now(),
        idempotency_key: `demo-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      if (!response || !(response as any).success) {
        throw new Error('Demo payment processing failed');
      }

      // Update table status if handler provided
      if (onUpdateTableStatus) {
        await onUpdateTableStatus();
      }

      toast.success('Payment successful! (Demo Mode)');
      onSuccess();

    } catch (error) {
      console.error('Demo payment error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Demo payment failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [orderId, api, toast, onSuccess, onUpdateTableStatus]);

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
          <h2 className="text-2xl font-bold text-gray-900">Card Payment</h2>
          <div className="w-20" />
        </div>

        {/* Amount Due Display */}
        <div className="text-center py-6 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Amount Due</p>
          <p className="text-5xl font-bold text-gray-900">
            ${total.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 gap-6 max-w-2xl mx-auto w-full">
        {/* Environment Indicator */}
        {isDemoMode ? (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 flex items-center">
              <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
              Demo Mode - Payment will be simulated for testing
            </p>
          </div>
        ) : import.meta.env.VITE_SQUARE_ENVIRONMENT === 'sandbox' ? (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 flex items-center">
              <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
              Sandbox environment - Use test card 4111 1111 1111 1111
            </p>
          </div>
        ) : null}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Payment Form */}
        {isDemoMode ? (
          /* Demo Payment Button */
          <div className="flex-1 flex flex-col justify-center">
            <Button
              onClick={handleDemoPayment}
              disabled={isProcessing}
              className="h-16 text-xl font-bold bg-gradient-to-br from-[#4ECDC4] to-[#44b3ab] hover:from-[#44b3ab] hover:to-[#4ECDC4]"
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
                  <CreditCard className="w-6 h-6 mr-2" aria-hidden="true" />
                  Complete Payment - ${total.toFixed(2)} (Demo)
                </span>
              )}
            </Button>
          </div>
        ) : (
          /* Square Card Form */
          <div className="flex-1 flex flex-col">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Information
              </label>
              <div
                ref={cardContainerRef}
                className={`border border-gray-300 rounded-lg p-4 min-h-[120px] bg-white transition-opacity ${
                  isInitializing ? 'opacity-50' : 'opacity-100'
                }`}
                aria-label="Card payment form"
              />

              {/* Loading Overlay */}
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                  <div className="flex flex-col items-center">
                    <svg
                      className="animate-spin h-8 w-8 text-[#4ECDC4] mb-2"
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
                    <span className="text-sm text-gray-600">Loading secure payment form...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Process Button */}
            <Button
              onClick={handleSquarePayment}
              disabled={isProcessing || !isSquareLoaded || isInitializing}
              className="h-16 text-xl font-bold bg-gradient-to-br from-[#4ECDC4] to-[#44b3ab] hover:from-[#44b3ab] hover:to-[#4ECDC4]"
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
                  Processing payment...
                </span>
              ) : isInitializing ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-pulse mr-2 h-6 w-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/>
                  </svg>
                  Preparing secure checkout...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <CreditCard className="w-6 h-6 mr-2" aria-hidden="true" />
                  Process Payment - ${total.toFixed(2)}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Security Badge */}
        <div className="flex items-center justify-center text-sm text-gray-500 mt-4">
          <Lock className="w-4 h-4 mr-1" aria-hidden="true" />
          Secure payment powered by Square
        </div>
      </div>
    </div>
  );
};
