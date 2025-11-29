import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TipSelector } from './TipSelector';
import { TenderSelection } from './TenderSelection';
import { CashPayment } from './CashPayment';
import { CardPayment } from './CardPayment';
import { Button } from '@/components/ui/button';

type PaymentStep = 'tip' | 'tender' | 'cash' | 'card';

interface PaymentModalProps {
  show: boolean;
  order_id: string;
  subtotal: number;
  tax: number;
  table_id?: string;
  onClose: () => void;
  onSuccess: () => void;
  onUpdateTableStatus?: () => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  order_id,
  subtotal,
  tax,
  table_id,
  onClose,
  onSuccess,
  onUpdateTableStatus,
}) => {
  const [step, setStep] = useState<PaymentStep>('tip');
  const [tip, setTip] = useState<number>(0);

  const total = subtotal + tax + tip;

  // Simple state setters don't need useCallback - React's setState is already stable
  const handleTipChange = (tip_amount: number) => setTip(tip_amount);
  const handleContinueFromTip = () => setStep('tender');
  const handleSelectCard = () => setStep('card');
  const handleSelectCash = () => setStep('cash');
  const handleBackToTip = () => setStep('tip');
  const handleBackToTender = () => setStep('tender');

  const handlePaymentSuccess = useCallback(() => {
    // Reset modal state for next use
    setStep('tip');
    setTip(0);
    onSuccess();
  }, [onSuccess]);

  const handleClose = useCallback(() => {
    // Reset modal state
    setStep('tip');
    setTip(0);
    onClose();
  }, [onClose]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Close payment modal"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>

              {/* Step Content */}
              <div className="flex-1 overflow-auto">
                {step === 'tip' && (
                  <div className="h-full flex flex-col">
                    <TipSelector
                      subtotal={subtotal}
                      tax={tax}
                      onTipChange={handleTipChange}
                      initial_tip={tip}
                    />
                    {/* Continue Button */}
                    <div className="p-6 border-t border-gray-200">
                      <Button
                        onClick={handleContinueFromTip}
                        className="w-full h-16 text-xl font-bold bg-gradient-to-br from-[#4ECDC4] to-[#44b3ab] hover:from-[#44b3ab] hover:to-[#3a9f98]"
                      >
                        Continue to Payment
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'tender' && (
                  <TenderSelection
                    total={total}
                    onSelectCard={handleSelectCard}
                    onSelectCash={handleSelectCash}
                    onBack={handleBackToTip}
                  />
                )}

                {step === 'cash' && (
                  <CashPayment
                    orderId={order_id}
                    total={total}
                    onBack={handleBackToTender}
                    onSuccess={handlePaymentSuccess}
                    onUpdateTableStatus={onUpdateTableStatus}
                  />
                )}

                {step === 'card' && (
                  <CardPayment
                    orderId={order_id}
                    total={total}
                    onBack={handleBackToTender}
                    onSuccess={handlePaymentSuccess}
                    onUpdateTableStatus={onUpdateTableStatus}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
