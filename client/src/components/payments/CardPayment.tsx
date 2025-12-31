import React, { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHttpClient } from '@/services/http';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/services/logger';
import {
  PaymentStateMachine,
  PaymentState,
  PaymentEvent,
} from '@/services/payments/PaymentStateMachine';
import { StripePaymentForm } from '@/modules/order-system/components/StripePaymentForm';

interface CardPaymentProps {
  orderId: string;
  total: number;
  onBack: () => void;
  onSuccess: () => void;
  onUpdateTableStatus?: () => Promise<void>;
}

export const CardPayment: React.FC<CardPaymentProps> = ({
  orderId,
  total,
  onBack,
  onSuccess,
  onUpdateTableStatus,
}) => {
  // ✅ PHASE 3: Replace boolean flags with PaymentStateMachine
  const fsm = useMemo(() => new PaymentStateMachine({ debug: true }), []);
  const [currentState, setCurrentState] = useState<PaymentState>(fsm.getState());
  const [error, setError] = useState<string | null>(null);
  const { post } = useHttpClient();
  const { toast } = useToast();

  // Transition helper
  const transition = useCallback((event: PaymentEvent, metadata?: Record<string, any>) => {
    try {
      const newState = fsm.transition(event, metadata);
      setCurrentState(newState);
      return newState;
    } catch (err) {
      logger.error('[CardPayment] Invalid transition', { event, currentState, err });
      return currentState;
    }
  }, [fsm, currentState]);

  // Check if we should use demo mode
  const isDemoMode = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
                     import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'demo' ||
                     import.meta.env.NODE_ENV === 'development';

  // Check if using test environment
  const isTestEnvironment = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_');

  // ✅ PHASE 3: Handle Stripe payment with FSM
  const handleStripePayment = useCallback(async (paymentId: string) => {
    try {
      setError(null);
      transition(PaymentEvent.TOKENIZATION_STARTED);
      transition(PaymentEvent.TOKENIZATION_COMPLETE, { token: paymentId });
      transition(PaymentEvent.CARD_PROCESSING_STARTED);

      // Process payment via API
      const response = await post('/api/v1/payments/create-payment-intent', {
        order_id: orderId,
        token: paymentId,
        idempotency_key: `card-checkout-${orderId}-${crypto.randomUUID()}`,
      });

      if (!response || !(response as any).success) {
        throw new Error('Payment processing failed');
      }

      transition(PaymentEvent.PAYMENT_CAPTURED, { paymentId: (response as any).payment?.id });
      transition(PaymentEvent.ORDER_COMPLETION_STARTED);

      // Update table status if handler provided
      if (onUpdateTableStatus) {
        await onUpdateTableStatus();
      }

      transition(PaymentEvent.PAYMENT_COMPLETE);
      toast.success('Payment successful!');
      onSuccess();

    } catch (error) {
      logger.error('Card payment error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Payment processing failed';
      setError(errorMessage);
      transition(PaymentEvent.ERROR_OCCURRED, { error: errorMessage });
      toast.error(errorMessage);
    }
  }, [orderId, post, toast, onSuccess, onUpdateTableStatus, transition]);

  // ✅ PHASE 3: Handle demo payment with FSM
  const handleDemoPayment = useCallback(async (paymentId: string) => {
    try {
      setError(null);
      transition(PaymentEvent.DEMO_PAYMENT_REQUESTED);
      transition(PaymentEvent.DEMO_PROCESSING_STARTED);

      // Process demo payment via API
      const response = await post('/api/v1/payments/create-payment-intent', {
        order_id: orderId,
        token: paymentId,
        idempotency_key: `demo-card-${orderId}-${crypto.randomUUID()}`,
      });

      if (!response || !(response as any).success) {
        throw new Error('Demo payment processing failed');
      }

      transition(PaymentEvent.PAYMENT_CAPTURED, { mode: 'demo' });
      transition(PaymentEvent.ORDER_COMPLETION_STARTED);

      // Update table status if handler provided
      if (onUpdateTableStatus) {
        await onUpdateTableStatus();
      }

      transition(PaymentEvent.PAYMENT_COMPLETE);
      toast.success('Payment successful! (Demo Mode)');
      onSuccess();

    } catch (error) {
      logger.error('Demo payment error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Demo payment failed';
      setError(errorMessage);
      transition(PaymentEvent.ERROR_OCCURRED, { error: errorMessage, mode: 'demo' });
      toast.error(errorMessage);
    }
  }, [orderId, post, toast, onSuccess, onUpdateTableStatus, transition]);

  // Single handler that delegates to appropriate payment flow
  const handlePaymentNonce = useCallback((paymentId: string) => {
    if (isDemoMode) {
      handleDemoPayment(paymentId);
    } else {
      handleStripePayment(paymentId);
    }
  }, [isDemoMode, handleDemoPayment, handleStripePayment]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            disabled={fsm.isProcessing()}
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
        ) : isTestEnvironment ? (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 flex items-center">
              <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
              Test environment - Use test card 4242 4242 4242 4242
            </p>
          </div>
        ) : null}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Payment Form - Delegated to StripePaymentForm */}
        <div className="flex-1 flex flex-col">
          <StripePaymentForm
            orderId={orderId}
            amount={total}
            onPaymentNonce={handlePaymentNonce}
            isProcessing={fsm.isProcessing()}
          />
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center text-sm text-gray-500 mt-4">
          <Lock className="w-4 h-4 mr-1" aria-hidden="true" />
          Secure payment powered by Stripe
        </div>
      </div>
    </div>
  );
};
