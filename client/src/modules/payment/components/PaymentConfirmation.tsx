import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { CheckSummary } from '../types';

interface PaymentConfirmationProps {
  check: CheckSummary;
  tipAmount: number;
  onComplete: () => void;
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  check,
  tipAmount,
  onComplete
}) => {
  const [receiptMethod, setReceiptMethod] = useState<'none' | 'email' | 'sms'>('none');
  const [receiptDestination, setReceiptDestination] = useState('');
  const [receiptSent, setReceiptSent] = useState(false);

  const handleSendReceipt = async () => {
    if (receiptMethod === 'none' || !receiptDestination) {
      onComplete();
      return;
    }

    // Simulate sending receipt
    try {
      // In production, this would call the receipt API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReceiptSent(true);
      
      // Auto-complete after showing success
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Failed to send receipt:', error);
      onComplete();
    }
  };

  const totalPaid = check.total + tipAmount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
        >
          <CheckCircle className="w-16 h-16 text-green-500" />
        </motion.div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Thank You!
          </h1>
          <p className="text-xl text-gray-600">
            Your payment has been processed successfully
          </p>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Payment Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">${check.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">${check.tax.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tip</span>
                <span className="font-medium">${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t text-lg font-bold">
              <span>Total Paid</span>
              <span className="text-green-600">${totalPaid.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Receipt Options */}
        {!receiptSent ? (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Would you like a receipt?
            </h3>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => setReceiptMethod('none')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  receiptMethod === 'none'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="text-sm font-medium">No Receipt</span>
              </button>
              
              <button
                onClick={() => setReceiptMethod('email')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  receiptMethod === 'email'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Mail className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Email</span>
              </button>
              
              <button
                onClick={() => setReceiptMethod('sms')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  receiptMethod === 'sms'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Text</span>
              </button>
            </div>

            {receiptMethod !== 'none' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4"
              >
                <input
                  type={receiptMethod === 'email' ? 'email' : 'tel'}
                  placeholder={receiptMethod === 'email' ? 'your@email.com' : '(555) 123-4567'}
                  value={receiptDestination}
                  onChange={(e) => setReceiptDestination(e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                />
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 p-4 bg-green-50 rounded-lg text-center"
          >
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-800 font-medium">
              Receipt sent to {receiptDestination}
            </p>
          </motion.div>
        )}

        {/* Complete Button */}
        <button
          onClick={receiptSent ? onComplete : handleSendReceipt}
          className="w-full py-5 bg-primary text-white text-xl font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-lg"
        >
          {receiptSent ? 'Done' : receiptMethod === 'none' ? 'Done' : 'Send Receipt & Complete'}
        </button>

        {/* Restaurant Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Thank you for dining with us!</p>
          <p className="mt-1">Table {check.tableName} • Order #{check.orderNumber}</p>
        </div>
      </motion.div>
    </div>
  );
};