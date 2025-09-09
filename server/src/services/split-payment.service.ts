import { logger } from '../utils/logger';
import { supabase } from '../config/database';
import { BadRequest, NotFound } from '../middleware/errorHandler';
import { randomUUID } from 'crypto';
import { SquareClient, SquareEnvironment } from 'square';
import { PaymentFlowService, PaymentMethod, PaymentResult } from './payment-flow.service';
import { TipCalculationService } from './tip-calculation.service';

const serviceLogger = logger.child({ service: 'split-payment' });

export interface SplitPayment {
  id: string;
  checkId: string;
  amount: number;
  tipAmount: number;
  total: number;
  payerId?: string;
  payerName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  items?: any[];
  createdAt: string;
  paidAt?: string;
}

export interface SplitSession {
  id: string;
  tableId: string;
  checkId: string;
  totalAmount: number;
  splits: SplitPayment[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export class SplitPaymentService {
  private static readonly MAX_SPLITS = 10;
  private static readonly SESSION_TIMEOUT_MS = 1800000; // 30 minutes

  /**
   * Create a split payment session
   */
  static async createSplitSession(
    tableId: string,
    numSplits: number,
    strategy: 'EVEN' | 'CUSTOM' = 'EVEN'
  ): Promise<SplitSession> {
    try {
      if (numSplits < 2 || numSplits > this.MAX_SPLITS) {
        throw BadRequest(`Number of splits must be between 2 and ${this.MAX_SPLITS}`);
      }

      // Get current check
      const { data: check, error: checkError } = await supabase
        .from('table_checks')
        .select('*')
        .eq('table_id', tableId)
        .eq('status', 'presented')
        .single();

      if (checkError || !check) {
        throw NotFound('No active check for this table');
      }

      // Create session
      const sessionId = randomUUID();
      const splits: SplitPayment[] = [];

      if (strategy === 'EVEN') {
        // Calculate even splits with penny handling
        const baseAmount = Math.floor(check.total * 100 / numSplits) / 100;
        const remainder = Math.round((check.total * 100) % numSplits);

        for (let i = 0; i < numSplits; i++) {
          const splitAmount = baseAmount + (i < remainder ? 0.01 : 0);
          
          splits.push({
            id: randomUUID(),
            checkId: check.id,
            amount: splitAmount,
            tipAmount: 0, // Tips calculated separately per split
            total: splitAmount,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
        }
      }

      // Store session
      const session: SplitSession = {
        id: sessionId,
        tableId,
        checkId: check.id,
        totalAmount: check.total,
        splits,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Save to database
      await supabase
        .from('split_sessions')
        .insert({
          id: session.id,
          table_id: tableId,
          check_id: check.id,
          total_amount: check.total,
          num_splits: numSplits,
          strategy,
          status: 'active',
          splits: splits,
          created_at: session.createdAt
        });

      serviceLogger.info('Split session created', {
        sessionId,
        tableId,
        numSplits,
        strategy
      });

      return session;
    } catch (error) {
      serviceLogger.error('Error creating split session', { error, tableId });
      throw error;
    }
  }

  /**
   * Process payment for a specific split
   */
  static async processSplitPayment(
    sessionId: string,
    splitId: string,
    paymentMethod: PaymentMethod,
    tipAmount: number = 0
  ): Promise<PaymentResult> {
    try {
      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('split_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('status', 'active')
        .single();

      if (sessionError || !session) {
        throw NotFound('Split session not found or expired');
      }

      // Find the split
      const splits = session.splits as SplitPayment[];
      const splitIndex = splits.findIndex(s => s.id === splitId);
      
      if (splitIndex === -1) {
        throw NotFound('Split not found in session');
      }

      const split = splits[splitIndex];
      
      if (split.status !== 'pending') {
        throw BadRequest('Split has already been processed');
      }

      // Update split status to processing
      split.status = 'processing';
      split.tipAmount = tipAmount;
      split.total = split.amount + tipAmount;
      
      await supabase
        .from('split_sessions')
        .update({ splits })
        .eq('id', sessionId);

      // Process payment
      const idempotencyKey = `split-${splitId}-${Date.now()}`;
      let paymentResult: PaymentResult;

      try {
        // Create temporary check for this split payment
        const tempCheckId = `split-check-${splitId}`;
        
        // Use payment flow service for actual processing
        paymentResult = await this.processSplitPaymentMethod(
          split,
          paymentMethod,
          idempotencyKey
        );

        // Update split as completed
        split.status = 'completed';
        split.paymentId = paymentResult.paymentId;
        split.paymentMethod = paymentMethod;
        split.paidAt = new Date().toISOString();

      } catch (paymentError) {
        // Revert split status on failure
        split.status = 'pending';
        split.tipAmount = 0;
        split.total = split.amount;
        
        await supabase
          .from('split_sessions')
          .update({ splits })
          .eq('id', sessionId);
        
        throw paymentError;
      }

      // Update session with completed split
      await supabase
        .from('split_sessions')
        .update({ splits })
        .eq('id', sessionId);

      // Check if all splits are complete
      const allComplete = splits.every(s => s.status === 'completed');
      
      if (allComplete) {
        await this.completeSplitSession(sessionId);
      }

      serviceLogger.info('Split payment processed', {
        sessionId,
        splitId,
        paymentId: paymentResult.paymentId
      });

      return paymentResult;
    } catch (error) {
      serviceLogger.error('Error processing split payment', { error, sessionId, splitId });
      throw error;
    }
  }

  /**
   * Process payment method for a split
   */
  private static async processSplitPaymentMethod(
    split: SplitPayment,
    paymentMethod: PaymentMethod,
    idempotencyKey: string
  ): Promise<PaymentResult> {
    const amountInCents = Math.round(split.total * 100);
    
    // Use Square payment processing based on method
    const squareClient = new SquareClient({
      environment: process.env['SQUARE_ENVIRONMENT'] === 'production' 
        ? SquareEnvironment.Production 
        : SquareEnvironment.Sandbox,
      accessToken: process.env['SQUARE_ACCESS_TOKEN']!
    } as any);

    switch (paymentMethod.type) {
      case 'WEB_SDK':
      case 'MANUAL_ENTRY':
        if (!paymentMethod.token) {
          throw BadRequest('Payment token required');
        }

        const paymentRequest = {
          sourceId: paymentMethod.token,
          idempotencyKey,
          amountMoney: {
            amount: BigInt(amountInCents),
            currency: 'USD'
          },
          locationId: process.env['SQUARE_LOCATION_ID'],
          referenceId: split.id,
          note: `Split payment ${split.id.slice(0, 8)}`
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
            subtotal: split.amount - split.tipAmount,
            tax: 0,
            tip: split.tipAmount,
            total: split.total
          },
          method: paymentMethod,
          receiptUrl: result.payment.receiptUrl,
          timestamp: new Date().toISOString()
        };

      case 'CASH':
        const changeAmount = (paymentMethod.tenderedAmount || split.total) - split.total;
        
        return {
          id: `cash-split-${randomUUID()}`,
          status: 'completed',
          amount: {
            subtotal: split.amount - split.tipAmount,
            tax: 0,
            tip: split.tipAmount,
            total: split.total
          },
          method: paymentMethod,
          changeAmount,
          timestamp: new Date().toISOString()
        };

      default:
        throw BadRequest('Unsupported payment method for split payments');
    }
  }

  /**
   * Complete a split session when all payments are done
   */
  private static async completeSplitSession(sessionId: string): Promise<void> {
    try {
      // Update session status
      const { data: session, error } = await supabase
        .from('split_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update main check as paid
      await supabase
        .from('table_checks')
        .update({
          status: 'paid',
          payment_method: 'split',
          paid_at: new Date().toISOString()
        })
        .eq('id', session.check_id);

      // Clear table
      await supabase
        .from('tables')
        .update({
          status: 'available',
          current_order_id: null
        })
        .eq('id', session.table_id);

      serviceLogger.info('Split session completed', { sessionId });
    } catch (error) {
      serviceLogger.error('Error completing split session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Cancel a split session
   */
  static async cancelSplitSession(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('split_sessions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      serviceLogger.info('Split session cancelled', { sessionId });
    } catch (error) {
      serviceLogger.error('Error cancelling split session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get split session status
   */
  static async getSplitSession(sessionId: string): Promise<SplitSession> {
    try {
      const { data: session, error } = await supabase
        .from('split_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        throw NotFound('Split session not found');
      }

      // Check for timeout
      const createdAt = new Date(session.created_at).getTime();
      const now = Date.now();
      
      if (session.status === 'active' && (now - createdAt) > this.SESSION_TIMEOUT_MS) {
        await this.cancelSplitSession(sessionId);
        session.status = 'cancelled';
      }

      return {
        id: session.id,
        tableId: session.table_id,
        checkId: session.check_id,
        totalAmount: session.total_amount,
        splits: session.splits,
        status: session.status,
        createdAt: session.created_at,
        completedAt: session.completed_at
      };
    } catch (error) {
      serviceLogger.error('Error getting split session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Update split allocation (for custom splitting)
   */
  static async updateSplitAllocation(
    sessionId: string,
    splitAllocations: Array<{ splitId: string; amount: number }>
  ): Promise<SplitSession> {
    try {
      const session = await this.getSplitSession(sessionId);
      
      if (session.status !== 'active') {
        throw BadRequest('Cannot modify completed or cancelled session');
      }

      // Validate total matches
      const newTotal = splitAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const tolerance = 0.01;
      
      if (Math.abs(newTotal - session.totalAmount) > tolerance) {
        throw BadRequest(`Split amounts must equal check total: $${session.totalAmount}`);
      }

      // Update splits
      const splits = session.splits;
      
      for (const allocation of splitAllocations) {
        const split = splits.find(s => s.id === allocation.splitId);
        if (split && split.status === 'pending') {
          split.amount = allocation.amount;
          split.total = allocation.amount; // Will be updated with tip
        }
      }

      // Save updated splits
      await supabase
        .from('split_sessions')
        .update({ splits })
        .eq('id', sessionId);

      session.splits = splits;
      
      serviceLogger.info('Split allocations updated', { sessionId });
      
      return session;
    } catch (error) {
      serviceLogger.error('Error updating split allocation', { error, sessionId });
      throw error;
    }
  }
}