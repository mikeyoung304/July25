import { httpClient } from './http';
import { Order, OrderItem } from '@/types/common';
import { Cart } from '@/modules/order-system/types';

export interface CreateOrderRequest {
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderType: 'dine-in' | 'takeout' | 'delivery' | 'drive-thru';
  paymentMethod?: 'cash' | 'card' | 'online';
  specialInstructions?: string;
  tableNumber?: string;
}

export interface PaymentIntentResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string;
}

export interface OrderConfirmationResponse {
  orderId: string;
  orderNumber: string;
  estimatedTime: string;
  status: string;
}

export class OrderService {
  static async createOrder(
    restaurantId: string, 
    orderData: CreateOrderRequest
  ): Promise<Order> {
    try {
      const response = await httpClient.post<{ data: Order }>('/orders', orderData, {
        headers: {
          'X-Restaurant-ID': restaurantId
        }
      });

      if (!response.data) {
        throw new Error('Invalid order response');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw new Error('Failed to create order. Please try again.');
    }
  }

  static async initiatePayment(
    restaurantId: string,
    orderId: string,
    amount: number
  ): Promise<PaymentIntentResponse> {
    try {
      const response = await httpClient.post<{ data: PaymentIntentResponse }>(
        '/payments/initiate',
        { orderId, amount },
        {
          headers: {
            'X-Restaurant-ID': restaurantId
          }
        }
      );

      if (!response.data) {
        throw new Error('Invalid payment response');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to initiate payment:', error);
      throw new Error('Failed to initiate payment. Please try again.');
    }
  }

  static async confirmPayment(
    restaurantId: string,
    orderId: string,
    paymentId: string
  ): Promise<OrderConfirmationResponse> {
    try {
      const response = await httpClient.post<{ data: OrderConfirmationResponse }>(
        '/payments/confirm',
        { orderId, paymentId },
        {
          headers: {
            'X-Restaurant-ID': restaurantId
          }
        }
      );

      if (!response.data) {
        throw new Error('Invalid confirmation response');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      throw new Error('Failed to confirm payment. Please try again.');
    }
  }

  static async getOrder(restaurantId: string, orderId: string): Promise<Order> {
    try {
      const response = await httpClient.get<{ data: Order }>(`/orders/${orderId}`, {
        headers: {
          'X-Restaurant-ID': restaurantId
        }
      });

      if (!response.data) {
        throw new Error('Order not found');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to fetch order:', error);
      throw new Error('Failed to fetch order details.');
    }
  }

  static async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    status: string
  ): Promise<Order> {
    try {
      const response = await httpClient.patch<{ data: Order }>(
        `/orders/${orderId}/status`,
        { status },
        {
          headers: {
            'X-Restaurant-ID': restaurantId
          }
        }
      );

      if (!response.data) {
        throw new Error('Failed to update order status');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw new Error('Failed to update order status.');
    }
  }

  // Helper to convert cart to order request
  static cartToOrderRequest(cart: Cart, orderType: CreateOrderRequest['orderType']): CreateOrderRequest {
    const items: OrderItem[] = cart.items.map(cartItem => ({
      id: cartItem.id,
      name: cartItem.name,
      quantity: cartItem.quantity,
      price: cartItem.price + (cartItem.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0),
      modifiers: cartItem.modifiers?.map(mod => mod.name),
      notes: cartItem.specialInstructions
    }));

    return {
      items,
      orderType,
      paymentMethod: 'online'
    };
  }
}