import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Clock, Home } from 'lucide-react';
// Define CartItem locally
interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

interface LocationState {
  orderId: string;
  order_number: string;
  estimatedTime: string;
  items: CartItem[];
  total: number;
}

export const OrderConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  useEffect(() => {
    // Redirect to home if no order data
    if (!state || !state.orderId) {
      navigate('/');
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-xl text-gray-600 mb-6">
            Thank you for your order. We're preparing your food now.
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="text-lg font-semibold">{state.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="text-lg font-mono text-gray-700">{state.orderId}</p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-center text-green-600">
              <Clock className="w-5 h-5 mr-2" />
              <span className="font-medium">Estimated ready time: {state.estimatedTime}</span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="text-left mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2">
              {state.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-600">{item.quantity}x</span>
                    <span className="ml-2 text-gray-900">{item.name}</span>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <span className="ml-2 text-gray-500 text-xs">
                        ({item.modifiers.map((m: any) => m.name).join(', ')})
                      </span>
                    )}
                  </div>
                  <span className="text-gray-900">
                    {formatPrice((item.price + (item.modifiers?.reduce((sum: any, m: any) => sum + m.price, 0) || 0)) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total Paid</span>
                <span className="text-green-600">{formatPrice(state.total)}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-1">What's Next?</h3>
            <p className="text-sm text-blue-700">
              You'll receive an email confirmation shortly. When your order is ready, 
              we'll notify you via the contact information you provided.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Print Receipt
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Questions about your order?</p>
          <p>Call us at <a href="tel:555-0123" className="text-green-600 hover:underline">(555) 012-3456</a></p>
        </div>
      </div>
    </div>
  );
};