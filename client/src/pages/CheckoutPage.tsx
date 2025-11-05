import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackToDashboard } from '@/components/navigation/BackToDashboard';
import { useCart } from '@/contexts/cart.hooks';
import { CartItem } from '@/modules/order-system/components/CartItem';
import { CartSummary } from '@/modules/order-system/components/CartSummary';
import { TipSlider } from '@/modules/order-system/components/TipSlider';
import { SquarePaymentForm } from '@/modules/order-system/components/SquarePaymentForm';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useFormValidation, validators } from '@/utils/validation';
import { PaymentErrorBoundary } from '@/components/errors/PaymentErrorBoundary';

const CheckoutPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateCartItem, removeFromCart, updateTip, clearCart, restaurantId } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const orderApi = useApiRequest();
  const paymentApi = useApiRequest();

  // NOTE: Customer orders do NOT require authentication
  // Anonymous customers can place orders using just contact info (email, phone)
  // This ensures staff users accessing customer pages are treated as anonymous customers
  
  // Check if we're in demo mode
  const isDemoMode = !import.meta.env.VITE_SQUARE_ACCESS_TOKEN || 
                     import.meta.env.VITE_SQUARE_ACCESS_TOKEN === 'demo' || 
                     import.meta.env.DEV;
  
  // Use form validation hook
  const form = useFormValidation({
    customerEmail: '',
    customerPhone: '',
  }, {
    customerEmail: {
      rules: [validators.required, validators.email],
      validateOnBlur: true,
    },
    customerPhone: {
      rules: [validators.required, validators.phone],
      validateOnBlur: true,
    },
  });

  const handleDemoPayment = async () => {
    // Validate form
    if (!form.validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    form.clearErrors();

    try {
      // Create the order (using snake_case per ADR-001)
      // No authentication required - orders are placed anonymously with contact info
      const orderResponse = await orderApi.post('/api/v1/orders', {
        type: 'online',
        items: cart.items.map(item => ({
          id: item.id,  // Item UUID (required per OrderItem schema)
          menu_item_id: item.id,  // Menu item reference (required per OrderItem schema)
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers || [],
          special_instructions: item.specialInstructions || '',
        })),
        customer_name: form.values.customerEmail.split('@')[0],
        customer_email: form.values.customerEmail,
        customer_phone: form.values.customerPhone.replace(/\D/g, ''),
        notes: 'Demo online order',
        subtotal: cart.subtotal,
        tax: cart.tax,
        tip: cart.tip,
        total_amount: cart.total,
      }, {
        headers: {
          'X-Client-Flow': 'online'
        }
      });

      if (!orderResponse) {
        throw new Error('Failed to create order');
      }

      const order = orderResponse as { id: string; order_number: string };

      // Process demo payment (will be mocked on server)
      // Note: Don't send 'amount' - let server calculate from order to avoid mismatch
      const paymentResponse = await paymentApi.post('/api/v1/payments/create', {
        order_id: order.id,  // ✅ snake_case per ADR-001
        token: 'demo-token',
        idempotency_key: `demo-checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,  // ✅ snake_case per ADR-001
      }, {
        headers: {
          'X-Client-Flow': 'online'
        }
      });

      if (!paymentResponse) {
        throw new Error('Demo payment processing failed');
      }

      const payment = paymentResponse as { id?: string; paymentId?: string };

      // Clear cart and navigate to confirmation
      clearCart();
      navigate(`/order-confirmation/${restaurantId}`, {
        state: {
          orderId: order.id,
          order_number: order.order_number,
          estimatedTime: '15-20 minutes',
          items: cart.items,
          total: cart.total,
          paymentId: payment.id || payment.paymentId,
        }
      });

    } catch (error) {
      console.error('Demo payment error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error) || 'Demo payment failed. Please try again.';
      form.setFieldError('general' as keyof typeof form.values, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentNonce = async (token: string) => {
    // Validate form
    if (!form.validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    form.clearErrors();

    try {
      // First, create the order using snake_case (per ADR-001)
      // No authentication required - orders are placed anonymously with contact info
      const orderResponse = await orderApi.post('/api/v1/orders', {
        type: 'online',
        items: cart.items.map(item => ({
          id: item.id,  // Item UUID (required per OrderItem schema)
          menu_item_id: item.id,  // Menu item reference (required per OrderItem schema)
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers || [],
          special_instructions: item.specialInstructions || '',
        })),
        customer_name: form.values.customerEmail.split('@')[0],
        customer_email: form.values.customerEmail,
        customer_phone: form.values.customerPhone.replace(/\D/g, ''),
        notes: 'Online order',
        subtotal: cart.subtotal,
        tax: cart.tax,
        tip: cart.tip,
        total_amount: cart.total,
      }, {
        headers: {
          'X-Client-Flow': 'online'
        }
      });

      if (!orderResponse) {
        throw new Error('Failed to create order');
      }

      const order = orderResponse as { id: string; order_number: string };

      // Now process the payment using the new API hook
      // Note: Don't send 'amount' - let server calculate from order to avoid mismatch
      const paymentResponse = await paymentApi.post('/api/v1/payments/create', {
        order_id: order.id,  // ✅ snake_case per ADR-001
        token,
        idempotency_key: `checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,  // ✅ snake_case per ADR-001
      }, {
        headers: {
          'X-Client-Flow': 'online'
        }
      });

      if (!paymentResponse) {
        throw new Error('Payment processing failed');
      }

      const payment = paymentResponse as { id?: string; paymentId?: string };

      // Clear cart and navigate to confirmation
      clearCart();
      navigate(`/order-confirmation/${restaurantId}`, {
        state: {
          orderId: order.id,
          order_number: order.order_number,
          estimatedTime: '15-20 minutes',
          items: cart.items,
          total: cart.total,
          paymentId: payment.id || payment.paymentId,
        }
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error) || 'An error occurred. Please try again.';
      form.setFieldError('general' as keyof typeof form.values, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const _formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mb-6">
          <BackToDashboard />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600">Add items to your cart to checkout</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-6">
          <BackToDashboard />
        </div>

        <main>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Cart Items & Contact Info */}
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => updateCartItem(item.id, updates)}
                    onRemove={() => removeFromCart(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.values.customerEmail}
                    onChange={form.handleChange('customerEmail')}
                    onBlur={form.handleBlur('customerEmail')}
                    placeholder="john@example.com"
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      form.errors.customerEmail ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isProcessing}
                  />
                  {form.errors.customerEmail && (
                    <p className="mt-1 text-sm text-red-600">{form.errors.customerEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.values.customerPhone}
                    onChange={form.handleChange('customerPhone')}
                    onBlur={form.handleBlur('customerPhone')}
                    placeholder="(555) 123-4567"
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      form.errors.customerPhone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isProcessing}
                  />
                  {form.errors.customerPhone && (
                    <p className="mt-1 text-sm text-red-600">{form.errors.customerPhone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tip, Summary & Payment */}
          <div className="space-y-6">
            {/* Tip Selection */}
            <div className="bg-white rounded-lg p-6">
              <TipSlider 
                subtotal={cart.subtotal} 
                onTipChange={updateTip}
                initialTip={cart.tip}
              />
            </div>

            {/* Order Total */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Total</h2>
              <CartSummary
                subtotal={cart.subtotal}
                tax={cart.tax}
                tip={cart.tip}
                total={cart.total}
              />
            </div>

            {/* Payment Form */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
              
              {/* Demo Mode Banner */}
              {isDemoMode && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    🎮 Demo Mode – No cards will be charged
                  </p>
                </div>
              )}
              
              {form.errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {form.errors.general}
                </div>
              )}
              
              {isDemoMode ? (
                <button
                  onClick={handleDemoPayment}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Complete Order (Demo)'}
                </button>
              ) : (
                <SquarePaymentForm
                  onPaymentNonce={handlePaymentNonce}
                  amount={cart.total}
                  isProcessing={isProcessing}
                />
              )}
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

// Wrap the checkout page with payment error boundary
const CheckoutPage: React.FC = () => {
  return (
    <PaymentErrorBoundary>
      <CheckoutPageContent />
    </PaymentErrorBoundary>
  );
};

export default CheckoutPage;