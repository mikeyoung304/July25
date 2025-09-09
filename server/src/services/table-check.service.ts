import { logger } from '../utils/logger';
import { supabase } from '../config/database';
import { BadRequest, NotFound } from '../middleware/errorHandler';
import { randomUUID } from 'crypto';

const serviceLogger = logger.child({ service: 'table-check' });

export interface CheckItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: any[];
  specialInstructions?: string;
  seat?: number;
}

export interface CheckSummary {
  id: string;
  tableId: string;
  tableName: string;
  orderId: string;
  orderNumber: string;
  items: CheckItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  status: string;
  serverName?: string;
  presentedAt?: string;
  paidAt?: string;
}

export interface SplitCheckRequest {
  strategy: 'EVEN' | 'BY_SEAT' | 'BY_ITEM' | 'CUSTOM';
  splits: SplitAllocation[];
}

export interface SplitAllocation {
  id: string;
  items?: string[]; // Item IDs for BY_ITEM strategy
  seats?: number[]; // Seat numbers for BY_SEAT strategy
  amount?: number; // Custom amount for CUSTOM strategy
  payerId?: string; // Optional identifier for the payer
}

export interface SplitCheckResult {
  checkId: string;
  splits: SplitCheck[];
  totalAmount: number;
}

export interface SplitCheck {
  id: string;
  checkId: string;
  items: CheckItem[];
  subtotal: number;
  tax: number;
  suggestedTip: number;
  total: number;
  status: 'pending' | 'paid';
  paymentId?: string;
}

export class TableCheckService {
  /**
   * Get check summary for a table
   */
  static async getTableCheck(tableId: string): Promise<CheckSummary> {
    try {
      // Get table with current order
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('*, current_order_id')
        .eq('id', tableId)
        .single();

      if (tableError || !table) {
        throw NotFound('Table not found');
      }

      if (!table.current_order_id) {
        throw BadRequest('No active order for this table');
      }

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', table.current_order_id)
        .single();

      if (orderError || !order) {
        throw NotFound('Order not found');
      }

      // Get existing check if presented
      const { data: check } = await supabase
        .from('table_checks')
        .select('*')
        .eq('table_id', tableId)
        .eq('order_id', table.current_order_id)
        .single();

      // Calculate totals
      const subtotal = order.items?.reduce((sum: number, item: any) => {
        const itemTotal = item.price * item.quantity;
        const modifierTotal = item.modifiers?.reduce((modSum: number, mod: any) => 
          modSum + (mod.price || 0), 0) || 0;
        return sum + itemTotal + (modifierTotal * item.quantity);
      }, 0) || 0;

      const taxRate = 0.08; // TODO: Get from restaurant settings
      const tax = subtotal * taxRate;
      const tip = check?.tip || 0;
      const total = subtotal + tax + tip;

      return {
        id: check?.id || randomUUID(),
        tableId: table.id,
        tableName: table.label,
        orderId: order.id,
        orderNumber: order.order_number,
        items: order.items || [],
        subtotal,
        tax,
        tip,
        total,
        status: check?.status || 'open',
        serverName: order.server_name,
        presentedAt: check?.presented_at,
        paidAt: check?.paid_at
      };
    } catch (error) {
      serviceLogger.error('Error getting table check', { error, tableId });
      throw error;
    }
  }

  /**
   * Split check based on strategy
   */
  static async splitCheck(
    tableId: string,
    request: SplitCheckRequest
  ): Promise<SplitCheckResult> {
    try {
      const check = await this.getTableCheck(tableId);
      
      let splits: SplitCheck[];
      
      switch(request.strategy) {
        case 'EVEN':
          splits = await this.splitEvenly(check, request.splits.length);
          break;
          
        case 'BY_SEAT':
          splits = await this.splitBySeat(check, request.splits);
          break;
          
        case 'BY_ITEM':
          splits = await this.splitByItem(check, request.splits);
          break;
          
        case 'CUSTOM':
          splits = await this.splitCustom(check, request.splits);
          break;
          
        default:
          throw BadRequest('Invalid split strategy');
      }

      // Store split information
      for (const split of splits) {
        await supabase
          .from('payment_splits')
          .insert({
            id: split.id,
            check_id: check.id,
            amount: split.total,
            status: 'pending',
            items: split.items,
            created_at: new Date().toISOString()
          });
      }

      serviceLogger.info('Check split created', { 
        tableId, 
        strategy: request.strategy,
        numSplits: splits.length 
      });

      return {
        checkId: check.id,
        splits,
        totalAmount: check.total
      };
    } catch (error) {
      serviceLogger.error('Error splitting check', { error, tableId });
      throw error;
    }
  }

