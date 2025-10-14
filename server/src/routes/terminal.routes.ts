import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { BadRequest } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { OrdersService } from '../services/orders.service';

const router = Router();
const routeLogger = logger.child({ route: 'terminal' });

// Initialize Square client (reuse existing configuration)
const client = new SquareClient({
  environment: process.env['SQUARE_ENVIRONMENT'] === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox,
  token: process.env['SQUARE_ACCESS_TOKEN']!
});

const terminalApi = client.terminal;

// POST /api/v1/terminal/checkout - Create terminal checkout
router.post('/checkout', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { orderId, deviceId } = req.body;

    // Validate required fields
    if (!orderId) {
      throw BadRequest('Order ID is required');
    }
    if (!deviceId) {
      throw BadRequest('Device ID is required');
    }

    routeLogger.info('Creating terminal checkout', { 
      restaurantId, 
      orderId,
      deviceId 
    });

    // Get order to verify it exists and get amount
    const order = await OrdersService.getOrder(restaurantId, orderId);
    if (!order) {
      throw BadRequest('Order not found');
    }

    const amountInCents = Math.round((order as any).total_amount * 100);

    // Create terminal checkout request
    const checkoutRequest = {
      idempotencyKey: randomUUID(),
      checkout: {
        amountMoney: {
          amount: BigInt(amountInCents),
          currency: 'USD',
        },
        deviceOptions: {
          deviceId,
          skipReceiptScreen: false,
          collectSignature: true,
          tipSettings: {
            allowTipping: true,
            separateTipScreen: false,
            customTipField: false,
            tipPercentages: [10, 15, 20, 25],
          },
        },
        referenceId: orderId,
        note: `Voice order #${(order as any).order_number}`,
        paymentType: 'CARD_PRESENT',
        paymentOptions: {
          autocomplete: true,
          delayCapture: false,
        },
      },
    };

    routeLogger.debug('Terminal checkout request', { checkoutRequest });

    try {
      const { result } = await (terminalApi as any).createTerminalCheckout(checkoutRequest);

      if (!result.checkout) {
        throw new Error('No checkout created');
      }

      routeLogger.info('Terminal checkout created', {
        checkoutId: result.checkout.id,
        orderId,
        status: result.checkout.status
      });

      res.json({
        success: true,
        checkout: {
          id: result.checkout.id,
          status: result.checkout.status,
          createdAt: result.checkout.createdAt,
          updatedAt: result.checkout.updatedAt,
        },
      });
      return;

    } catch (squareError: any) {
      if (squareError.isError && squareError.errors) {
        const errors = squareError.errors || [];
        routeLogger.error('Square Terminal API error', { 
          orderId, 
          errors: errors.map((e: any) => ({ category: e.category, code: e.code, detail: e.detail }))
        });

        const firstError = errors[0];
        return res.status(400).json({
          success: false,
          error: 'Terminal checkout creation failed',
          detail: firstError?.detail || 'Unknown terminal error',
          code: firstError?.code,
        });
      }

      throw squareError;
    }

  } catch (error: any) {
    routeLogger.error('Terminal checkout creation failed', { error });
    next(error);
    return;
    return;
  }
});

// GET /api/v1/terminal/checkout/:checkoutId - Get terminal checkout status
router.get('/checkout/:checkoutId', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { checkoutId } = req.params;

    routeLogger.info('Retrieving terminal checkout status', { checkoutId });

    try {
      const { result } = await (terminalApi as any).getTerminalCheckout(checkoutId);

      if (!result.checkout) {
        return res.status(404).json({
          success: false,
          error: 'Terminal checkout not found',
        });
      }

      // Include payment information if checkout is completed
      let paymentDetails = null;
      if (result.checkout.status === 'COMPLETED' && result.checkout.paymentIds && result.checkout.paymentIds.length > 0) {
        try {
          const paymentId = result.checkout.paymentIds[0];
          const paymentResult = await client.payments.get({ paymentId });
          paymentDetails = paymentResult.payment;
        } catch (paymentError) {
          routeLogger.warn('Could not retrieve payment details', { paymentError });
        }
      }

      res.json({
        success: true,
        checkout: {
          id: result.checkout.id,
          status: result.checkout.status,
          createdAt: result.checkout.createdAt,
          updatedAt: result.checkout.updatedAt,
          referenceId: result.checkout.referenceId,
          amountMoney: result.checkout.amountMoney,
          paymentIds: result.checkout.paymentIds,
          paymentType: result.checkout.paymentType,
        },
        payment: paymentDetails,
      });
      return;

    } catch (squareError: any) {
      if (squareError.isError && squareError.errors) {
        routeLogger.error('Square Terminal API error retrieving checkout', { 
          checkoutId,
          errors: squareError.errors 
        });
        
        return res.status(404).json({
          success: false,
          error: 'Terminal checkout not found',
        });
      }

      throw squareError;
    }

  } catch (error: any) {
    routeLogger.error('Failed to retrieve terminal checkout', { error });
    next(error);
    return;
  }
});

