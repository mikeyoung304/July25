import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskCart } from './KioskCartProvider';
import { SquarePaymentForm } from '@/modules/order-system/components/SquarePaymentForm';
import { TipSlider } from '@/modules/order-system/components/TipSlider';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useFormValidation, validators } from '@/utils/validation';
import { PaymentErrorBoundary } from '@/components/errors/PaymentErrorBoundary';
import { Card } from '@/components/ui/card';
import { ActionButton } from '@/components/ui/ActionButton';
import { BrandHeader } from '@/components/layout/BrandHeader';
import { ArrowLeft, ShoppingCart, CreditCard, Mail, Phone, User } from 'lucide-react';

interface KioskCheckoutPageProps {
  onBack: () => void;
}

const KioskCheckoutPageContent: React.FC<KioskCheckoutPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { cart, updateTip, clearCart } = useKioskCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const orderApi = useApiRequest();
  const paymentApi = useApiRequest();
  
  // Use form validation hook with kiosk-friendly validation
  const form = useFormValidation({
    customerEmail: '',
    customerPhone: '',
    customerName: '',
  }, {
    customerEmail: {
      rules: [validators.required, validators.email],
      validateOnBlur: true,
    },
    customerPhone: {
      rules: [validators.required, validators.phone],
      validateOnBlur: true,
    },
    customerName: {
      rules: [validators.required],
      validateOnBlur: true,
    },
  });

  const handlePaymentNonce = async (token: string) => {
    // Validate form
    if (!form.validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    form.clearErrors();

    try {
      // Create the order
      const orderResponse = await orderApi.post('/api/v1/orders', {
        type: 'kiosk',
        items: cart.items.map(item => ({
          menu_item_id: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.menuItem.price,
          modifiers: item.modifications || [],
          specialInstructions: item.specialInstructions || '',
        })),
        customerName: form.values.customerName,
        customerEmail: form.values.customerEmail,
        customerPhone: form.values.customerPhone.replace(/\D/g, ''),
        notes: 'Kiosk order',
        subtotal: cart.subtotal,
        tax: cart.tax,
        tip: cart.tip,
        total_amount: cart.total,
      });

      if (!orderResponse) {
        throw new Error('Failed to create order');
      }

      const order = orderResponse as { id: string; order_number: string };

      // Process the payment
      const paymentResponse = await paymentApi.post('/api/v1/payments/create', {
        orderId: order.id,
        token,
        amount: cart.total,
        idempotencyKey: `kiosk-checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      if (!paymentResponse) {
        throw new Error('Payment processing failed');
      }

      const payment = paymentResponse as { id?: string; paymentId?: string };

      // Clear cart and navigate to confirmation
      clearCart();
      navigate('/order-confirmation', { 
        state: { 
          orderId: order.id,
          order_number: order.order_number,
          estimatedTime: '15-20 minutes',
          items: cart.items,
          total: cart.total,
          paymentId: payment.id || payment.paymentId,
          isKioskOrder: true,
        } 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      form.setFieldError('general' as keyof typeof form.values, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Card className="p-12 text-center max-w-lg">
          <ShoppingCart className="w-20 h-20 text-gray-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-xl text-gray-600 mb-8">Add items to your cart to checkout</p>
          <ActionButton
            onClick={onBack}
            size="large"
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Continue Shopping
          </ActionButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BrandHeader 
        pageTitle="Secure Checkout"
        pageDescription="Complete your order with payment and contact details"
      />
      
      {/* Quick Actions Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <ActionButton
            onClick={onBack}
            variant="ghost"
            size="large"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Order
          </ActionButton>
          
          <div className="flex items-center space-x-4 text-lg text-gray-700">
            <ShoppingCart className="w-5 h-5" />
            <span>{cart.itemCount} items • ${cart.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column - Order Summary & Contact */}
          <div className="space-y-8">
            {/* Order Summary */}
            <Card className="p-8 bg-white/90 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-semibold text-gray-900">
                          {item.quantity}×
                        </span>
                        <span className="text-lg font-medium text-gray-900">
                          {item.menuItem.name}
                        </span>
                      </div>
                      {item.modifications && item.modifications.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1 ml-8">
                          {item.modifications.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ${(item.menuItem.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-8 bg-white/90 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-lg font-medium text-gray-700 mb-2">
                    <User className="w-5 h-5 inline mr-2" />
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={form.values.customerName}
                    onChange={form.handleChange('customerName')}
                    onBlur={form.handleBlur('customerName')}
                    placeholder="John Smith"
                    className={`block w-full px-4 py-4 text-lg border-2 rounded-xl ${
                      form.errors.customerName ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
                    } focus:ring-4 focus:ring-teal-100 transition-all`}
                    disabled={isProcessing}
                  />
                  {form.errors.customerName && (
                    <p className="mt-2 text-red-600">{form.errors.customerName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-2">
                    <Mail className="w-5 h-5 inline mr-2" />
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.values.customerEmail}
                    onChange={form.handleChange('customerEmail')}
                    onBlur={form.handleBlur('customerEmail')}
                    placeholder="john@example.com"
                    className={`block w-full px-4 py-4 text-lg border-2 rounded-xl ${
                      form.errors.customerEmail ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
                    } focus:ring-4 focus:ring-teal-100 transition-all`}
                    disabled={isProcessing}
                  />
                  {form.errors.customerEmail && (
                    <p className="mt-2 text-red-600">{form.errors.customerEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-lg font-medium text-gray-700 mb-2">
                    <Phone className="w-5 h-5 inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.values.customerPhone}
                    onChange={form.handleChange('customerPhone')}
                    onBlur={form.handleBlur('customerPhone')}
                    placeholder="(555) 123-4567"
                    className={`block w-full px-4 py-4 text-lg border-2 rounded-xl ${
                      form.errors.customerPhone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
                    } focus:ring-4 focus:ring-teal-100 transition-all`}
                    disabled={isProcessing}
                  />
                  {form.errors.customerPhone && (
                    <p className="mt-2 text-red-600">{form.errors.customerPhone}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Tip & Payment */}
          <div className="space-y-8">
            {/* Tip Selection */}
            <Card className="p-8 bg-white/90 backdrop-blur-sm">
              <TipSlider 
                subtotal={cart.subtotal} 
                onTipChange={updateTip}
                initialTip={cart.tip}
              />
            </Card>

            {/* Order Total */}
            <Card className="p-8 bg-white/90 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Total</h2>
              <div className="space-y-3 text-lg">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span>${cart.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tip:</span>
                  <span>${cart.tip.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-gray-900 border-t pt-3">
                  <span>Total:</span>
                  <span>${cart.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Payment Form */}
            <Card className="p-8 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center mb-6">
                <CreditCard className="w-6 h-6 mr-3 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
              </div>
              
              {form.errors.general && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {form.errors.general}
                </div>
              )}
              
              <SquarePaymentForm
                onPaymentNonce={handlePaymentNonce}
                amount={cart.total}
                isProcessing={isProcessing}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap with error boundary
export const KioskCheckoutPage: React.FC<KioskCheckoutPageProps> = (props) => {
  return (
    <PaymentErrorBoundary>
      <KioskCheckoutPageContent {...props} />
    </PaymentErrorBoundary>
  );
};