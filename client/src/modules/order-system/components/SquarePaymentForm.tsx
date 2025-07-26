import React, { useState, useCallback } from 'react';
import { CreditCard, Lock } from 'lucide-react';

interface SquarePaymentFormProps {
  onPaymentNonce: (nonce: string) => void;
  amount: number;
  isProcessing?: boolean;
}

export const SquarePaymentForm: React.FC<SquarePaymentFormProps> = ({ 
  onPaymentNonce, 
  amount,
  isProcessing = false 
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock Square payment form - in production this would use Square Web Payments SDK
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }
    
    if (!expiryDate || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
      newErrors.expiryDate = 'Please enter expiry date as MM/YY';
    }
    
    if (!cvv || cvv.length < 3 || cvv.length > 4) {
      newErrors.cvv = 'Please enter a valid CVV';
    }
    
    if (!postalCode || postalCode.length < 5) {
      newErrors.postalCode = 'Please enter a valid postal code';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Clear errors
    setErrors({});
    
    // Generate mock nonce for development
    // In production, this would use Square.payments().tokenize()
    const mockNonce = `mock-nonce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    onPaymentNonce(mockNonce);
  }, [cardNumber, expiryDate, cvv, postalCode, onPaymentNonce]);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substr(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substr(0, 2)}/${cleaned.substr(2, 2)}`;
    }
    return cleaned;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-blue-800 flex items-center">
          <Lock className="w-4 h-4 mr-2" />
          This is a mock payment form for development. In production, this would use Square Web Payments SDK.
        </p>
      </div>

      {/* Card Number */}
      <div>
        <label htmlFor="card-number" className="block text-sm font-medium text-gray-700 mb-1">
          Card Number
        </label>
        <div className="relative">
          <input
            id="card-number"
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500 ${
              errors.cardNumber ? 'border-red-300' : 'border-gray-300'
            }`}
            maxLength={19}
            disabled={isProcessing}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        {errors.cardNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
        )}
      </div>

      {/* Expiry Date and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Date
          </label>
          <input
            id="expiry-date"
            type="text"
            value={expiryDate}
            onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
            placeholder="MM/YY"
            className={`block w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500 ${
              errors.expiryDate ? 'border-red-300' : 'border-gray-300'
            }`}
            maxLength={5}
            disabled={isProcessing}
          />
          {errors.expiryDate && (
            <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
          )}
        </div>

        <div>
          <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
            CVV
          </label>
          <input
            id="cvv"
            type="text"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
            placeholder="123"
            className={`block w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500 ${
              errors.cvv ? 'border-red-300' : 'border-gray-300'
            }`}
            maxLength={4}
            disabled={isProcessing}
          />
          {errors.cvv && (
            <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
          )}
        </div>
      </div>

      {/* Postal Code */}
      <div>
        <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700 mb-1">
          Postal Code
        </label>
        <input
          id="postal-code"
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="12345"
          className={`block w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500 ${
            errors.postalCode ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={isProcessing}
        />
        {errors.postalCode && (
          <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
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
          `Pay $${amount.toFixed(2)}`
        )}
      </button>

      {/* Security Badge */}
      <div className="flex items-center justify-center text-sm text-gray-500">
        <Lock className="w-4 h-4 mr-1" />
        Secure payment powered by Square
      </div>
    </form>
  );
};