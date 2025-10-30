import React, { useState, useCallback, useMemo } from 'react';
import { X, Receipt } from 'lucide-react';
import { TenderSelection } from '@/components/payments/TenderSelection';
import { CashPayment } from '@/components/payments/CashPayment';
import { CardPayment } from '@/components/payments/CardPayment';

type CheckStep = 'summary' | 'tender' | 'cash' | 'card';

interface Order {
  id: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    modifiers?: Array<{
      name: string;
      price: number;
    }>;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
}

interface CheckClosingScreenProps {
  tableId: string;
  orders: Order[];
  onClose: () => void;
  onPaymentComplete?: () => Promise<void>;
}

export const CheckClosingScreen: React.FC<CheckClosingScreenProps> = ({
  tableId,
  orders,
  onClose,
  onPaymentComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<CheckStep>('summary');

  // Calculate totals from all orders at the table
  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let total = 0;

    orders.forEach((order) => {
      // Use order totals if available, otherwise calculate from items
      if (order.subtotal !== undefined && order.tax !== undefined && order.total !== undefined) {
        subtotal += order.subtotal;
        tax += order.tax;
        total += order.total;
      } else {
        // Calculate from items
        const orderSubtotal = order.items.reduce((sum, item) => {
          const itemPrice = item.price * item.quantity;
          const modifiersPrice = (item.modifiers || []).reduce(
            (modSum, mod) => modSum + mod.price,
            0
          ) * item.quantity;
          return sum + itemPrice + modifiersPrice;
        }, 0);

        const orderTax = orderSubtotal * 0.08; // 8% tax rate
        subtotal += orderSubtotal;
        tax += orderTax;
        total += orderSubtotal + orderTax;
      }
    });

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [orders]);

  // Get the primary order ID (first order) for payment processing
  const primaryOrderId = orders[0]?.id || '';

  const handleSelectTender = useCallback(() => {
    setCurrentStep('tender');
  }, []);

  const handleSelectCard = useCallback(() => {
    setCurrentStep('card');
  }, []);

  const handleSelectCash = useCallback(() => {
    setCurrentStep('cash');
  }, []);

  const handleBackToSummary = useCallback(() => {
    setCurrentStep('summary');
  }, []);

  const handleBackToTender = useCallback(() => {
    setCurrentStep('tender');
  }, []);

  const handlePaymentSuccess = useCallback(async () => {
    // Call the payment complete handler if provided
    if (onPaymentComplete) {
      await onPaymentComplete();
    }

    // Close the screen
    onClose();
  }, [onClose, onPaymentComplete]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Close Button (Always Visible) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-4 focus:ring-gray-200"
          aria-label="Close check"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* Step Content */}
        {currentStep === 'summary' && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">Check Summary</h1>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Table</p>
                  <p className="text-2xl font-bold text-gray-900">{tableId}</p>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {orders.map((order, orderIndex) => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Receipt className="w-5 h-5 mr-2" aria-hidden="true" />
                      Order {orderIndex + 1}
                    </h3>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.quantity}x {item.name}
                            </p>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <ul className="ml-4 mt-1 text-sm text-gray-600">
                                {item.modifiers.map((mod, modIndex) => (
                                  <li key={modIndex}>
                                    + {mod.name}
                                    {mod.price > 0 && ` (+$${mod.price.toFixed(2)})`}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 ml-4">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals and Payment Button */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="font-semibold text-gray-900">
                    ${totals.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-700">Tax</span>
                  <span className="font-semibold text-gray-900">
                    ${totals.tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-2xl pt-3 border-t border-gray-300">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900">
                    ${totals.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSelectTender}
                className="w-full h-16 bg-gradient-to-br from-[#4ECDC4] to-[#44b3ab] text-white text-xl font-bold rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#4ECDC4]/30"
                aria-label="Proceed to payment"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {currentStep === 'tender' && (
          <TenderSelection
            total={totals.total}
            onSelectCard={handleSelectCard}
            onSelectCash={handleSelectCash}
            onBack={handleBackToSummary}
          />
        )}

        {currentStep === 'cash' && (
          <CashPayment
            orderId={primaryOrderId}
            total={totals.total}
            onBack={handleBackToTender}
            onSuccess={handlePaymentSuccess}
            onUpdateTableStatus={onPaymentComplete}
          />
        )}

        {currentStep === 'card' && (
          <CardPayment
            orderId={primaryOrderId}
            total={totals.total}
            onBack={handleBackToTender}
            onSuccess={handlePaymentSuccess}
            onUpdateTableStatus={onPaymentComplete}
          />
        )}
      </div>
    </div>
  );
};
