import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomerCheckView } from './CustomerCheckView';
import { TipSelector } from './TipSelector';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { PaymentProcessing } from './PaymentProcessing';
import { PaymentConfirmation } from './PaymentConfirmation';
import { SplitCheckFlow } from './SplitCheckFlow';
import { useTablePayment } from '../hooks/useTablePayment';
import { CheckSummary } from '../types';

interface TableCheckPresenterProps {
  tableId: string;
  onComplete: () => void;
  onCancel: () => void;
}

type PaymentStep = 
  | 'check-review' 
  | 'tip-selection' 
  | 'payment-method' 
  | 'processing' 
  | 'confirmation'
  | 'split-check';

export const TableCheckPresenter: React.FC<TableCheckPresenterProps> = ({
  tableId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('check-review');
  const [tipAmount, setTipAmount] = useState(0);
  const [splitSession, setSplitSession] = useState<any>(null);
  
  const {
    check,
    isLoading,
    error,
    presentCheck,
    calculateWithTip,
    processPayment,
    createSplitSession
  } = useTablePayment(tableId);

  useEffect(() => {
    // Present check when component mounts
    presentCheck();
  }, []);

  const handleContinueFromCheck = () => {
    setCurrentStep('tip-selection');
  };

  const handleTipSelected = async (tip: number) => {
    setTipAmount(tip);
    await calculateWithTip(tip);
    setCurrentStep('payment-method');
  };

  const handlePaymentMethodSelected = async (method: any) => {
    if (method.type === 'SPLIT') {
      const session = await createSplitSession(2); // Default to 2-way split
      setSplitSession(session);
      setCurrentStep('split-check');
    } else {
      setCurrentStep('processing');
      try {
        await processPayment(method);
        setCurrentStep('confirmation');
      } catch (error) {
        console.error('Payment failed:', error);
        setCurrentStep('payment-method');
      }
    }
  };

  const handleSplitComplete = () => {
    setCurrentStep('confirmation');
  };

  const handleConfirmationComplete = () => {
    onComplete();
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'tip-selection':
        setCurrentStep('check-review');
        break;
      case 'payment-method':
        setCurrentStep('tip-selection');
        break;
      case 'split-check':
        setCurrentStep('payment-method');
        break;
      default:
        break;
    }
  };

  if (isLoading && !check) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading check...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Check</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {currentStep === 'check-review' && check && (
            <CustomerCheckView
              check={check}
              onContinue={handleContinueFromCheck}
              onCancel={onCancel}
            />
          )}

          {currentStep === 'tip-selection' && check && (
            <TipSelector
              subtotal={check.subtotal}
              currentTip={tipAmount}
              onTipSelected={handleTipSelected}
              onBack={handleBack}
            />
          )}

          {currentStep === 'payment-method' && check && (
            <PaymentMethodPicker
              total={check.total + tipAmount}
              onMethodSelected={handlePaymentMethodSelected}
              onBack={handleBack}
            />
          )}

          {currentStep === 'processing' && (
            <PaymentProcessing />
          )}

          {currentStep === 'confirmation' && check && (
            <PaymentConfirmation
              check={check}
              tipAmount={tipAmount}
              onComplete={handleConfirmationComplete}
            />
          )}

          {currentStep === 'split-check' && splitSession && check && (
            <SplitCheckFlow
              session={splitSession}
              check={check}
              onComplete={handleSplitComplete}
              onCancel={() => setCurrentStep('payment-method')}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Back button overlay for server */}
      {currentStep !== 'processing' && currentStep !== 'confirmation' && (
        <div className="fixed bottom-4 left-4 z-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm opacity-50 hover:opacity-100 transition-opacity"
          >
            Server: Cancel Payment
          </button>
        </div>
      )}
    </div>
  );
};