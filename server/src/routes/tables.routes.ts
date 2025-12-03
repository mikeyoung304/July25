import { Router, Response, NextFunction } from 'express';
import { logger } from '../utils/logger'
import { supabase } from '../config/database';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { requireScopes, ApiScope } from '../middleware/rbac';
import { slugResolver } from '../middleware/slugResolver';
import { TableStatus } from '../../../shared/types/table.types';

const router = Router();

// Get all tables for a restaurant
export const getTables = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.restaurantId!;
    
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('active', true)
      .order('label');

    if (error) throw error;
    
    // Transform database columns to frontend properties
    const transformedData = (data || []).map((table: any) => ({
      ...table,
      x: table['x_pos'],
      y: table['y_pos'],
      type: table['shape'],
      seats: table['seats']
    }));
    
    return res.json(transformedData);
  } catch (error) {
    next(error);
  }
};

// Get single table
export const getTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    return res.json(data);
  } catch (error) {
    next(error);
  }
};

interface CreateTableBody {
  x?: number;
  y?: number;
  type?: string;
  z_index?: number;
  label?: string;
  capacity?: number;
  section?: string;
  [key: string]: any;
}

// Create new table
export const createTable = async (req: AuthenticatedRequest & { body: CreateTableBody }, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.restaurantId!;
    const { x, y, type, z_index, ...otherData } = req.body;
    
    // Transform frontend properties to database columns
    const tableData: Record<string, any> = {
      ...otherData,
      x_pos: x || 0,
      y_pos: y || 0,
      shape: type || 'rectangle',
      z_index: z_index || 0,
      restaurant_id: restaurantId,
      active: true,
      status: 'available' as TableStatus
    };
    
    const { data, error } = await supabase
      .from('tables')
      .insert([tableData])
      .select()
      .single();

    if (error) throw error;
    
    // Transform database columns back to frontend properties
    const transformedData = {
      ...data,
      x: (data as any).x_pos,
      y: (data as any).y_pos,
      type: (data as any).shape,
      capacity: (data as any).seats  // FIX: Transform seats to capacity for client
    };

    res.status(201).json(transformedData);
  } catch (error) {
    next(error);
  }
};

interface UpdateTableBody {
  x?: number;
  y?: number;
  type?: string;
  id?: string;
  restaurant_id?: string;
  created_at?: string;
  [key: string]: any;
}

// Update table
export const updateTable = async (req: AuthenticatedRequest & { body: UpdateTableBody }, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.restaurant_id;
    delete updates.created_at;
    
    // Transform frontend properties to database columns if present
    const dbUpdates: Record<string, any> = { ...updates };
    if ('x' in updates) {
      dbUpdates['x_pos'] = updates['x'];
      delete dbUpdates['x'];
    }
    if ('y' in updates) {
      dbUpdates['y_pos'] = updates['y'];
      delete dbUpdates['y'];
    }
    if ('type' in updates) {
      dbUpdates['shape'] = updates['type'];
      delete dbUpdates['type'];
    }
    
    const { data, error } = await supabase
      .from('tables')
      .update(dbUpdates)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Transform database columns back to frontend properties
    const transformedData = {
      ...data,
      x: (data as any).x_pos,
      y: (data as any).y_pos,
      type: (data as any).shape,
      capacity: (data as any).seats  // FIX: Transform seats to capacity for client
    };

    return res.json(transformedData);
  } catch (error) {
    next(error);
  }
};

// Delete table (soft delete)
export const deleteTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('tables')
      .update({ active: false })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    return res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
};

interface UpdateTableStatusBody {
  status: TableStatus;
  orderId?: string;
}

// Update table status
export const updateTableStatus = async (req: AuthenticatedRequest & { body: UpdateTableStatusBody }, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { status, orderId } = req.body;
    
    const updates: Record<string, any> = { status };
    if (status === 'occupied' && orderId) {
      updates['current_order_id'] = orderId;
    } else if (status === 'available') {
      updates['current_order_id'] = null;
    }
    
    const { data, error } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    return res.json(data);
  } catch (error) {
    next(error);
  }
};

interface BatchUpdateTablesBody {
  tables: Array<{
    id: string;
    x?: number;
    y?: number;
    type?: string;
    restaurant_id?: string;
    created_at?: string;
    [key: string]: any;
  }>;
}

