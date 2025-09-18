import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Keyboard, DollarSign, Users } from 'lucide-react';
import type { PaymentMethod } from '../types';

interface PaymentMethodPickerProps {
  total?: number;
  totalAmount?: number; // Legacy prop during migration
  onMethodSelected: (method: PaymentMethod) => void;
  onBack: () => void;
  isProcessing?: boolean;
}

export const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = (props) => {
  const {
    total: totalProp,
    totalAmount,
    onMethodSelected,
    onBack,
    isProcessing = false
  } = props;

  const total = typeof totalProp === 'number'
    ? totalProp
    : typeof totalAmount === 'number'
      ? totalAmount
      : 0;

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    zip: ''
  });

  const hasSquareTerminal = !!import.meta.env.VITE_SQUARE_TERMINAL_ID;
  const supportsDigitalWallet = 'PaymentRequest' in window;

  const handleTerminalPayment = () => {
    if (isProcessing) return;
    onMethodSelected({
      type: 'SQUARE_TERMINAL',
      deviceId: import.meta.env.VITE_SQUARE_TERMINAL_ID
    });
  };

  const handleDigitalWallet = async () => {
    if (isProcessing) return;
    // This would integrate with Apple Pay/Google Pay
    onMethodSelected({
      type: 'DIGITAL_WALLET'
    });
  };

  const handleManualEntry = () => {
    if (isProcessing) return;
    setShowManualEntry(true);
  };

  const handleManualSubmit = () => {
    // In production, this would tokenize the card with Square Web SDK
    onMethodSelected({
      type: 'MANUAL_ENTRY',
      token: 'demo-token', // Would be real token from Square
      cardDetails: {
        last4: cardDetails.number.slice(-4)
      }
    });
  };

  const handleCashPayment = () => {
    if (isProcessing) return;
    onMethodSelected({
      type: 'CASH'
    });
  };

  const handleSplitPayment = () => {
    if (isProcessing) return;
    onMethodSelected({
      type: 'SPLIT'
    });
  };

  if (showManualEntry) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="bg-primary text-white p-6 text-center">
          <h1 className="text-3xl font-bold">Enter Card Details</h1>
          <p className="text-lg mt-2 opacity-90">Total Due: ${total.toFixed(2)}</p>
        </div>

        <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.number}
                onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing ZIP Code
              </label>
              <input
                type="text"
                placeholder="12345"
                value={cardDetails.zip}
                onChange={(e) => setCardDetails({...cardDetails, zip: e.target.value})}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                maxLength={5}
              />
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center">
              <span className="mr-2">🔒</span>
              Your payment information is encrypted and secure
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t">
          <div className="max-w-2xl mx-auto space-y-3">
            <button
              onClick={handleManualSubmit}
              disabled={isProcessing}
              className="w-full py-5 bg-primary text-white text-xl font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-lg"
            >
              Pay ${total.toFixed(2)}
            </button>
            <button
              onClick={() => setShowManualEntry(false)}
              className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to payment options
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white p-6 text-center">
        <h1 className="text-3xl font-bold">Payment Method</h1>
        <p className="text-2xl mt-2 font-semibold">Total Due: ${total.toFixed(2)}</p>
      </div>

      {/* Payment Options */}
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {hasSquareTerminal && (
            <motion.button
              disabled={isProcessing}
              onClick={handleTerminalPayment}
              className="w-full p-6 bg-white border-2 border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Tap, Insert or Swipe Card
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Use the Square Reader below
                  </p>
                </div>
              </div>
            </motion.button>
          )}

          {supportsDigitalWallet && (
            <motion.button
              disabled={isProcessing}
              onClick={handleDigitalWallet}
              className="w-full p-6 bg-white border-2 border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Smartphone className="w-8 h-8 text-primary" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Apple Pay / Google Pay
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Tap your phone or watch
                  </p>
                </div>
              </div>
            </motion.button>
          )}

          <motion.button
            disabled={isProcessing}
            onClick={handleManualEntry}
            className="w-full p-6 bg-white border-2 border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Keyboard className="w-8 h-8 text-primary" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-xl font-semibold text-gray-800">
                  Enter Card Details
                </h3>
                <p className="text-gray-600 mt-1">
                  Type card information manually
                </p>
              </div>
            </div>
          </motion.button>

          <motion.button
            disabled={isProcessing}
            onClick={handleCashPayment}
            className="w-full p-6 bg-white border-2 border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-xl font-semibold text-gray-800">
                  Pay with Cash
                </h3>
                <p className="text-gray-600 mt-1">
                  Server will collect payment
                </p>
              </div>
            </div>
          </motion.button>

          <div className="pt-4 border-t">
            <motion.button
              disabled={isProcessing}
              onClick={handleSplitPayment}
              className="w-full p-6 bg-gray-50 border-2 border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Users className="w-8 h-8 text-gray-700" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Split Check
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Divide payment among multiple people
                  </p>
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="p-6 bg-gray-50 border-t">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to tip selection
          </button>
        </div>
      </div>
    </div>
  );
};
