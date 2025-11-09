import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedCart } from '@/contexts/cart.hooks';
import { SquarePaymentForm } from '@/modules/order-system/components/SquarePaymentForm';
import { TipSlider } from '@/modules/order-system/components/TipSlider';
import { useHttpClient } from '@/services/http';
import { useSquareTerminal } from '@/hooks/useSquareTerminal';
import { useFormValidation } from '@/utils/validation';
import { checkoutValidationRules } from '@/config/checkoutValidation';
import { PaymentErrorBoundary } from '@/components/errors/PaymentErrorBoundary';
import { Card } from '@/components/ui/card';
import { ActionButton } from '@/components/ui/ActionButton';
import { BrandHeader } from '@/components/layout/BrandHeader';
import { ArrowLeft, ShoppingCart, CreditCard, Mail, Phone, User, Smartphone, DollarSign } from 'lucide-react';

interface KioskCheckoutPageProps {
  onBack: () => void;
  voiceCheckoutOrchestrator?: any; // For voice integration
}

type PaymentMethod = 'card' | 'terminal' | 'mobile' | 'cash';

const KioskCheckoutPageContent: React.FC<KioskCheckoutPageProps> = ({ onBack, voiceCheckoutOrchestrator }) => {
  const navigate = useNavigate();
  const { cart, updateTip, clearCart } = useUnifiedCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card');
  const [_createdOrderId, _setCreatedOrderId] = useState<string | null>(null);
  const { post: createOrder } = useHttpClient();
  const { post: processPayment } = useHttpClient();
  
  // Square Terminal integration
  const terminal = useSquareTerminal({
    onSuccess: (orderData, paymentData) => {
      // Navigate to confirmation (cart already cleared after order creation)
      navigate('/order-confirmation', {
        state: {
          orderId: orderData.id,
          order_number: orderData.order_number,
          estimatedTime: '15-20 minutes',
          items: cart.items,
          total: cart.total,
          paymentId: paymentData.paymentId || paymentData.id,
          isKioskOrder: true,
          isVoiceOrder: !!voiceCheckoutOrchestrator,
          paymentMethod: 'terminal',
        }
      });
      
      // Notify voice orchestrator if present
      if (voiceCheckoutOrchestrator) {
        voiceCheckoutOrchestrator.handlePaymentSuccess(orderData);
      }
    },
    onError: (error) => {
      form.setFieldError('general' as keyof typeof form.values, error);
      
      // Notify voice orchestrator if present
      if (voiceCheckoutOrchestrator) {
        voiceCheckoutOrchestrator.handlePaymentError(error);
      }
    },
    onStatusChange: (status) => {
      // Provide voice feedback for status changes
      if (voiceCheckoutOrchestrator) {
        let feedbackText = '';
        switch (status) {
          case 'PENDING':
            feedbackText = 'Preparing terminal for payment. Please wait.';
            break;
          case 'IN_PROGRESS':
            feedbackText = 'Please complete the payment on the terminal.';
            break;
          case 'COMPLETED':
            feedbackText = 'Payment completed successfully. Processing your order.';
            break;
          case 'FAILED':
            feedbackText = 'Payment failed. Please try again or select a different payment method.';
            break;
          case 'CANCELED':
            feedbackText = 'Payment was cancelled. Please try again or select a different payment method.';
            break;
        }
        
        if (feedbackText) {
          voiceCheckoutOrchestrator.emit('payment.status.feedback', { 
            text: feedbackText, 
            timestamp: Date.now() 
          });
        }
      }
    },
    debug: process.env.NODE_ENV === 'development'
  });
  
  // Load terminal devices only when terminal payment method is selected
  useEffect(() => {
    if (selectedPaymentMethod === 'terminal' && terminal.availableDevices.length === 0) {
      terminal.loadDevices();
    }
  }, [selectedPaymentMethod]); // Only depend on payment method selection
  
  // Handle voice payment method selection
  useEffect(() => {
    if (voiceCheckoutOrchestrator) {
      const handlePaymentMethodSelected = (event: any) => {
        if (event.method === 'card') {
          setSelectedPaymentMethod('terminal');
        } else {
          setSelectedPaymentMethod(event.method);
        }
      };
      
      voiceCheckoutOrchestrator.on('payment.method.selected', handlePaymentMethodSelected);
      
      return () => {
        voiceCheckoutOrchestrator.off('payment.method.selected', handlePaymentMethodSelected);
      };
    }
  }, [voiceCheckoutOrchestrator]);

  // Check if we're in demo mode
  const isDemoMode = !import.meta.env.VITE_SQUARE_ACCESS_TOKEN ||
                     import.meta.env.VITE_SQUARE_ACCESS_TOKEN === 'demo' ||
                     import.meta.env.DEV;

  // TEMPORARY DEBUG: Auto-fill demo data for faster testing (remove when done debugging)
  const DEMO_CUSTOMER_DATA = {
    name: 'Demo Customer',
    email: 'demo@example.com',
    phone: '(555) 555-1234',
  };

  // Use form validation hook with shared validation rules
  const form = useFormValidation({
    customerEmail: isDemoMode ? DEMO_CUSTOMER_DATA.email : '',
    customerPhone: isDemoMode ? DEMO_CUSTOMER_DATA.phone : '',
    customerName: isDemoMode ? DEMO_CUSTOMER_DATA.name : '',
  }, {
    customerEmail: checkoutValidationRules.customerEmail,
    customerPhone: checkoutValidationRules.customerPhone,
    customerName: checkoutValidationRules.customerName,
  });

  // Create order function (shared by all payment methods)
  const createOrder = async () => {
    // Validate form
    if (!form.validateForm()) {
      return null;
    }

    setIsProcessing(true);
    form.clearErrors();

    try {
      // Auth is handled automatically by useHttpClient via Supabase session
      // Create the order
      const orderResponse = await createOrder('/api/v1/orders', {
        type: 'kiosk',
        items: cart.items.map(item => ({
          menu_item_id: item.menuItemId || item.menuItem?.id,
          name: item.name || item.menuItem?.name,
          quantity: item.quantity,
          price: item.price || item.menuItem?.price,
          modifiers: item.modifications || item.modifiers || [],
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
      }, {
        headers: {
          'X-Client-Flow': 'kiosk'
        }
      });

      if (!orderResponse) {
        throw new Error('Failed to create order');
      }

      const order = orderResponse as { id: string; order_number: string };
      _setCreatedOrderId(order.id);
      
      // Clear cart immediately after order creation
      // Order has been sent to kitchen, regardless of payment status
      clearCart();
      
      return order;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      form.setFieldError('general' as keyof typeof form.values, errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle terminal payment
  const handleTerminalPayment = async () => {
    const order = await createOrder();
    if (!order) return;
    
    // Use first available terminal device
    // In production, you might want to let user select device
    const device = terminal.availableDevices[0];
    if (!device) {
      form.setFieldError('general' as keyof typeof form.values, 'No terminal devices available');
      return;
    }
    
    try {
      await terminal.startCheckout(order.id, device.deviceId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start terminal payment';
      form.setFieldError('general' as keyof typeof form.values, errorMessage);
    }
  };

  const handlePaymentNonce = async (token: string) => {
    const order = await createOrder();
    if (!order) return;
    
    try {
      // Process the payment
      const paymentResponse = await processPayment('/api/v1/payments/create', {
        orderId: order.id,
        token,
        amount: cart.total,
        idempotencyKey: `kiosk-checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      if (!paymentResponse) {
        throw new Error('Payment processing failed');
      }

      const payment = paymentResponse as { id?: string; paymentId?: string };

      // Navigate to confirmation (cart already cleared after order creation)
      navigate('/order-confirmation', { 
        state: { 
          orderId: order.id,
          order_number: order.order_number,
          estimatedTime: '15-20 minutes',
          items: cart.items,
          total: cart.total,
          paymentId: payment.id || payment.paymentId,
          isKioskOrder: true,
          isVoiceOrder: !!voiceCheckoutOrchestrator,
          paymentMethod: 'card',
        } 
      });
      
      // Notify voice orchestrator if present
      if (voiceCheckoutOrchestrator) {
        voiceCheckoutOrchestrator.handlePaymentSuccess({ ...order, payment });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      form.setFieldError('general' as keyof typeof form.values, errorMessage);
      
      // Notify voice orchestrator if present
      if (voiceCheckoutOrchestrator) {
        voiceCheckoutOrchestrator.handlePaymentError(errorMessage);
      }
    }
  };
  
  // Handle payment method selection
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    form.clearErrors();
    
    // Notify voice orchestrator
    if (voiceCheckoutOrchestrator) {
      voiceCheckoutOrchestrator.handlePaymentMethodSelection(method);
    }
  };
  
  // Handle payment submission based on selected method
  const handlePaymentSubmit = async () => {
    switch (selectedPaymentMethod) {
      case 'terminal':
        await handleTerminalPayment();
        break;
      case 'cash': {
        // For cash payments, just create the order and navigate
        const order = await createOrder();
        if (order) {
          // Cart already cleared after order creation
          navigate('/order-confirmation', {
            state: {
              orderId: order.id,
              order_number: order.order_number,
              estimatedTime: '15-20 minutes',
              items: cart.items,
              total: cart.total,
              isKioskOrder: true,
              isVoiceOrder: !!voiceCheckoutOrchestrator,
              paymentMethod: 'cash',
              isPendingPayment: true,
            }
          });
          
          if (voiceCheckoutOrchestrator) {
            voiceCheckoutOrchestrator.handlePaymentSuccess(order);
          }
        }
        break;
      }
      case 'mobile':
        // Placeholder for mobile payments (Apple Pay, Google Pay, etc.)
        form.setFieldError('general' as keyof typeof form.values, 'Mobile payments not yet supported');
        break;
      case 'card':
      default:
        // This will be handled by SquarePaymentForm callback
        break;
    }
  };
  
  // Get payment button props based on selected method
  const getPaymentButtonProps = () => {
    const isTerminalActive = terminal.isCheckoutActive;
    const baseProps = {
      disabled: isProcessing || isTerminalActive,
      loading: isProcessing || terminal.isLoading,
    };
    
    switch (selectedPaymentMethod) {
      case 'terminal':
        return {
          ...baseProps,
          text: isTerminalActive 
            ? 'Payment in Progress...' 
            : `Pay $${cart.total.toFixed(2)} with Terminal`,
          onClick: handlePaymentSubmit,
        };
      case 'cash':
        return {
          ...baseProps,
          text: `Pay $${cart.total.toFixed(2)} with Cash`,
          onClick: handlePaymentSubmit,
        };
      case 'mobile':
        return {
          ...baseProps,
          text: 'Mobile Payment (Coming Soon)',
          onClick: handlePaymentSubmit,
          disabled: true,
        };
      case 'card':
      default:
        return {
          ...baseProps,
          text: `Pay $${cart.total.toFixed(2)} with Card`,
          onClick: () => {}, // SquarePaymentForm handles its own submission
        };
    }
  };
  
  const paymentButtonProps = getPaymentButtonProps();

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
                          {item.name || item.menuItem?.name}
                        </span>
                      </div>
                      {item.modifications && item.modifications.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1 ml-8">
                          {item.modifications.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ${((item.price || item.menuItem?.price || 0) * item.quantity).toFixed(2)}
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

            {/* Payment Method Selection */}
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
              
              {/* Payment Method Options */}
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card Payment */}
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('card')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPaymentMethod === 'card'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <CreditCard className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Credit/Debit Card</div>
                  </button>
                  
                  {/* Terminal Payment */}
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('terminal')}
                    disabled={terminal.availableDevices.length === 0}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPaymentMethod === 'terminal'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : terminal.availableDevices.length === 0
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Smartphone className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">
                      Terminal
                      {terminal.availableDevices.length === 0 && ' (Unavailable)'}
                    </div>
                  </button>
                  
                  {/* Cash Payment */}
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('cash')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPaymentMethod === 'cash'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <DollarSign className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Cash</div>
                  </button>
                  
                  {/* Mobile Payment - Coming Soon */}
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('mobile')}
                    disabled
                    className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                  >
                    <Smartphone className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Mobile Pay</div>
                    <div className="text-xs text-gray-400">(Coming Soon)</div>
                  </button>
                </div>
              </div>
              
              {/* Terminal Status */}
              {selectedPaymentMethod === 'terminal' && terminal.currentCheckout && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-blue-800 font-medium">
                        Terminal Status: {terminal.currentCheckout.status.replace('_', ' ').toLowerCase()}
                      </div>
                      <div className="text-blue-600 text-sm mt-1">
                        Please follow instructions on the terminal device.
                      </div>
                    </div>
                    {terminal.isCheckoutActive && (
                      <button
                        onClick={terminal.cancelCheckout}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Payment Form */}
              {selectedPaymentMethod === 'card' ? (
                <SquarePaymentForm
                  onPaymentNonce={handlePaymentNonce}
                  amount={cart.total}
                  isProcessing={isProcessing}
                />
              ) : (
                <ActionButton
                  onClick={paymentButtonProps.onClick}
                  disabled={paymentButtonProps.disabled}
                  size="large"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 text-lg font-semibold"
                >
                  {paymentButtonProps.text}
                </ActionButton>
              )}
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