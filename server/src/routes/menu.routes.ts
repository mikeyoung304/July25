import { Router } from 'express';
import { MenuService } from '../services/menu.service';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { BadRequest, NotFound } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const routeLogger = logger.child({ route: 'menu' });

// GET /api/v1/menu - Get full menu with categories
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    routeLogger.info('Fetching full menu', { restaurantId });
    
    const menu = await MenuService.getFullMenu(restaurantId);
    res.json(menu);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/menu/items - Get all menu items
router.get('/items', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const items = await MenuService.getItems(restaurantId);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/menu/items/:id - Get single menu item
router.get('/items/:id', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    
    if (!id) {
      throw BadRequest('Item ID is required');
    }
    
    const item = await MenuService.getItem(restaurantId, id);
    
    if (!item) {
      throw NotFound('Menu item not found');
    }
    
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/menu/categories - Get menu categories
router.get('/categories', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId;

    // Validate restaurant ID is present and valid
    if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
      throw BadRequest('Valid restaurant ID is required');
    }

    const categories = await MenuService.getCategories(restaurantId);
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/menu/sync-ai - Sync menu to AI Gateway (requires auth)
router.post('/sync-ai', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw BadRequest('Authentication required');
    }
    
    const restaurantId = req.restaurantId!;
    routeLogger.info('Syncing menu to AI service', { restaurantId, userId: req.user.id });
    
    await MenuService.syncToAI(restaurantId);
    
    res.json({
      success: true,
      message: 'Menu synced to AI service',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/menu/cache/clear - Clear menu cache (requires auth)
router.post('/cache/clear', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw BadRequest('Authentication required');
    }
    
    const restaurantId = req.restaurantId!;
    routeLogger.info('Clearing menu cache', { restaurantId, userId: req.user.id });
    
    MenuService.clearCache(restaurantId);
    
    res.json({
      success: true,
      message: 'Menu cache cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export { router as menuRoutes };