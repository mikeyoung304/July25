import { Router } from 'express';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { requireScopes, ApiScope } from '../middleware/rbac';
import { OrdersService } from '../services/orders.service';
import { BadRequest, NotFound, Unauthorized } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { ai } from '../ai';
import { MenuService } from '../services/menu.service';
import type { OrderStatus, OrderType } from '@rebuild/shared';
import { safeApiError } from '@rebuild/shared';
import { OrderPayload } from '../../../shared/contracts/order';
import { validateBody } from '../middleware/validate';

const router = Router();
const routeLogger = logger.child({ route: 'orders' });

// GET /api/v1/orders - List orders with filters
router.get('/', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const filters = {
      status: req.query['status'] as OrderStatus | undefined,
      type: req.query['type'] as OrderType | undefined,
      startDate: (req.query['startDate'] as string) || '',
      endDate: (req.query['endDate'] as string) || '',
      limit: parseInt((req.query['limit'] as string) || '50'),
      offset: parseInt((req.query['offset'] as string) || '0'),
    };

    routeLogger.info('Fetching orders', { restaurantId, filters });
    
    const orders = await OrdersService.getOrders(restaurantId, filters);
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/orders - Create new order
// NOTE: Supports both authenticated staff orders and anonymous customer orders
router.post('/', optionalAuth, validateBody(OrderPayload), async (req: AuthenticatedRequest, res, next) => {
  try {
    // Check X-Client-Flow header to identify customer vs staff orders
    const clientFlow = (req.headers['x-client-flow'] as string)?.toLowerCase();
    const isCustomerOrder = clientFlow === 'online' || clientFlow === 'kiosk';

    // For customer orders (online/kiosk), allow anonymous access
    if (isCustomerOrder) {
      routeLogger.info('Processing anonymous customer order', { clientFlow });

      // Require restaurant ID from header for anonymous orders
      if (!req.restaurantId) {
        throw BadRequest('Restaurant ID is required for customer orders');
      }
    } else {
      // For staff orders, require authentication
      if (!req.user) {
        throw Unauthorized('Authentication required for staff orders');
      }

      // Validate restaurant access for authenticated users
      if (!req.restaurantId) {
        throw BadRequest('Restaurant ID not found in token or headers');
      }

      // Check scopes for staff users
      const userScopes = req.user.scopes || [];
      if (!userScopes.includes(ApiScope.ORDERS_CREATE)) {
        throw Unauthorized('Missing required scope: orders:create');
      }
    }

    const restaurantId = req.restaurantId!;
    const orderData = (req as any).validated;

    if (!orderData.items || orderData.items.length === 0) {
      throw BadRequest('Order must contain at least one item');
    }

    routeLogger.info('Creating order', {
      restaurantId,
      itemCount: orderData.items.length,
      isCustomerOrder,
      isAuthenticated: !!req.user
    });

    const order = await OrdersService.createOrder(restaurantId, orderData);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/orders/voice - Process voice order
router.post('/voice', authenticate, validateRestaurantAccess, requireScopes(ApiScope.ORDERS_CREATE), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const restaurantId = req.restaurantId!;
    const { transcription, audioUrl, metadata: _metadata } = req.body;

    if (!transcription) {
      throw BadRequest('Transcription is required');
    }

    routeLogger.info('Processing voice order', { restaurantId, transcription });

    // Parse the voice order using AI
    let parsedOrder;
    try {
      // Get menu items for validation
      const menuItems = await MenuService.getItems(restaurantId);

      // Use AI to parse the order with OrderMatchingService
      // Returns ParsedOrder with menuItemId field (camelCase)
      const aiResult = await ai.orderNLP?.parse({
        restaurantId,
        text: transcription
      }) || { items: [], notes: undefined };

      routeLogger.debug('AI parse result', {
        itemCount: aiResult.items.length,
        items: aiResult.items
      });

      // Map AI result to our format
      // AI returns ParsedOrder with: { menuItemId, quantity, modifications, specialInstructions }
      parsedOrder = {
        items: aiResult.items.map((item: any) => {
          // Look up menu item by the menuItemId (camelCase) that AI provides
          const menuItem = menuItems.find((m: any) => m.id === item.menuItemId);

          if (!menuItem) {
            routeLogger.warn('Menu item not found', { menuItemId: item.menuItemId });
            throw new Error(`Menu item not found for ID: ${item.menuItemId}`);
          }

          const quantity = item.quantity || 1;
          const price = menuItem.price;

          return {
            id: menuItem.id,                   // Use actual menu item ID
            menu_item_id: menuItem.id,         // Required reference to menu_items table
            name: menuItem.name,               // Use actual menu item name
            quantity,
            price,
            subtotal: price * quantity,
            modifiers: item.modifications || [],
            special_instructions: item.specialInstructions
          };
        }),
        confidence: aiResult.items.length > 0 ? 0.85 : 0.3
      };

      routeLogger.info('Voice order parsed successfully', {
        itemCount: parsedOrder.items.length,
        items: parsedOrder.items.map((i: any) => ({ name: i.name, price: i.price }))
      });
    } catch (error) {
      routeLogger.error('AI order parsing failed', { error });

      // Fallback to a simple response
      parsedOrder = {
        items: [],
        confidence: 0
      };
    }

    if (!parsedOrder || parsedOrder.items.length === 0) {
      res.json({
        success: false,
        message: "I didn't quite catch that. Could you repeat your order?",
        suggestions: [
          "Try saying 'I'd like a Soul Bowl'",
          "Or 'Greek Bowl with extra tzatziki'",
          "Or 'Mom's Chicken Salad with a side of fruit'"
        ],
        confidence: 0.3,
      });
      return;
    }

    // Calculate confidence based on parsed items
    const confidence = parsedOrder.items.length > 0 ? 0.85 : 0.3;

    // Create order from parsed voice data
    const order = await OrdersService.processVoiceOrder(
      restaurantId,
      transcription,
      parsedOrder.items,
      confidence,
      audioUrl
    );

    routeLogger.info('Voice order created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      confidence
    });

    res.json({
      success: true,
      order,
      confidence,
      message: `Perfect! Your ${parsedOrder.items[0]?.name || 'order'} will be ready in about ${(order.items?.[0] as any)?.prepTimeMinutes || 10} minutes.`,
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Sorry, I couldn't process that order. Please try again.",
      error: safeApiError(error, 'Voice order processing failed', (msg, ctx) => routeLogger.error(msg, ctx)),
      suggestions: [
        "Make sure to mention specific menu items",
        "Try 'I want a Soul Bowl' or 'Greek Salad with chicken'"
      ],
      confidence: 0,
    });
  }
});

// GET /api/v1/orders/:id - Get single order
router.get('/:id', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    const order = await OrdersService.getOrder(restaurantId, id!);
    
    if (!order) {
      throw NotFound('Order not found');
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/orders/:id/status - Update order status
// EPIC 2: Removed hardcoded status validation - now handled by orderStateMachine in service layer
router.patch('/:id/status', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      throw BadRequest('Status is required');
    }

    routeLogger.info('Updating order status', { restaurantId, orderId: id, status });

    // Service layer enforces state machine validation
    const order = await OrdersService.updateOrderStatus(restaurantId, id!, status, notes);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/orders/:id - Cancel order
router.delete('/:id', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { reason } = req.body;

    routeLogger.info('Cancelling order', { restaurantId, orderId: id, reason });

    const order = await OrdersService.updateOrderStatus(
      restaurantId, 
      id!, 
      'cancelled', 
      reason || 'Cancelled by user'
    );
    
    res.json(order);
  } catch (error) {
    next(error);
  }
});

export { router as orderRoutes };
