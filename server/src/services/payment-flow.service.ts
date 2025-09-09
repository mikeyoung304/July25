import { logger } from '../utils/logger';
import { supabase } from '../config/database';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { PaymentService } from './payment.service';
import { OrdersService } from './orders.service';
import { BadRequest, NotFound } from '../middleware/errorHandler';

const serviceLogger = logger.child({ service: 'payment-flow' });

export interface PaymentAmount {
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export interface PaymentMethod {
  type: 'SQUARE_TERMINAL' | 'WEB_SDK' | 'MANUAL_ENTRY' | 'CASH' | 'DIGITAL_WALLET';
  token?: string;
  deviceId?: string;
  tenderedAmount?: number;
}

export interface PaymentResult {
  id: string;
  status: 'completed' | 'failed' | 'cancelled';
  paymentId?: string;
  amount: PaymentAmount;
  method: PaymentMethod;
  receiptUrl?: string;
  changeAmount?: number;
  timestamp: string;
}

export interface TableCheck {
  id: string;
  tableId: string;
  orderId: string;
  status: 'open' | 'presented' | 'processing' | 'paid' | 'cancelled';
  presentedAt?: string;
  lockedBy?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: any[];
  createdAt: string;
}

// Initialize Square client
const squareClient = new SquareClient({
  environment: process.env['SQUARE_ENVIRONMENT'] === 'production' 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox,
  accessToken: process.env['SQUARE_ACCESS_TOKEN']!
} as any);

export class PaymentFlowService {
  private static readonly PAYMENT_TIMEOUT_MS = 600000; // 10 minutes
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Present check to customer for payment
   */
  static async presentCheck(tableId: string, userId: string): Promise<TableCheck> {
    try {
      // Get active order for table
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('*, current_order_id')
        .eq('id', tableId)
        .single();

      if (tableError || !tableData) {
        throw NotFound('Table not found');
      }

      if (!tableData.current_order_id) {
        throw BadRequest('No active order for this table');
      }

      // Get order details
      const restaurantId = tableData.restaurant_id;
      const order = await OrdersService.getOrder(restaurantId, tableData.current_order_id);
      
      if (!order) {
        throw NotFound('Order not found');
      }

      // Calculate totals
      const validation = await PaymentService.calculateOrderTotal(order);

      // Check if check already exists
      const { data: existingCheck } = await supabase
        .from('table_checks')
        .select('*')
        .eq('table_id', tableId)
        .eq('order_id', tableData.current_order_id)
        .eq('status', 'presented')
        .single();

      if (existingCheck) {
        serviceLogger.info('Check already presented', { tableId, checkId: existingCheck.id });
        return this.formatTableCheck(existingCheck, order);
      }

      // Create new check presentation
      const checkId = randomUUID();
      const { data: newCheck, error: checkError } = await supabase
        .from('table_checks')
        .insert({
          id: checkId,
          table_id: tableId,
          order_id: tableData.current_order_id,
          status: 'presented',
          presented_at: new Date().toISOString(),
          locked_by: userId,
          subtotal: validation.subtotal,
          tax: validation.tax,
          tip: 0,
          total: validation.orderTotal,
          payment_method: null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (checkError) {
        serviceLogger.error('Failed to create check', { error: checkError });
        throw BadRequest('Failed to present check');
      }

      serviceLogger.info('Check presented', { 
        tableId, 
        checkId, 
        total: validation.orderTotal 
      });

      return this.formatTableCheck(newCheck, order);
    } catch (error) {
      serviceLogger.error('Error presenting check', { error, tableId });
      throw error;
    }
  }

  /**
   * Calculate check with tip
   */
  static async calculateWithTip(
    tableId: string, 
    tipAmount: number
  ): Promise<PaymentAmount> {
    try {
      // Get active check
      const { data: check, error } = await supabase
        .from('table_checks')
        .select('*')
        .eq('table_id', tableId)
        .eq('status', 'presented')
        .single();

      if (error || !check) {
        throw NotFound('No active check for this table');
      }

      // Update tip amount
      const newTotal = check.subtotal + check.tax + tipAmount;
      
      const { error: updateError } = await supabase
        .from('table_checks')
        .update({
          tip: tipAmount,
          total: newTotal
        })
        .eq('id', check.id);

      if (updateError) {
        throw BadRequest('Failed to update tip amount');
      }

      serviceLogger.info('Tip calculated', { 
        tableId, 
        tipAmount, 
        newTotal 
      });

      return {
        subtotal: check.subtotal,
        tax: check.tax,
        tip: tipAmount,
        total: newTotal
      };
    } catch (error) {
      serviceLogger.error('Error calculating tip', { error, tableId });
      throw error;
    }
  }

  /**
   * Process table payment
   */
  static async processTablePayment(
    tableId: string,
    paymentMethod: PaymentMethod
  ): Promise<PaymentResult> {
    const idempotencyKey = `table-${tableId}-${Date.now()}-${randomUUID()}`;
    
    try {
      // Lock table for payment
      await this.lockTableForPayment(tableId);
      
      // Get check details
      const { data: check, error } = await supabase
        .from('table_checks')
        .select('*')
        .eq('table_id', tableId)
        .eq('status', 'presented')
        .single();

      if (error || !check) {
        throw NotFound('No active check for payment');
      }

      // Update status to processing
      await supabase
        .from('table_checks')
        .update({ status: 'processing' })
        .eq('id', check.id);

      // Process based on payment method
      let paymentResult: PaymentResult;
      
      switch(paymentMethod.type) {
        case 'SQUARE_TERMINAL':
          paymentResult = await this.processTerminalPayment(
            check,
            paymentMethod,
            idempotencyKey
          );
          break;
          
        case 'WEB_SDK':
        case 'MANUAL_ENTRY':
          paymentResult = await this.processWebPayment(
            check,
            paymentMethod,
            idempotencyKey
          );
          break;
          
        case 'DIGITAL_WALLET':
          paymentResult = await this.processDigitalWallet(
            check,
            paymentMethod,
            idempotencyKey
          );
          break;
          
        case 'CASH':
          paymentResult = await this.processCashPayment(
            check,
            paymentMethod
          );
          break;
          
        default:
          throw BadRequest('Unsupported payment method');
      }

      // Update check and order status
      await this.completeTablePayment(tableId, check.id, paymentResult);
      
      serviceLogger.info('Payment processed successfully', { 
        tableId, 
        paymentId: paymentResult.id 
      });

      return paymentResult;
      
    } catch (error) {
      // Rollback on failure
      await this.unlockTable(tableId);
      serviceLogger.error('Payment processing failed', { error, tableId });
      throw error;
    }
  }

  /**
   * Process payment via Square Terminal
   */
  private static async processTerminalPayment(
    check: any,
    paymentMethod: PaymentMethod,
    idempotencyKey: string
  ): Promise<PaymentResult> {
    try {
      const amountInCents = Math.round(check.total * 100);
      
      // Create terminal checkout
      const checkoutRequest = {
        idempotencyKey,
        checkout: {
          amountMoney: {
            amount: BigInt(amountInCents),
            currency: 'USD'
          },
          deviceOptions: {
            deviceId: paymentMethod.deviceId || process.env['SQUARE_TERMINAL_ID'],
            skipReceiptScreen: true,
            collectSignature: false,
            tipSettings: {
              allowTipping: false // We handle tips in our UI
            }
          },
          referenceId: check.order_id,
          note: `Table payment - Check #${check.id.slice(0, 8)}`,
          paymentType: 'CARD_PRESENT',
          paymentOptions: {
            autocomplete: true
          }
        }
      };

      const terminalApi = squareClient.terminal;
      const { result } = await (terminalApi as any).createTerminalCheckout(checkoutRequest);
      
      if (!result.checkout) {
        throw new Error('Failed to create terminal checkout');
      }

      // Poll for completion (simplified - in production use webhooks)
      const paymentId = result.checkout.id;
      let status = result.checkout.status;
      let attempts = 0;
      
      while (status === 'PENDING' && attempts < 60) { // 1 minute timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { result: statusResult } = await (terminalApi as any).getTerminalCheckout(paymentId);
        status = statusResult.checkout?.status;
        attempts++;
      }

      if (status !== 'COMPLETED') {
        throw new Error(`Terminal payment failed with status: ${status}`);
      }

      return {
        id: paymentId,
        status: 'completed',
        paymentId,
        amount: {
          subtotal: check.subtotal,
          tax: check.tax,
          tip: check.tip,
          total: check.total
        },
        method: paymentMethod,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      serviceLogger.error('Terminal payment failed', { error });
      throw error;
    }
  }

  /**
   * Process payment via Web SDK
   */
  private static async processWebPayment(
    check: any,
    paymentMethod: PaymentMethod,
    idempotencyKey: string
  ): Promise<PaymentResult> {
    try {
      if (!paymentMethod.token) {
        throw BadRequest('Payment token required');
      }

      const amountInCents = Math.round(check.total * 100);
      
      const paymentRequest = {
        sourceId: paymentMethod.token,
        idempotencyKey,
        amountMoney: {
          amount: BigInt(amountInCents),
          currency: 'USD'
        },
        locationId: process.env['SQUARE_LOCATION_ID'],
        referenceId: check.order_id,
        note: `Table payment - Check #${check.id.slice(0, 8)}`
      };

      const paymentsApi = squareClient.payments;
      const { result } = await (paymentsApi as any).createPayment(paymentRequest);
      
      if (result.payment?.status !== 'COMPLETED') {
        throw new Error('Payment not completed');
      }

      return {
        id: result.payment.id,
        status: 'completed',
        paymentId: result.payment.id,
        amount: {
          subtotal: check.subtotal,
          tax: check.tax,
          tip: check.tip,
          total: check.total
        },
        method: paymentMethod,
        receiptUrl: result.payment.receiptUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      serviceLogger.error('Web payment failed', { error });
      throw error;
    }
  }

  /**
   * Process digital wallet payment
   */
  private static async processDigitalWallet(
    check: any,
    paymentMethod: PaymentMethod,
    idempotencyKey: string
  ): Promise<PaymentResult> {
    // Similar to web payment but with wallet-specific handling
    return this.processWebPayment(check, paymentMethod, idempotencyKey);
  }

  /**
   * Process cash payment
   */
  private static async processCashPayment(
    check: any,
    paymentMethod: PaymentMethod
  ): Promise<PaymentResult> {
    const tenderedAmount = paymentMethod.tenderedAmount || check.total;
    const changeAmount = tenderedAmount - check.total;
    
    if (changeAmount < 0) {
      throw BadRequest('Insufficient cash tendered');
    }

    // Record cash payment
    const paymentId = `cash-${randomUUID()}`;
    
    return {
      id: paymentId,
      status: 'completed',
      paymentId,
      amount: {
        subtotal: check.subtotal,
        tax: check.tax,
        tip: check.tip,
        total: check.total
      },
      method: paymentMethod,
      changeAmount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Complete table payment and update records
   */
  private static async completeTablePayment(
    tableId: string,
    checkId: string,
    paymentResult: PaymentResult
  ): Promise<void> {
    // Update check status
    await supabase
      .from('table_checks')
      .update({
        status: 'paid',
        payment_method: paymentResult.method.type,
        payment_id: paymentResult.paymentId,
        paid_at: new Date().toISOString()
      })
      .eq('id', checkId);

    // Get table data
    const { data: tableData } = await supabase
      .from('tables')
      .select('restaurant_id, current_order_id')
      .eq('id', tableId)
      .single();

    if (tableData?.current_order_id) {
      // Update order payment status
      await OrdersService.updateOrderPayment(
        tableData.restaurant_id,
        tableData.current_order_id,
        'paid',
        paymentResult.method.type === 'CASH' ? 'cash' : 'card',
        paymentResult.paymentId
      );

      // Update order status to completed
      await OrdersService.updateOrderStatus(
        tableData.restaurant_id,
        tableData.current_order_id,
        'completed'
      );

      // Clear table
      await supabase
        .from('tables')
        .update({
          status: 'available',
          current_order_id: null
        })
        .eq('id', tableId);
    }
  }

  /**
   * Lock table for payment processing
   */
  private static async lockTableForPayment(tableId: string): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .update({ 
        status: 'payment_processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', tableId)
      .eq('status', 'occupied');

    if (error) {
      throw BadRequest('Table is already being processed');
    }
  }

  /**
   * Unlock table after payment failure
   */
  private static async unlockTable(tableId: string): Promise<void> {
    await supabase
      .from('tables')
      .update({ 
        status: 'occupied',
        updated_at: new Date().toISOString()
      })
      .eq('id', tableId);

    // Also reset check status if exists
    await supabase
      .from('table_checks')
      .update({ status: 'presented' })
      .eq('table_id', tableId)
      .eq('status', 'processing');
  }

  /**
   * Format table check for response
   */
  private static formatTableCheck(checkData: any, order: any): TableCheck {
    return {
      id: checkData.id,
      tableId: checkData.table_id,
      orderId: checkData.order_id,
      status: checkData.status,
      presentedAt: checkData.presented_at,
      lockedBy: checkData.locked_by,
      subtotal: checkData.subtotal,
      tax: checkData.tax,
      tip: checkData.tip,
      total: checkData.total,
      items: order.items || [],
      createdAt: checkData.created_at
    };
  }
}