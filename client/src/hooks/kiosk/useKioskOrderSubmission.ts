import { useState, useCallback } from 'react';
import { useHttpClient } from '@/services/http';
import { useNavigate } from 'react-router-dom';
import type { UnifiedCartItem } from '@/contexts/UnifiedCartContext';
import { useTaxRate } from '@/hooks/useTaxRate';
import { logger } from '@/services/logger';
import { getErrorMessage } from '@rebuild/shared';

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
  const { post: createOrder } = useHttpClient();
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
      // Use cents (integer) arithmetic to avoid floating-point rounding errors
      const subtotalCents = items.reduce((sumCents, item) => {
        const itemPriceCents = Math.round(item.price * 100);
        return sumCents + (itemPriceCents * item.quantity);
      }, 0);
      const taxCents = Math.round(subtotalCents * taxRate);
      const totalCents = subtotalCents + taxCents;

      // Convert back to dollars for display/storage
      const subtotal = subtotalCents / 100;
      const tax = taxCents / 100;
      const total = totalCents / 100;

      // Prepare order data in the format expected by the API
      const orderData = {
        type: 'kiosk' as const,
        items: items.map(item => ({
          id: item.id, // Cart item ID (required by OrderPayload)
          menu_item_id: item.menuItem.id, // Menu item reference
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
        tip: 0,
        // PHASE 5: Server ALWAYS calculates subtotal, tax, total_amount
        // Client only sends tip (user-controlled input)
      };

      const orderResponse = await createOrder('/api/v1/orders', orderData);

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
      logger.error('Order submission failed:', error);
      const errorMessage = getErrorMessage(error);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [createOrder, taxRate]);

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
      // Use cents arithmetic for confirmation total to avoid floating-point errors
      const confirmationTotalCents = items.reduce((sumCents, item) => {
        const itemPriceCents = Math.round(item.price * 100);
        return sumCents + (itemPriceCents * item.quantity);
      }, 0);

      // Navigate to order confirmation
      navigate('/order-confirmation', {
        state: {
          orderId: result.orderId,
          order_number: result.order_number,
          estimatedTime: result.estimatedTime,
          items: items,
          total: confirmationTotalCents / 100,
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