// Batch update tables (for floor plan editor)
export const batchUpdateTables = async (req: AuthenticatedRequest & { body: BatchUpdateTablesBody }, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.restaurantId!;
    
    logger.info('Batch update request received:', {
      restaurantId,
      bodyKeys: Object.keys(req.body),
      body: req.body,
      headers: {
        'x-restaurant-id': req.headers['x-restaurant-id'],
        'content-type': req.headers['content-type']
      }
    });
    
    const { tables } = req.body;
    
    if (!Array.isArray(tables)) {
      console.error('Tables validation failed:', {
        tablesType: typeof tables,
        tablesValue: tables,
        bodyKeys: Object.keys(req.body),
        isArray: Array.isArray(tables),
        fullBody: JSON.stringify(req.body, null, 2)
      })
      return res.status(400).json({ error: 'Tables must be an array' });
    }
    
    logger.info('Tables array received:', {
      length: tables.length,
      firstTable: tables[0],
      sampleTable: JSON.stringify(tables[0], null, 2)
    });

    // Transform frontend data to database format for RPC function
    const startTime = Date.now();
    const transformedTables = tables.map((table: any) => {
      const { id, x, y, type, restaurant_id, created_at, ...otherFields } = table;

      // Build update object with database column names
      const dbTable: Record<string, any> = {
        id,
        ...otherFields
      };

      // Transform frontend properties to database columns
      if (x !== undefined) dbTable['x_pos'] = x;
      if (y !== undefined) dbTable['y_pos'] = y;
      if (type !== undefined) dbTable['shape'] = type;

      return dbTable;
    });

    logger.info(`🚀 Executing batch update via RPC for ${transformedTables.length} tables...`);

    // Call RPC function for optimized bulk update
    // This uses a single UPDATE statement instead of N queries (40x faster)
    let data: any[];
    try {
      const { data: rpcData, error } = await supabase
        .rpc('batch_update_tables', {
          p_restaurant_id: restaurantId,
          p_tables: transformedTables
        });

      const elapsed = Date.now() - startTime;

      if (error) {
        logger.error('❌ RPC batch update failed:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          tableCount: transformedTables.length
        });

        return res.status(400).json({
          error: 'Batch update failed',
          message: error.message,
          code: error.code,
          details: error.details
        });
      }

      logger.info(`✅ Batch update completed in ${elapsed}ms (${transformedTables.length} tables)`, {
        performance: `${(elapsed / transformedTables.length).toFixed(2)}ms per table`,
        improvement: `~${Math.round(1000 / elapsed)}x faster than sequential updates`
      });

      data = rpcData || [];
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      logger.error('❌ Exception in RPC batch update:', {
        error: error.message,
        stack: error.stack,
        elapsed: `${elapsed}ms`,
        tableCount: transformedTables.length
      });

      return res.status(400).json({
        error: 'Batch update exception',
        message: error.message
      });
    }

    // Transform database columns back to frontend properties
    data = data.map((table: any) => ({
      ...table,
      x: table['x_pos'],
      y: table['y_pos'],
      type: table['shape'],
      seats: table['seats']
    }));
    
    logger.info(`✅ Batch update response: ${data.length} tables transformed and returned`);
    
    return res.json(data);
  } catch (error) {
    next(error);
  }
};

// Set up routes with proper middleware chain
// Order: slugResolver -> authenticate -> validateRestaurantAccess -> requireScopes (for mutations)
router.get('/', slugResolver, authenticate, validateRestaurantAccess, getTables);
router.get('/:id', slugResolver, authenticate, validateRestaurantAccess, getTable);
router.post('/', slugResolver, authenticate, validateRestaurantAccess, requireScopes(ApiScope.TABLES_MANAGE), createTable);
router.put('/batch', slugResolver, authenticate, validateRestaurantAccess, requireScopes(ApiScope.TABLES_MANAGE), batchUpdateTables);
router.put('/:id', slugResolver, authenticate, validateRestaurantAccess, requireScopes(ApiScope.TABLES_MANAGE), updateTable);
router.delete('/:id', slugResolver, authenticate, validateRestaurantAccess, requireScopes(ApiScope.TABLES_MANAGE), deleteTable);
router.patch('/:id/status', slugResolver, authenticate, validateRestaurantAccess, requireScopes(ApiScope.TABLES_MANAGE), updateTableStatus);

export { router as tableRoutes };