import { Router } from 'express';
import { supabase } from '../../config/database';
import { errorHandler } from '../../middleware/errorHandler';
import { validateRestaurantAccess } from '../../middleware/auth';

const router = Router();

router.use(validateRestaurantAccess);

// Get all tables for a restaurant
router.get('/', async (req, res, next) => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
    
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('active', true)
      .order('label');

    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

// Get single table
router.get('/:id', async (req, res, next) => {
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
    
    res.json(data);
  } catch (error) {
    return next(error);
  }
});

// Create new table
router.post('/', async (req, res, next) => {
  try {
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
  } catch (error) {
    return next(error);
  }
});

// Update table
router.put('/:id', async (req, res, next) => {
  try {
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
  } catch (error) {
    return next(error);
  }
});

// Delete table (soft delete)
router.delete('/:id', async (req, res, next) => {
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
    
    res.json({ success: true, id });
  } catch (error) {
    return next(error);
  }
});

// Update table status
router.patch('/:id/status', async (req, res, next) => {
  try {
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
  } catch (error) {
    return next(error);
  }
});

// Batch update tables (for floor plan editor)
router.put('/batch', async (req, res, next) => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
    const { tables } = req.body;
    
    if (!Array.isArray(tables)) {
      return res.status(400).json({ error: 'Tables must be an array' });
    }
    
    // Prepare tables for RPC function (remove protected fields)
    const cleanedTables = tables.map(table => {
      const { restaurant_id, created_at, ...updates } = table;
      return updates;
    });

    // Call optimized RPC function (single UPDATE instead of N queries)
    const { data, error } = await supabase
      .rpc('batch_update_tables', {
        p_restaurant_id: restaurantId,
        p_tables: cleanedTables
      });

    if (error) {
      return res.status(400).json({
        error: 'Batch update failed',
        message: error.message,
        code: error.code
      });
    }

    res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

router.use(errorHandler);

export default router;