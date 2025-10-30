import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { NotFound } from '../middleware/errorHandler';

const tableLogger = logger.child({ service: 'TableService' });

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: number;
  label: string;
  capacity: number;
  section?: string;
  status: 'available' | 'occupied' | 'reserved' | 'paid';
  x_pos?: number;
  y_pos?: number;
  shape?: string;
  z_index?: number;
  rotation?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export class TableService {
  /**
   * Update table status after payment
   * Checks if all orders for the table are paid, then updates table status to 'paid'
   * This method prepares for Phase 3 real-time events
   */
  static async updateStatusAfterPayment(
    tableId: string,
    restaurantId: string
  ): Promise<Table> {
    try {
      tableLogger.info('Updating table status after payment', {
        tableId,
        restaurantId
      });

      // Get the table first to validate it exists and get table_number
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (tableError || !table) {
        tableLogger.error('Table not found', { tableId, restaurantId, tableError });
        throw NotFound('Table not found');
      }

      // Check if all orders for this table are paid
      // Query orders with this table's label (table_number column maps to label)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, payment_status, status, table_number')
        .eq('restaurant_id', restaurantId)
        .eq('table_number', table.label)
        .neq('status', 'cancelled'); // Ignore cancelled orders

      if (ordersError) {
        tableLogger.error('Failed to fetch orders for table', {
          tableId,
          restaurantId,
          ordersError
        });
        throw ordersError;
      }

      // If no orders, or all orders are paid, update table to 'paid'
      const allOrdersPaid = orders && orders.length > 0
        ? orders.every((order: any) => order.payment_status === 'paid')
        : false;

      if (allOrdersPaid) {
        tableLogger.info('All orders paid, updating table status to paid', {
          tableId,
          tableLabel: table.label,
          orderCount: orders.length
        });

        const { data: updatedTable, error: updateError } = await supabase
          .from('tables')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', tableId)
          .eq('restaurant_id', restaurantId)
          .select()
          .single();

        if (updateError) {
          tableLogger.error('Failed to update table status', {
            tableId,
            restaurantId,
            updateError
          });
          throw updateError;
        }

        // TODO: Phase 3 - Emit Supabase real-time event for status change
        // This will notify all connected clients about the table status update
        // await supabase.channel('tables').send({
        //   type: 'broadcast',
        //   event: 'table_status_updated',
        //   payload: { table_id: tableId, status: 'paid', restaurant_id: restaurantId }
        // });

        tableLogger.info('Table status updated to paid', {
          tableId,
          tableLabel: table.label
        });

        return updatedTable as Table;
      } else {
        tableLogger.info('Not all orders are paid yet, table status unchanged', {
          tableId,
          tableLabel: table.label,
          totalOrders: orders?.length || 0,
          paidOrders: orders?.filter((o: any) => o.payment_status === 'paid').length || 0
        });

        return table as Table;
      }
    } catch (error) {
      tableLogger.error('Failed to update table status after payment', {
        error,
        tableId,
        restaurantId
      });
      throw error;
    }
  }

  /**
   * Get table by ID
   */
  static async getTable(
    tableId: string,
    restaurantId: string
  ): Promise<Table | null> {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as Table;
    } catch (error) {
      tableLogger.error('Failed to fetch table', { error, tableId, restaurantId });
      throw error;
    }
  }

  /**
   * Get table by label (table number)
   */
  static async getTableByLabel(
    label: string,
    restaurantId: string
  ): Promise<Table | null> {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('label', label)
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as Table;
    } catch (error) {
      tableLogger.error('Failed to fetch table by label', { error, label, restaurantId });
      throw error;
    }
  }
}
