import { Router } from 'express';
import { authenticate, AuthenticatedRequest, requireRole, validateRestaurantAccess } from '../middleware/auth';
import { requireScopes } from '../middleware/rbac';
import { ApiScope, DatabaseRole } from '@rebuild/shared/types/auth';
import { OrdersService } from '../services/orders.service';
import { BadRequest, NotFound } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { ai } from '../ai';
import { MenuService } from '../services/menu.service';
import { validateCreateOrderDTO, UpdateOrderStatusDTOSchema } from '../dto/order.dto';
import { requireIdempotencyKey, idempotencyMiddleware } from '../middleware/idempotency';
import { ZodError } from 'zod';
import type { OrderStatus, OrderType } from '@rebuild/shared';
import { resolveOrderMode } from '../middleware/orderMode';
import { requirePaymentIfCustomer } from '../middleware/paymentGate';
import { SquareAdapter } from '../payments/square.adapter';

const router = Router();
const routeLogger = logger.child({ route: 'orders' });
const squareAdapter = new SquareAdapter();

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
router.post('/',
  authenticate,
  requireRole([DatabaseRole.OWNER, DatabaseRole.MANAGER, DatabaseRole.SERVER, DatabaseRole.CUSTOMER]),
  requireScopes(ApiScope.ORDERS_CREATE),
  validateRestaurantAccess,
  resolveOrderMode,
  requireIdempotencyKey,
  idempotencyMiddleware,
  requirePaymentIfCustomer,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const restaurantId = req.restaurantId!;

      // Validate and transform DTO
      let validatedData;
      try {
        validatedData = validateCreateOrderDTO(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          throw BadRequest(`Invalid order data: ${issues}`);
        }
        throw error;
      }

      routeLogger.info('Creating order', {
        restaurantId,
        itemCount: validatedData.items.length,
        mode: (req as any).orderMode
      });

      // Create order with validated data
      const order = await OrdersService.createOrder(restaurantId, validatedData);

      // Consume payment token if customer order
      if ((req as any).orderMode === 'customer' && (req as any).paymentToken) {
        const consumed = await squareAdapter.consumeToken(
          (req as any).paymentToken,
          order.id
        );

        if (!consumed) {
          routeLogger.error('Failed to consume payment token after order creation', {
            orderId: order.id,
            paymentToken: (req as any).paymentToken
          });
          // Consider whether to rollback the order here
        } else {
          routeLogger.info('Payment token consumed successfully', {
            orderId: order.id
          });
        }
      }

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/orders/voice - Process voice order
router.post('/voice',
  authenticate,
  requireRole([DatabaseRole.OWNER, DatabaseRole.MANAGER, DatabaseRole.SERVER, DatabaseRole.CUSTOMER]),
  requireScopes(ApiScope.ORDERS_CREATE),
  validateRestaurantAccess,
  resolveOrderMode,
  requirePaymentIfCustomer,
  async (req: AuthenticatedRequest, res, _next) => {
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
      // Get menu items for context
      const menuItems = await MenuService.getItems(restaurantId);
      
      // Use AI to parse the order
      const aiResult = await (ai as any).orderNLP?.parseOrder({
        restaurantId,
        text: transcription
      }) || { items: [] };
      
      // Map AI result to our format
      parsedOrder = {
        items: aiResult.items.map((item: any) => {
          // Find the menu item to get the price
          const menuItem = menuItems.find((m: any) => 
            m.id === item.menu_item_id || 
            m.name.toLowerCase() === item.name?.toLowerCase()
          );
          
          return {
            name: item.name || menuItem?.name || 'Unknown Item',
            quantity: item.quantity || 1,
            price: menuItem?.price || 0,
            modifications: item.modifications || [],
            specialInstructions: item.special_instructions
          };
        }),
        confidence: aiResult.items.length > 0 ? 0.85 : 0.3
      };
    } catch (error) {
      routeLogger.error('AI order parsing failed', { error });
      
      // Fallback to a simple response
      parsedOrder = {
        items: [],
        confidence: 0
      };
    }

    if (!parsedOrder || parsedOrder.items.length === 0) {
      return res.json({
        success: false,
        message: "I didn't quite catch that. Could you repeat your order?",
        suggestions: [
          "Try saying 'I'd like a Soul Bowl'",
          "Or 'Greek Bowl with extra tzatziki'",
          "Or 'Mom's Chicken Salad with a side of fruit'"
        ],
        confidence: 0.3,
      });
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

    return res.json({
      success: true,
      order,
      confidence,
      message: `Perfect! Your ${parsedOrder.items[0]?.name || 'order'} will be ready in about ${(order.items?.[0] as any)?.prepTimeMinutes || 10} minutes.`,
    });
  } catch (error) {
    routeLogger.error('Voice order processing failed', { error });
    return res.json({
      success: false,
      message: "Sorry, I couldn't process that order. Please try again.",
      error: error instanceof Error ? error.message : 'Unknown error',
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
router.patch('/:id/status', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    
    // Validate DTO
    let validatedData;
    try {
      validatedData = UpdateOrderStatusDTOSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw BadRequest(`Invalid status update: ${issues}`);
      }
      throw error;
    }

    routeLogger.info('Updating order status', { 
      restaurantId, 
      orderId: id, 
      status: validatedData.status 
    });

    const order = await OrdersService.updateOrderStatus(
      restaurantId, 
      id!, 
      validatedData.status, 
      validatedData.notes
    );
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