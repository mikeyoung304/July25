import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../services/monitoring/logger';

interface TokenizeResult {
  success: boolean;
  token?: string;
  error?: string;
}

export function useSquarePayment(restaurantId: string, amountInDollars: number) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializeError, setInitializeError] = useState<string | null>(null);
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);

  const paymentsRef = useRef<any>(null);
  const cardRef = useRef<any>(null);
  const applePayRef = useRef<any>(null);
  const googlePayRef = useRef<any>(null);

  // Convert amount to cents for Square API
  const amountInCents = Math.round(amountInDollars * 100);

  // Load Square Web Payments SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
    script.async = true;
    script.onload = () => initializeSquare();
    script.onerror = () => {
      setInitializeError('Failed to load payment system');
      logger.error('[useSquarePayment] Failed to load Square SDK');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (script.parentNode) {
        document.body.removeChild(script);
      }
      destroyPaymentInstances();
    };
  }, []);

  const destroyPaymentInstances = useCallback(() => {
    try {
      if (cardRef.current) {
        cardRef.current.destroy();
        cardRef.current = null;
      }
      if (applePayRef.current) {
        applePayRef.current.destroy();
        applePayRef.current = null;
      }
      if (googlePayRef.current) {
        googlePayRef.current.destroy();
        googlePayRef.current = null;
      }
    } catch (err) {
      logger.error('[useSquarePayment] Error destroying payment instances', { error: err });
    }
  }, []);

  const initializeSquare = async () => {
    try {
      // @ts-ignore - Square is loaded dynamically
      if (!window.Square) {
        throw new Error('Square SDK not loaded');
      }

      // Get Square application ID from environment
      const appId = import.meta.env.VITE_SQUARE_APP_ID;
      const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

      if (!appId || !locationId) {
        throw new Error('Square configuration missing');
      }

      // @ts-ignore
      const payments = window.Square.payments(appId, locationId);
      paymentsRef.current = payments;

      // Initialize card payment method
      try {
        const card = await payments.card();
        await card.attach('#square-card-container');
        cardRef.current = card;
      } catch (err) {
        logger.warn('[useSquarePayment] Card payment initialization failed', { error: err });
      }

      // Check for Apple Pay availability
      try {
        const applePayRequest = payments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: {
            amount: String(amountInCents),
            label: 'Total',
          },
          requestShippingContact: false,
          requestBillingContact: false,
        });

        const applePay = await payments.applePay(applePayRequest);
        const canMakePayment = await applePay.canMakePayment();

        if (canMakePayment) {
          applePayRef.current = applePay;
          setIsApplePayAvailable(true);
        }
      } catch (err) {
        logger.info('[useSquarePayment] Apple Pay not available', { error: err });
      }

      // Check for Google Pay availability
      try {
        const googlePayRequest = payments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: {
            amount: String(amountInCents),
            label: 'Total',
          },
          requestShippingContact: false,
          requestBillingContact: false,
        });

        const googlePay = await payments.googlePay(googlePayRequest);
        const canMakePayment = await googlePay.canMakePayment();

        if (canMakePayment) {
          googlePayRef.current = googlePay;
          setIsGooglePayAvailable(true);
        }
      } catch (err) {
        logger.info('[useSquarePayment] Google Pay not available', { error: err });
      }

      setIsInitialized(true);
      logger.info('[useSquarePayment] Square payments initialized', {
        applePayAvailable: isApplePayAvailable,
        googlePayAvailable: isGooglePayAvailable,
        restaurantId,
        amountInCents
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment system';
      setInitializeError(errorMessage);
      logger.error('[useSquarePayment] Initialization failed', { error: err });
    }
  };

  const tokenizeApplePay = useCallback(async (): Promise<TokenizeResult> => {
    if (!applePayRef.current) {
      return { success: false, error: 'Apple Pay not available' };
    }

    try {
      const result = await applePayRef.current.tokenize();
      if (result.status === 'OK' && result.token) {
        return { success: true, token: result.token };
      } else {
        return {
          success: false,
          error: result.errors?.[0]?.message || 'Apple Pay tokenization failed'
        };
      }
    } catch (err) {
      logger.error('[useSquarePayment] Apple Pay tokenization error', { error: err });
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Apple Pay processing failed'
      };
    }
  }, []);

  const tokenizeGooglePay = useCallback(async (): Promise<TokenizeResult> => {
    if (!googlePayRef.current) {
      return { success: false, error: 'Google Pay not available' };
    }

    try {
      const result = await googlePayRef.current.tokenize();
      if (result.status === 'OK' && result.token) {
        return { success: true, token: result.token };
      } else {
        return {
          success: false,
          error: result.errors?.[0]?.message || 'Google Pay tokenization failed'
        };
      }
    } catch (err) {
      logger.error('[useSquarePayment] Google Pay tokenization error', { error: err });
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Google Pay processing failed'
      };
    }
  }, []);

  const tokenizeCard = useCallback(async (): Promise<TokenizeResult> => {
    if (!cardRef.current) {
      return { success: false, error: 'Card payment not initialized' };
    }

    try {
      const result = await cardRef.current.tokenize();
      if (result.status === 'OK' && result.token) {
        return { success: true, token: result.token };
      } else {
        // Map common card errors to user-friendly messages
        let errorMessage = 'Card processing failed';
        if (result.errors?.length > 0) {
          const error = result.errors[0];
          switch (error.field) {
            case 'cardNumber':
              errorMessage = 'Invalid card number';
              break;
            case 'expirationDate':
              errorMessage = 'Invalid expiration date';
              break;
            case 'cvv':
              errorMessage = 'Invalid security code';
              break;
            case 'postalCode':
              errorMessage = 'Invalid postal code';
              break;
            default:
              errorMessage = error.message || errorMessage;
          }
        }
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      logger.error('[useSquarePayment] Card tokenization error', { error: err });
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Card processing failed'
      };
    }
  }, []);

  return {
    isInitialized,
    initializeError,
    isApplePayAvailable,
    isGooglePayAvailable,
    tokenizeApplePay,
    tokenizeGooglePay,
    tokenizeCard
  };
}