import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackToDashboard } from '@/components/navigation/BackToDashboard';
import { useCart } from '@/modules/order-system/context/cartContext.hooks';
import { CartItem } from '@/modules/order-system/components/CartItem';
import { CartSummary } from '@/modules/order-system/components/CartSummary';
import { TipSlider } from '@/modules/order-system/components/TipSlider';
import { SquarePaymentForm } from '@/modules/order-system/components/SquarePaymentForm';
// Define CheckoutPayload locally
interface CheckoutPayload {
  cart: {
    items: any[];
    subtotal: number;
    tax: number;
    tip: number;
    total: number;
  };
  customerEmail: string;
  customerPhone: string;
  paymentNonce: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateCartItem, removeFromCart, updateTip, clearCart } = useCart();
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePaymentNonce = async (token: string) => {
    // Validate contact info
    const newErrors: Record<string, string> = {};
    
    if (!customerEmail || !customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!customerPhone || !customerPhone.match(/^\d{10}$/)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsProcessing(true);
    setErrors({});

    try {
      // First, create the order
      const orderResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'x-restaurant-id': import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111',
        },
        body: JSON.stringify({
          type: 'online',
          items: cart.items.map(item => ({
            menu_item_id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            modifiers: item.modifiers || [],
            specialInstructions: item.specialInstructions || '',
          })),
          customerName: customerEmail.split('@')[0], // Use email prefix as name
          customerEmail,
          customerPhone,
          notes: 'Online order',
          subtotal: cart.subtotal,
          tax: cart.tax,
          tip: cart.tip,
          total_amount: cart.total,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const order = await orderResponse.json();

      // Now process the payment
      const paymentResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'x-restaurant-id': import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111',
        },
        body: JSON.stringify({
          orderId: order.id,
          token,
          amount: cart.total,
          idempotencyKey: `checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }),
      });

      if (!paymentResponse.ok) {
        const paymentError = await paymentResponse.json();
        throw new Error(paymentError.error || 'Payment failed');
      }

      const paymentResult = await paymentResponse.json();

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment processing failed');
      }

      // Clear cart and navigate to confirmation
      clearCart();
      navigate('/order-confirmation', { 
        state: { 
          orderId: order.id,
          order_number: order.order_number,
          estimatedTime: '15-20 minutes',
          items: cart.items,
          total: cart.total,
          paymentId: paymentResult.paymentId,
        } 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
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
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isProcessing}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formatPhoneNumber(customerPhone)}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="(555) 123-4567"
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isProcessing}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
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
              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errors.general}
                </div>
              )}
              <SquarePaymentForm
                onPaymentNonce={handlePaymentNonce}
                amount={cart.total}
                isProcessing={isProcessing}
              />
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

export default CheckoutPage;