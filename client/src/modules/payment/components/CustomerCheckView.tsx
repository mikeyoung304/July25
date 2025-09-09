import React from 'react';
import { motion } from 'framer-motion';
import { CheckSummary } from '../types';

interface CustomerCheckViewProps {
  check: CheckSummary;
  onContinue: () => void;
  onCancel: () => void;
}

export const CustomerCheckView: React.FC<CustomerCheckViewProps> = ({
  check,
  onContinue,
  onCancel
}) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white p-6 text-center">
        <h1 className="text-3xl font-bold">Your Check</h1>
        <p className="text-lg mt-2 opacity-90">Table {check.tableName}</p>
      </div>

      {/* Items List */}
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="space-y-4 mb-8">
          {check.items.map((item, index) => (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex justify-between items-start border-b pb-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-medium text-gray-800">
                    {item.quantity}x
                  </span>
                  <span className="text-lg text-gray-800">{item.name}</span>
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="ml-10 mt-1 text-sm text-gray-600">
                    {item.modifiers.map((mod: any, idx: number) => (
                      <div key={idx}>• {mod.name}</div>
                    ))}
                  </div>
                )}
                {item.specialInstructions && (
                  <div className="ml-10 mt-1 text-sm text-gray-600 italic">
                    Note: {item.specialInstructions}
                  </div>
                )}
              </div>
              <div className="text-lg font-medium text-gray-800">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t-2 border-gray-300 pt-4 space-y-2">
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${check.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">${check.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-2xl font-bold pt-2 border-t">
            <span>Total</span>
            <span>${check.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 bg-gray-50 border-t">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onContinue}
            className="w-full py-5 bg-primary text-white text-xl font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-lg"
          >
            Add Tip & Pay
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-3 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Need more time
          </button>
        </div>
      </div>
    </div>
  );
};