import { useState, useCallback } from 'react';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useNavigate } from 'react-router-dom';
import type { UnifiedCartItem } from '@/contexts/UnifiedCartContext';
import { useTaxRate } from '@/hooks/useTaxRate';

// Type alias for compatibility
type KioskOrderItem = UnifiedCartItem;

interface OrderSubmissionResult {
  success: boolean;
  order_number?: string;
  orderId?: string;
  estimatedTime?: string;
  error?: string;
}

export function useKioskOrderSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const orderApi = useApiRequest();
  const taxRate = useTaxRate();

  const submitOrder = useCallback(async (
    items: KioskOrderItem[],
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ): Promise<OrderSubmissionResult> => {
    if (items.length === 0) {
      return { success: false, error: 'No items in cart' };
    }

    setIsSubmitting(true);
    try {
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * taxRate; // Use restaurant-specific tax rate
      const total = subtotal + tax;

      // Prepare order data in the format expected by the API
      const orderData = {
        type: 'kiosk' as const,
        items: items.map(item => ({
          menu_item_id: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.menuItem.price,
          modifiers: item.modifications || [],
          specialInstructions: item.specialInstructions || '',
        })),
        customerName: customerInfo?.name || 'Kiosk Customer',
        customerEmail: customerInfo?.email || '',
        customerPhone: customerInfo?.phone || '',
        notes: 'Self-service kiosk order',
        subtotal: subtotal,
        tax: tax,
        tip: 0,
        total_amount: total,
      };

      const orderResponse = await orderApi.post('/api/v1/orders', orderData);

      if (!orderResponse) {
        throw new Error('Failed to create order');
      }

      const order = orderResponse as { id: string; order_number: string };

      return {
        success: true,
        order_number: order.order_number,
        orderId: order.id,
        estimatedTime: '10-15 minutes'
      };

    } catch (error) {
      console.error('Order submission failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [orderApi, taxRate]);

  const submitOrderAndNavigate = useCallback(async (
    items: KioskOrderItem[],
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ) => {
    const result = await submitOrder(items, customerInfo);
    
    if (result.success) {
      // Navigate to order confirmation
      navigate('/order-confirmation', {
        state: {
          orderId: result.orderId,
          order_number: result.order_number,
          estimatedTime: result.estimatedTime,
          items: items,
          total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          isKioskOrder: true,
        }
      });
    }
    
    return result;
  }, [submitOrder, navigate]);

  return {
    submitOrder,
    submitOrderAndNavigate,
    isSubmitting
  };
}