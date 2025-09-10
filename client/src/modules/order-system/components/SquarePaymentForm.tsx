import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { logger } from '../../../services/monitoring/logger';

interface SquarePaymentFormProps {
  onPaymentNonce: (nonce: string) => void;
  amount: number;
  isProcessing?: boolean;
}

declare global {
  interface Window {
    Square?: any;
  }
}

export const SquarePaymentForm: React.FC<SquarePaymentFormProps> = ({ 
  onPaymentNonce, 
  amount,
  isProcessing = false 
}) => {
  const [isSquareLoaded, setIsSquareLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [squarePayments, setSquarePayments] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [useTestCard, setUseTestCard] = useState(false);

  // Check if we should use demo mode
  const isDemoMode = !import.meta.env.VITE_SQUARE_APP_ID || 
                     import.meta.env.VITE_SQUARE_APP_ID === 'demo' ||
                     !import.meta.env.VITE_SQUARE_LOCATION_ID ||
                     import.meta.env.NODE_ENV === 'development';

  // Load Square Web Payments SDK (skip in demo mode)
  useEffect(() => {
    let loadTimeout: NodeJS.Timeout;
    
    // If in demo mode, skip Square SDK loading
    if (isDemoMode) {
      logger.info('Demo mode detected - skipping Square SDK loading');
      setIsInitializing(false);
      setIsSquareLoaded(false); // Don't load Square in demo mode
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
          setErrors({ 
            general: 'Payment system blocked. Switching to demo mode.',
            blocked: 'true'
          });
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
        setErrors({ 
          general: 'Payment system unavailable. Using demo mode.',
          blocked: 'true'
        });
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
        setErrors({ general: 'Payment system initialization failed' });
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
      setErrors({ general: 'Payment form not ready' });
      return;
    }

    try {
      setErrors({});
      
      const result = await card.tokenize();
      
      if (result.status === 'OK') {
        onPaymentNonce(result.token);
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Payment failed';
        setErrors({ general: errorMessage });
      }
    } catch (error) {
      console.error('Tokenization error:', error);
      setErrors({ general: 'Payment processing failed' });
    }
  }, [card, squarePayments, onPaymentNonce]);

  const handleTestCardPayment = useCallback(() => {
    // Use Square test card nonce for sandbox testing
    onPaymentNonce('cnon:card-nonce-ok');
  }, [onPaymentNonce]);

  const handleDemoPayment = useCallback(() => {
    // Use demo nonce for demo mode
    onPaymentNonce('demo-nonce-' + Date.now());
  }, [onPaymentNonce]);

  return (
    <div className="space-y-4">
      {/* Environment indicator */}
      {isDemoMode ? (
        <div className="bg-green-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-green-800 flex items-center">
            <Lock className="w-4 h-4 mr-2" />
            Demo Mode - Payment will be simulated for testing
          </p>
        </div>
      ) : import.meta.env.VITE_SQUARE_ENVIRONMENT === 'sandbox' ? (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-blue-800 flex items-center">
            <Lock className="w-4 h-4 mr-2" />
            Sandbox environment - Use test card 4111 1111 1111 1111
          </p>
        </div>
      ) : null}

      {/* Error Display */}
      {errors.general && (
        <div className="bg-red-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-red-800">{errors.general}</p>
        </div>
      )}

      {/* Test Card Toggle for Sandbox */}
      {!isDemoMode && import.meta.env.VITE_SQUARE_ENVIRONMENT === 'sandbox' && (
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={useTestCard}
              onChange={(e) => setUseTestCard(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Use test card (skip form entry)</span>
          </label>
        </div>
      )}

      {isDemoMode ? (
        /* Demo Payment Button */
        <button
          type="button"
          onClick={handleDemoPayment}
          disabled={isProcessing}
          className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Complete Order - ${amount.toFixed(2)} (Demo)`
          )}
        </button>
      ) : useTestCard ? (
        /* Test Card Button */
        <button
          type="button"
          onClick={handleTestCardPayment}
          disabled={isProcessing}
          className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${amount.toFixed(2)} (Test)`
          )}
        </button>
      ) : (
        <div>
          {/* Square Card Form Container with Loading State */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Information
            </label>
            <div
              ref={cardContainerRef}
              className={`border border-gray-300 rounded-lg p-4 min-h-[120px] bg-white transition-opacity ${
                isInitializing ? 'opacity-50' : 'opacity-100'
              }`}
            />
            
            {/* Loading Overlay */}
            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg mt-7">
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-8 w-8 text-macon-teal mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-gray-600">Loading secure payment form...</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSquarePayment}
            disabled={isProcessing || !isSquareLoaded || isInitializing}
            className="w-full py-3 px-4 bg-gradient-to-r from-macon-teal to-macon-teal-dark text-white font-medium rounded-lg hover:from-macon-teal-dark hover:to-macon-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-teal disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing payment...
              </span>
            ) : isInitializing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-pulse mr-2 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/>
                </svg>
                Preparing secure checkout...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Complete Order - ${amount.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center text-sm text-gray-500">
        <Lock className="w-4 h-4 mr-1" />
        Secure payment powered by Square
      </div>
    </div>
  );
};