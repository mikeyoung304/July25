import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger'
import { supabase } from '../config/database';
import { validateRestaurantAccess, AuthenticatedRequest } from '../middleware/auth';
import { getConfig } from '../config/environment';
import { Table, TableStatus } from '../../../shared/types/table.types';

const router = Router();
const config = getConfig();

// Apply restaurant validation to all routes (skip in development for testing)
if (config.nodeEnv !== 'development') {
  router.use(validateRestaurantAccess);
} else {
  // Development middleware - just ensure restaurant ID is present
  router.use((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
    if (!restaurantId) {
      return next(new Error('Restaurant ID is required'));
    }
    req.restaurantId = restaurantId;
    next();
  });
}

// Get all tables for a restaurant
export const getTables = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
    
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
      type: table['shape']
    }));
    
    return res.json(transformedData);
  } catch (error) {
    next(error);
  }
};

// Get single table
export const getTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
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
    const restaurantId = req.headers['x-restaurant-id'] as string;
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
      type: (data as any).shape
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
    const restaurantId = req.headers['x-restaurant-id'] as string;
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.restaurant_id;
    delete updates.created_at;
    
    // Transform frontend properties to database columns if present
    const dbUpdates: Record<string, any> = { ...updates };
    if ('x' in updates) {
      dbUpdates.x_pos = updates.x;
      delete dbUpdates.x;
    }
    if ('y' in updates) {
      dbUpdates.y_pos = updates.y;
      delete dbUpdates.y;
    }
    if ('type' in updates) {
      dbUpdates.shape = updates.type;
      delete dbUpdates.type;
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
      type: (data as any).shape
    };
    
    return res.json(transformedData);
  } catch (error) {
    next(error);
  }
};

// Delete table (soft delete)
export const deleteTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
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
    const restaurantId = req.headers['x-restaurant-id'] as string;
    const { id } = req.params;
    const { status, orderId } = req.body;
    
    const updates: Record<string, any> = { status };
    if (status === 'occupied' && orderId) {
      updates.current_order_id = orderId;
    } else if (status === 'available') {
      updates.current_order_id = null;
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
    const restaurantId = req.headers['x-restaurant-id'] as string;
    
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
    
    // Update each table
    let results: any[];
    try {
      const promises = tables.map((table: any, index: number) => {
        const { id, ...updates } = table;
        delete updates.restaurant_id;
        delete updates.created_at;
        
        // Transform frontend properties to database columns if present
        const dbUpdates: Record<string, any> = { ...updates };
        if ('x' in updates) {
          dbUpdates.x_pos = updates.x;
          delete dbUpdates.x;
        }
        if ('y' in updates) {
          dbUpdates.y_pos = updates.y;
          delete dbUpdates.y;
        }
        if ('type' in updates) {
          dbUpdates.shape = updates.type;
          delete dbUpdates.type;
        }
        
        logger.info(`🔄 Updating table ${index + 1}/${tables.length} (id: ${id}):`, {
          originalData: table,
          transformedData: dbUpdates,
          fieldsToUpdate: Object.keys(dbUpdates)
        });
        
        return supabase
          .from('tables')
          .update(dbUpdates)
          .eq('id', id)
          .eq('restaurant_id', restaurantId)
          .select()
          .single();
      });
      
      logger.info(`🚀 Executing ${promises.length} table updates...`);
      results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      logger.info(`✅ Update results: ${results.length - errors.length} success, ${errors.length} errors`);
      
      if (errors.length > 0) {
        logger.error('❌ Some updates failed:', {
          count: errors.length,
          errors: errors.map((err, i) => ({
            tableIndex: i,
            error: err.error,
            errorCode: err.error?.code,
            errorMessage: err.error?.message,
            errorDetails: err.error?.details,
            errorHint: err.error?.hint
          }))
        });
        
        return res.status(400).json({ 
          error: 'Some updates failed', 
          details: errors.map(err => ({
            code: err.error?.code,
            message: err.error?.message,
            details: err.error?.details,
            hint: err.error?.hint
          }))
        });
      }
    } catch (error) {
      console.error('❌ Exception in batch update:', {
        error: error.message,
        stack: error.stack,
        tables: tables.map(t => ({ id: t.id, hasValidId: !!t.id }))
      });
      
      return res.status(400).json({
        error: 'Batch update exception',
        message: error.message
      });
    }
    
    // Transform database columns back to frontend properties
    const data = results.map((r: any) => r.data).filter(Boolean).map((table: any) => ({
      ...table,
      x: table['x_pos'],
      y: table['y_pos'],
      type: table['shape']
    }));
    
    logger.info(`✅ Batch update response: ${data.length} tables transformed and returned`);
    
    return res.json(data);
  } catch (error) {
    next(error);
  }
};

// Set up routes
router.get('/', getTables);
router.get('/:id', getTable);
router.post('/', createTable);
router.put('/batch', batchUpdateTables);
router.put('/:id', updateTable);
router.delete('/:id', deleteTable);
router.patch('/:id/status', updateTableStatus);

export { router as tableRoutes };