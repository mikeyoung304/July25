import { useState, useCallback } from 'react';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useNavigate } from 'react-router-dom';
import type { UnifiedCartItem } from '@/contexts/UnifiedCartContext';

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
      const tax = subtotal * 0.08; // 8% tax rate
      const total = subtotal + tax;

      // Prepare order data in the format expected by the API
      // Server expects camelCase fields and specific structure
      const orderData = {
        type: 'kiosk' as const,
        items: items.map(item => ({
          id: item.menuItem.id, // Server expects 'id' not 'menu_item_id'
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.menuItem.price,
          modifiers: (item.modifications || []).map(mod => 
            typeof mod === 'string' 
              ? { name: mod, price: 0 } // Convert string modifiers to objects
              : mod
          ),
          notes: item.specialInstructions || '', // Server expects 'notes' not 'specialInstructions'
        })),
        customerName: customerInfo?.name || 'Kiosk Customer', // Already camelCase ✓
        customerEmail: customerInfo?.email || '', // Already camelCase ✓
        customerPhone: customerInfo?.phone || '', // Already camelCase ✓
        tableNumber: '', // Add if needed for dine-in orders
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
  }, [orderApi]);

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