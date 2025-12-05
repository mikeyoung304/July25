import { Router } from 'express';
import { MenuService } from '../services/menu.service';
import { optionalAuth, authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireScopes, ApiScope } from '../middleware/rbac';
import { BadRequest, NotFound, Conflict } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { menuUpdateLimiter } from '../middleware/rateLimiter';

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

// PATCH /api/v1/menu/items/:id - Update menu item (86/un-86 availability)
// Rate limited to prevent cache thrashing (Todo #171)
router.patch('/items/:id', authenticate, menuUpdateLimiter, requireScopes(ApiScope.MENU_MANAGE), async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { is_available, updated_at } = req.body;

    if (!id) {
      throw BadRequest('Item ID is required');
    }

    if (typeof is_available !== 'boolean') {
      throw BadRequest('is_available must be a boolean');
    }

    routeLogger.info('Updating menu item availability', {
      restaurantId,
      itemId: id,
      is_available,
      userId: req.user!.id
    });

    // Pass audit context for logging (Todo #169) and optional updated_at for optimistic locking (Todo #170)
    const auditContext: { userId: string; ipAddress?: string; userAgent?: string } = {
      userId: req.user!.id,
    };
    if (req.ip) auditContext.ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    if (userAgent) auditContext.userAgent = userAgent;

    const item = await MenuService.updateItem(
      restaurantId,
      id,
      { is_available, updated_at },
      auditContext
    );

    if (!item) {
      throw NotFound('Menu item not found');
    }

    res.json(item);
  } catch (error: any) {
    // Handle optimistic lock conflict (Todo #170)
    if (error.code === 'CONFLICT' || error.statusCode === 409) {
      next(Conflict(error.message, 'CONCURRENT_MODIFICATION'));
    } else {
      next(error);
    }
  }
});

export { router as menuRoutes };