  /**
   * Split check evenly among all parties
   */
  private static async splitEvenly(
    check: CheckSummary,
    numSplits: number
  ): Promise<SplitCheck[]> {
    if (numSplits < 2) {
      throw BadRequest('Minimum 2 splits required');
    }

    // Calculate base amount and remainder for penny handling
    const baseAmount = Math.floor(check.total * 100 / numSplits) / 100;
    const remainder = Math.round((check.total * 100) % numSplits);
    
    const splits: SplitCheck[] = [];
    
    // Distribute items proportionally
    const itemsPerSplit = Math.ceil(check.items.length / numSplits);
    
    for (let i = 0; i < numSplits; i++) {
      const splitItems = check.items.slice(
        i * itemsPerSplit,
        (i + 1) * itemsPerSplit
      );
      
      // Add penny to first n splits for remainder
      const splitTotal = baseAmount + (i < remainder ? 0.01 : 0);
      const splitSubtotal = splitTotal / 1.08; // Remove tax
      const splitTax = splitTotal - splitSubtotal;
      
      splits.push({
        id: randomUUID(),
        checkId: check.id,
        items: splitItems,
        subtotal: Number(splitSubtotal.toFixed(2)),
        tax: Number(splitTax.toFixed(2)),
        suggestedTip: Number((splitSubtotal * 0.20).toFixed(2)),
        total: splitTotal,
        status: 'pending'
      });
    }
    
    return splits;
  }

  /**
   * Split check by seat assignments
   */
  private static async splitBySeat(
    check: CheckSummary,
    allocations: SplitAllocation[]
  ): Promise<SplitCheck[]> {
    const splits: SplitCheck[] = [];
    
    for (const allocation of allocations) {
      if (!allocation.seats || allocation.seats.length === 0) {
        continue;
      }
      
      // Filter items for these seats
      const seatItems = check.items.filter(item => 
        allocation.seats?.includes(item.seat || 0)
      );
      
      if (seatItems.length === 0) {
        continue;
      }
      
      // Calculate totals for these items
      const subtotal = seatItems.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const modifierTotal = item.modifiers?.reduce((modSum: number, mod: any) => 
          modSum + (mod.price || 0), 0) || 0;
        return sum + itemTotal + (modifierTotal * item.quantity);
      }, 0);
      
      const tax = subtotal * 0.08;
      const suggestedTip = subtotal * 0.20;
      const total = subtotal + tax;
      