// POST /api/v1/terminal/checkout/:checkoutId/cancel - Cancel terminal checkout
router.post('/checkout/:checkoutId/cancel', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { checkoutId } = req.params;

    routeLogger.info('Cancelling terminal checkout', { checkoutId });

    try {
      const { result } = await (terminalApi as any).cancelTerminalCheckout(checkoutId);

      routeLogger.info('Terminal checkout cancelled', { 
        checkoutId,
        status: result.checkout?.status 
      });

      res.json({
        success: true,
        checkout: {
          id: result.checkout?.id,
          status: result.checkout?.status,
          updatedAt: result.checkout?.updatedAt,
        },
      });
      return;

    } catch (squareError: any) {
      if (squareError.isError && squareError.errors) {
        routeLogger.error('Square Terminal API error cancelling checkout', { 
          checkoutId,
          errors: squareError.errors 
        });
        
        const firstError = squareError.errors[0];
        return res.status(400).json({
          success: false,
          error: 'Terminal checkout cancellation failed',
          detail: firstError?.detail || 'Unknown cancellation error',
        });
      }

      throw squareError;
    }

  } catch (error: any) {
    routeLogger.error('Failed to cancel terminal checkout', { error });
    next(error);
    return;
  }
});

// POST /api/v1/terminal/checkout/:checkoutId/complete - Complete order after successful terminal payment
router.post('/checkout/:checkoutId/complete', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { checkoutId } = req.params;

    routeLogger.info('Completing order after terminal payment', { checkoutId });

    // Get terminal checkout to find the order
    const { result } = await (terminalApi as any).getTerminalCheckout(checkoutId);
    
    if (!result.checkout) {
      throw BadRequest('Terminal checkout not found');
    }

    if (result.checkout.status !== 'COMPLETED') {
      throw BadRequest(`Terminal checkout not completed. Status: ${result.checkout.status}`);
    }

    const orderId = result.checkout.referenceId;
    if (!orderId) {
      throw BadRequest('No order reference found in terminal checkout');
    }

    // Get payment details
    let paymentId = null;
    if (result.checkout.paymentIds && result.checkout.paymentIds.length > 0) {
      paymentId = result.checkout.paymentIds[0];
    }

    // Update order payment status
    await OrdersService.updateOrderPayment(
      restaurantId,
      orderId,
      'paid',
      'card',
      paymentId || checkoutId
    );

    // Get updated order
    const updatedOrder = await OrdersService.getOrder(restaurantId, orderId);

    routeLogger.info('Order payment completed via terminal', { 
      orderId,
      checkoutId,
      paymentId 
    });

    res.json({
      success: true,
      order: updatedOrder,
      payment: {
        method: 'terminal',
        checkoutId,
        paymentId,
        status: 'completed',
      },
    });
    return;

  } catch (error: any) {
    routeLogger.error('Failed to complete order after terminal payment', { error });
    next(error);
    return;
  }
});

// GET /api/v1/terminal/devices - List available terminal devices
router.get('/devices', authenticate, validateRestaurantAccess, async (_req: AuthenticatedRequest, res, next) => {
  try {
    routeLogger.info('Retrieving terminal devices');

    try {
      const { result } = await (terminalApi as any).listDeviceCodes({
        locationId: process.env['SQUARE_LOCATION_ID'],
        productType: 'TERMINAL_API',
        status: 'PAIRED',
      });

      const devices = result.deviceCodes || [];

      routeLogger.info('Retrieved terminal devices', { deviceCount: devices.length });

      res.json({
        success: true,
        devices: devices.map((device: any) => ({
          id: device.id,
          name: device.name,
          code: device.code,
          deviceId: device.deviceId,
          status: device.status,
          statusChangedAt: device.statusChangedAt,
          pairBy: device.pairBy,
        })),
      });
      return;

    } catch (squareError: any) {
      if (squareError.isError && squareError.errors) {
        routeLogger.error('Square Terminal API error retrieving devices', { 
          errors: squareError.errors 
        });
        
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve terminal devices',
          detail: squareError.errors?.[0]?.detail,
        });
      }

      throw squareError;
    }

  } catch (error: any) {
    routeLogger.error('Failed to retrieve terminal devices', { error });
    next(error);
    return;
  }
});

export { router as terminalRoutes };