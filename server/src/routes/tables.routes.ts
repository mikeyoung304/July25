import { Router } from 'express';
import { logger } from '../services/logger'
import { supabase } from '../config/database';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRestaurantAccess } from '../middleware/auth';
import { getConfig } from '../config/environment';

const router = Router();
const config = getConfig();

// Apply restaurant validation to all routes (skip in development for testing)
if (config.environment !== 'development') {
  router.use(validateRestaurantAccess);
} else {
  // Development middleware - just ensure restaurant ID is present
  router.use((req, _res, next) => {
    const restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
    if (!restaurantId) {
      return next(new Error('Restaurant ID is required'));
    }
    (req as any).restaurantId = restaurantId;
    next();
  });
}

// Get all tables for a restaurant
export const getTables = asyncHandler(async (req, res) => {
  const restaurantId = req.headers['x-restaurant-id'] as string;
  
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .order('label');

  if (error) throw error;
  
  // Transform database columns to frontend properties
  const transformedData = (data || []).map(table => ({
    ...table,
    x: table.x_pos,
    y: table.y_pos,
    type: table.shape
  }));
  
  return res.json(transformedData);
});

// Get single table
export const getTable = asyncHandler(async (req, res) => {
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
});

// Create new table
export const createTable = asyncHandler(async (req, res) => {
  const restaurantId = req.headers['x-restaurant-id'] as string;
  const { x, y, type, z_index, ...otherData } = req.body;
  
  // Transform frontend properties to database columns
  const tableData = {
    ...otherData,
    restaurant_id: restaurantId,
    x_pos: x,
    y_pos: y,
    shape: type,
    z_index: z_index || 1
  };
  
  const { data, error } = await supabase
    .from('tables')
    .insert(tableData)
    .select()
    .single();

  if (error) throw error;
  
  // Transform database columns back to frontend properties
  const transformedData = {
    ...data,
    x: data.x_pos,
    y: data.y_pos,
    type: data.shape
  };
  
  res.status(201).json(transformedData);
});

// Update table
export const updateTable = asyncHandler(async (req, res) => {
  const restaurantId = req.headers['x-restaurant-id'] as string;
  const { id } = req.params;
  const updates = req.body;
  
  // Remove fields that shouldn't be updated
  delete updates.id;
  delete updates.restaurant_id;
  delete updates.created_at;
  
  // Transform frontend properties to database columns
  const dbUpdates: any = { ...updates };
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
    x: data.x_pos,
    y: data.y_pos,
    type: data.shape
  };
  
  return res.json(transformedData);
});

// Delete table (soft delete)
export const deleteTable = asyncHandler(async (req, res) => {
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
});

// Update table status
export const updateTableStatus = asyncHandler(async (req, res) => {
  const restaurantId = req.headers['x-restaurant-id'] as string;
  const { id } = req.params;
  const { status, orderId } = req.body;
  
  const updates: any = { status };
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
});

// Batch update tables (for floor plan editor)
export const batchUpdateTables = asyncHandler(async (req, res) => {
  const restaurantId = req.headers['x-restaurant-id'] as string;
  
  logger.info('Batch update request received:', {
    restaurantId,
    bodyKeys: Object.keys(req.body),
    body: req.body,
    headers: {
      'x-restaurant-id': req.headers['x-restaurant-id'],
      'content-type': req.headers['content-type']
    }
  })
  
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
  let results;
  try {
    const promises = tables.map((table, index) => {
      const { id, ...updates } = table;
      delete updates.restaurant_id;
      delete updates.created_at;
      delete updates.updated_at; // Let Supabase handle this
      
      // Transform frontend properties to database columns
      const dbUpdates: any = { ...updates };
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
      console.error('❌ Batch update failed. Error details:', {
        errorCount: errors.length,
        totalTables: tables.length,
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
  const data = results.map(r => r.data).map(table => ({
    ...table,
    x: table.x_pos,
    y: table.y_pos,
    type: table.shape
  }));
  
  return res.json(data);
});

// Set up routes
router.get('/', getTables);
router.get('/:id', getTable);
router.post('/', createTable);
router.put('/batch', batchUpdateTables);
router.put('/:id', updateTable);
router.delete('/:id', deleteTable);
router.patch('/:id/status', updateTableStatus);

export const tableRoutes = router;