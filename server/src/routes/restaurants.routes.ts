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
        timezone,
        currency,
        tax_rate,
        default_tip_percentages,
        logo_url,
        address,
        phone,
        business_hours,
        description
      `)
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      routeLogger.warn('Restaurant not found', { restaurantId: id, error: error?.message });
      throw NotFound('Restaurant not found');
    }

    // Return restaurant info
    res.json({
      success: true,
      data: {
        id: restaurant.id,
        name: restaurant.name,
        timezone: restaurant.timezone || 'UTC',
        currency: restaurant.currency || 'USD',
        taxRate: restaurant.tax_rate || 0.08,
        defaultTipPercentages: restaurant.default_tip_percentages || [15, 18, 20],
        logoUrl: restaurant.logo_url,
        address: restaurant.address,
        phone: restaurant.phone,
        businessHours: restaurant.business_hours,
        description: restaurant.description
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as restaurantRoutes };