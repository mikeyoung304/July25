import React, { useState, useCallback, useEffect } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { DemoModeBanner } from '@/components/ui/DemoModeBanner';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';

interface StripePaymentFormProps {
  /** Called with payment token/ID when payment succeeds */
  onPaymentNonce: (paymentId: string) => void;
  /** Total amount in dollars */
  amount: number;
  /** Whether payment is currently processing */
  isProcessing?: boolean;
  /** Order ID if available (enables Payment Intents flow) */
  orderId?: string;
}

// Initialize Stripe outside component to avoid re-loading
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> = stripePublishableKey && stripePublishableKey !== 'demo'
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null);

// Check demo mode
const isDemoMode = !stripePublishableKey ||
                   stripePublishableKey === 'demo' ||
                   import.meta.env.DEV ||
                   import.meta.env.VITE_ENVIRONMENT === 'development';

// Check if using Stripe test mode (test keys start with pk_test_)
const isStripeTestMode = stripePublishableKey?.startsWith('pk_test_') ?? false;

/**
 * Inner payment form component (must be inside Elements provider)
 */
const PaymentFormInner: React.FC<{
  onPaymentNonce: (paymentId: string) => void;
  amount: number;
  isProcessing?: boolean;
}> = ({ onPaymentNonce, amount, isProcessing = false }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Payment system not ready');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-complete`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        onPaymentNonce(paymentIntent.id);
      } else if (paymentIntent?.status === 'requires_action') {
        setError('Additional verification required');
      } else {
        setError(`Payment status: ${paymentIntent?.status}`);
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing error');
    } finally {
      setProcessing(false);
    }
  }, [stripe, elements, onPaymentNonce]);

  const isSubmitting = processing || isProcessing;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-4 w-full max-w-full overflow-hidden">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {isStripeTestMode && (
        <p className="demo-hint text-sm text-gray-500 mb-4">
          Test mode: Use card 4242 4242 4242 4242, any future date, any 3-digit CVC
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        aria-label={isSubmitting ? 'Processing payment...' : `Pay $${amount.toFixed(2)}`}
        aria-busy={isSubmitting}
        aria-disabled={!stripe || !elements || isSubmitting}
        className="w-full py-3 px-4 bg-gradient-to-r from-macon-teal to-macon-teal-dark text-white font-medium rounded-lg hover:from-macon-teal-dark hover:to-macon-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-teal disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing payment...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Complete Order - ${amount.toFixed(2)}
          </span>
        )}
      </button>

      <div className="flex items-center justify-center text-sm text-gray-500">
        <Lock className="w-4 h-4 mr-1" />
        Secure payment powered by Stripe
      </div>
    </form>
  );
};

/**
 * Demo payment form for development/testing
 */
const DemoPaymentForm: React.FC<{
  onPaymentNonce: (paymentId: string) => void;
  amount: number;
  isProcessing?: boolean;
}> = ({ onPaymentNonce, amount, isProcessing = false }) => {
  const [processing, setProcessing] = useState(false);

  const handleDemoPayment = useCallback(() => {
    setProcessing(true);
    // Simulate payment processing delay
    setTimeout(() => {
      // Return a demo token that the backend will recognize
      // Include random suffix to prevent race conditions if multiple payments occur in same millisecond
      const randomSuffix = Math.random().toString(36).substring(2, 11);
      onPaymentNonce(`demo-nonce-${Date.now()}-${randomSuffix}`);
      setProcessing(false);
    }, 1500);
  }, [onPaymentNonce]);

  const isSubmitting = processing || isProcessing;

  return (
    <div className="space-y-4">
      <DemoModeBanner className="mb-4" />

      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="text-sm text-gray-600 mb-2">Test Card (Demo)</div>
        <div className="font-mono text-lg">4242 4242 4242 4242</div>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>12/25</span>
          <span>123</span>
        </div>
        <p className="demo-hint text-xs text-gray-400 mt-2">
          Any future expiry date and any 3-digit CVC will work
        </p>
      </div>

      <button
        type="button"
        onClick={handleDemoPayment}
        disabled={isSubmitting}
        aria-label={isSubmitting ? 'Processing payment...' : `Pay $${amount.toFixed(2)} (Demo)`}
        aria-busy={isSubmitting}
        aria-disabled={isSubmitting}
        className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Complete Order - $${amount.toFixed(2)} (Demo)`
        )}
      </button>

      <div className="flex items-center justify-center text-sm text-gray-500">
        <Lock className="w-4 h-4 mr-1" />
        Secure demo payment
      </div>
    </div>
  );
};

/**
 * Stripe Payment Form Component
 *
 * Handles both real Stripe payments and demo mode.
 * Compatible with the old SquarePaymentForm props API.
 */
export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  onPaymentNonce,
  amount,
  isProcessing = false,
  orderId,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch client secret if we have an orderId
  useEffect(() => {
    if (isDemoMode || !orderId) {
      return;
    }

    const fetchClientSecret = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/v1/payments/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Flow': 'online',
          },
          body: JSON.stringify({ order_id: orderId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment');
        }

        if (data.isDemoMode) {
          return; // Fall back to demo mode
        }

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    fetchClientSecret();
  }, [orderId]);

  // Demo mode
  if (isDemoMode) {
    return (
      <DemoPaymentForm
        onPaymentNonce={onPaymentNonce}
        amount={amount}
        isProcessing={isProcessing}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="animate-spin h-8 w-8 text-macon-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2 text-gray-600">Loading payment form...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-sm text-red-800">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-600 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  // Stripe Elements with client secret
  if (clientSecret && stripePromise) {
    const options: StripeElementsOptions = {
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#0f766e',
        },
      },
    };

    return (
      <Elements stripe={stripePromise} options={options}>
        <PaymentFormInner
          onPaymentNonce={onPaymentNonce}
          amount={amount}
          isProcessing={isProcessing}
        />
      </Elements>
    );
  }

  // Default to demo mode if no client secret
  return (
    <DemoPaymentForm
      onPaymentNonce={onPaymentNonce}
      amount={amount}
      isProcessing={isProcessing}
    />
  );
};

// Backwards compatibility export
export { StripePaymentForm as SquarePaymentForm };
