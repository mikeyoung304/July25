import { Router } from 'express';
import { supabase } from '../config/database';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRestaurantAccess } from '../middleware/auth';

const router = Router();

// Apply restaurant validation to all routes
router.use(validateRestaurantAccess);

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
  
  res.json(data || []);
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
  
  res.json(data);
});

// Create new table
export const createTable = asyncHandler(async (req, res) => {
  const restaurantId = req.headers['x-restaurant-id'] as string;
  const tableData = {
    ...req.body,
    restaurant_id: restaurantId
  };
  
  const { data, error } = await supabase
    .from('tables')
    .insert(tableData)
    .select()
    .single();

  if (error) throw error;
  
  res.status(201).json(data);
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
  
  res.json(data);
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
  
  res.json({ success: true, id });
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
  
  res.json(data);
});

// Batch update tables (for floor plan editor)
export const batchUpdateTables = asyncHandler(async (req, res) => {
  const restaurantId = req.headers['x-restaurant-id'] as string;
  const { tables } = req.body;
  
  if (!Array.isArray(tables)) {
    return res.status(400).json({ error: 'Tables must be an array' });
  }
  
  // Update each table
  const promises = tables.map(table => {
    const { id, ...updates } = table;
    delete updates.restaurant_id;
    delete updates.created_at;
    
    return supabase
      .from('tables')
      .update(updates)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();
  });
  
  const results = await Promise.all(promises);
  const errors = results.filter(r => r.error);
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Some updates failed', 
      details: errors 
    });
  }
  
  const data = results.map(r => r.data);
  res.json(data);
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