      splits.push({
        id: randomUUID(),
        checkId: check.id,
        items: seatItems,
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        suggestedTip: Number(suggestedTip.toFixed(2)),
        total: Number(total.toFixed(2)),
        status: 'pending'
      });
    }
    
    return splits;
  }

  /**
   * Split check by selected items
   */
  private static async splitByItem(
    check: CheckSummary,
    allocations: SplitAllocation[]
  ): Promise<SplitCheck[]> {
    const splits: SplitCheck[] = [];
    const assignedItems = new Set<string>();
    
    for (const allocation of allocations) {
      if (!allocation.items || allocation.items.length === 0) {
        continue;
      }
      
      // Get items for this split
      const splitItems = check.items.filter(item => 
        allocation.items?.includes(item.id) && !assignedItems.has(item.id)
      );
      
      if (splitItems.length === 0) {
        continue;
      }
      
      // Mark items as assigned
      splitItems.forEach(item => assignedItems.add(item.id));
      
      // Calculate totals
      const subtotal = splitItems.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const modifierTotal = item.modifiers?.reduce((modSum: number, mod: any) => 
          modSum + (mod.price || 0), 0) || 0;
        return sum + itemTotal + (modifierTotal * item.quantity);
      }, 0);
      
      const tax = subtotal * 0.08;
      const suggestedTip = subtotal * 0.20;
      const total = subtotal + tax;
      
      splits.push({
        id: randomUUID(),
        checkId: check.id,
        items: splitItems,
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        suggestedTip: Number(suggestedTip.toFixed(2)),
        total: Number(total.toFixed(2)),
        status: 'pending'
      });
    }
    
    // Handle unassigned items
    const unassignedItems = check.items.filter(item => !assignedItems.has(item.id));
    if (unassignedItems.length > 0) {
      // Add to first split or create new one
      if (splits.length > 0) {
        splits[0].items.push(...unassignedItems);
        // Recalculate totals for first split
        const subtotal = splits[0].items.reduce((sum, item) => {
          const itemTotal = item.price * item.quantity;
          const modifierTotal = item.modifiers?.reduce((modSum: number, mod: any) => 
            modSum + (mod.price || 0), 0) || 0;
          return sum + itemTotal + (modifierTotal * item.quantity);
        }, 0);
        
        splits[0].subtotal = Number(subtotal.toFixed(2));
        splits[0].tax = Number((subtotal * 0.08).toFixed(2));
        splits[0].suggestedTip = Number((subtotal * 0.20).toFixed(2));
        splits[0].total = Number((subtotal * 1.08).toFixed(2));
      }
    }
    
    return splits;
  }

  /**
   * Split check with custom amounts
   */
  private static async splitCustom(
    check: CheckSummary,
    allocations: SplitAllocation[]
  ): Promise<SplitCheck[]> {
    const splits: SplitCheck[] = [];
    let totalAllocated = 0;
    
    for (const allocation of allocations) {
      if (!allocation.amount || allocation.amount <= 0) {
        continue;
      }
      
      totalAllocated += allocation.amount;
      
      if (totalAllocated > check.total) {
        throw BadRequest('Split amounts exceed check total');
      }
      
      // Calculate proportional tax
      const proportion = allocation.amount / check.total;
      const subtotal = check.subtotal * proportion;
      const tax = check.tax * proportion;
      
      splits.push({
        id: randomUUID(),
        checkId: check.id,
        items: [], // Custom splits don't have specific items
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        suggestedTip: Number((subtotal * 0.20).toFixed(2)),
        total: allocation.amount,
        status: 'pending'
      });
    }
    
    // Validate total matches
    const tolerance = 0.01; // Allow 1 cent difference for rounding
    if (Math.abs(totalAllocated - check.total) > tolerance) {
      throw BadRequest(`Split amounts must equal check total. Expected: $${check.total}, Got: $${totalAllocated}`);
    }
    
    return splits;
  }

  /**
   * Mark split payment as complete
   */
  static async completeSplitPayment(
    splitId: string,
    paymentId: string
  ): Promise<void> {
    try {
      await supabase
        .from('payment_splits')
        .update({
          status: 'completed',
          payment_id: paymentId,
          paid_at: new Date().toISOString()
        })
        .eq('id', splitId);

      // Check if all splits are paid
      const { data: splits } = await supabase
        .from('payment_splits')
        .select('*')
        .eq('check_id', (
          await supabase
            .from('payment_splits')
            .select('check_id')
            .eq('id', splitId)
            .single()
        ).data?.check_id);

      const allPaid = splits?.every(split => split.status === 'completed');
      
      if (allPaid) {
        // Mark check as paid
        const checkId = splits[0].check_id;
        await supabase
          .from('table_checks')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', checkId);
      }

      serviceLogger.info('Split payment completed', { splitId, paymentId });
    } catch (error) {
      serviceLogger.error('Error completing split payment', { error, splitId });
      throw error;
    }
  }
}