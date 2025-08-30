import { Router } from 'express';
import { supabase } from '../config/database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { NotFound } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const routeLogger = logger.child({ route: 'restaurants' });

// GET /api/v1/restaurants/:id - Get restaurant basic info
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    routeLogger.info('Fetching restaurant info', { restaurantId: id });

    // Fetch restaurant from database
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        slug
      `)
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      routeLogger.warn('Restaurant not found', { restaurantId: id, error: error?.message });
      throw NotFound('Restaurant not found');
    }

    // Return restaurant info with defaults for missing columns
    res.json({
      success: true,
      data: {
        id: restaurant.id,
        name: restaurant.name,
        timezone: 'America/New_York',
        currency: 'USD',
        taxRate: 0.08,
        defaultTipPercentages: [15, 18, 20],
        logoUrl: null,
        address: '1019 Riverside Dr, Macon, GA 31201',
        phone: '(478) 743-4663',
        businessHours: 'Mon-Fri: 11:00 AM - 3:00 PM • Closed Weekends',
        description: 'Fresh food made with love and local ingredients'
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as restaurantRoutes };