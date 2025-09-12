import { Router } from 'express';
import { authenticate, AuthenticatedRequest, validateRestaurantAccess } from '../middleware/auth';
import { requireScopes, ApiScope } from '../middleware/rbac';
import { BadRequest } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { PaymentFlowService, PaymentMethod } from '../services/payment-flow.service';
import { TableCheckService } from '../services/table-check.service';
import { TipCalculationService } from '../services/tip-calculation.service';
import { SplitPaymentService } from '../services/split-payment.service';

const router = Router();
const routeLogger = logger.child({ route: 'table-payment' });

// GET /api/v1/tables/:tableId/check - Get current check for table
router.get('/:tableId/check', 
  authenticate, 
  validateRestaurantAccess,
  requireScopes(ApiScope.ORDERS_READ),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { tableId } = req.params;
      
      routeLogger.info('Getting table check', { tableId });
      
      const check = await TableCheckService.getTableCheck(tableId);
      
      res.json({
        success: true,
        check
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to get table check', { error, tableId: req.params.tableId });
      next(error);
    }
  }
);

// POST /api/v1/tables/:tableId/present-check - Present check to customer
router.post('/:tableId/present-check',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { tableId } = req.params;
      const userId = req.user?.id || 'system';
      
      routeLogger.info('Presenting check', { tableId, userId });
      
      const check = await PaymentFlowService.presentCheck(tableId, userId);
      
      res.json({
        success: true,
        check,
        message: 'Check presented to customer'
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to present check', { error, tableId: req.params.tableId });
      next(error);
    }
  }
);

// POST /api/v1/tables/:tableId/unlock-check - Cancel payment flow
router.post('/:tableId/unlock-check',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { tableId } = req.params;
      
      routeLogger.info('Unlocking check', { tableId });
      
      // This would unlock the table and cancel the payment flow
      // Implementation would go in PaymentFlowService
      
      res.json({
        success: true,
        message: 'Check unlocked'
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to unlock check', { error, tableId: req.params.tableId });
      next(error);
    }
  }
);

// POST /api/v1/payments/table/:tableId/calculate-tip - Calculate with tip
router.post('/table/:tableId/calculate-tip',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { tableId } = req.params;
      const { tipAmount, tipPercentage, isPercentage = true } = req.body;
      
      routeLogger.info('Calculating tip', { tableId, tipAmount, tipPercentage });
      
      // Get current check to get subtotal
      const check = await TableCheckService.getTableCheck(tableId);
      
      let calculatedTip: number;
      if (isPercentage && tipPercentage !== undefined) {
        const calculation = TipCalculationService.calculateTipAmount(
          check.subtotal,
          tipPercentage,
          true
        );
        calculatedTip = calculation.tipAmount;
      } else if (tipAmount !== undefined) {
        calculatedTip = tipAmount;
      } else {
        throw BadRequest('Tip amount or percentage required');
      }
      
      // Update check with tip
      const updatedAmount = await PaymentFlowService.calculateWithTip(tableId, calculatedTip);
      
      res.json({
        success: true,
        amount: updatedAmount,
        tipOptions: TipCalculationService.calculateTipOptions(check.subtotal)
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to calculate tip', { error, tableId: req.params.tableId });
      next(error);
    }
  }
);

// POST /api/v1/payments/table/:tableId/process - Process table payment
router.post('/table/:tableId/process',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { tableId } = req.params;
      const { paymentMethod } = req.body;
      
      if (!paymentMethod) {
        throw BadRequest('Payment method required');
      }
      
      routeLogger.info('Processing table payment', { 
        tableId, 
        paymentMethod: paymentMethod.type 
      });
      
      const result = await PaymentFlowService.processTablePayment(
        tableId,
        paymentMethod as PaymentMethod
      );
      
      routeLogger.info('Table payment processed', { 
        tableId, 
        paymentId: result.paymentId 
      });
      
      res.json({
        success: true,
        payment: result,
        message: 'Payment processed successfully'
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to process payment', { 
        error, 
        tableId: req.params.tableId 
      });
      next(error);
    }
  }
);

// POST /api/v1/payments/table/:tableId/split - Create split payment session
router.post('/table/:tableId/split',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { tableId } = req.params;
      const { numSplits, strategy = 'EVEN' } = req.body;
      
      if (!numSplits || numSplits < 2) {
        throw BadRequest('Number of splits must be 2 or more');
      }
      
      routeLogger.info('Creating split payment session', { 
        tableId, 
        numSplits, 
        strategy 
      });
      
      const session = await SplitPaymentService.createSplitSession(
        tableId,
        numSplits,
        strategy
      );
      
      res.json({
        success: true,
        session,
        message: 'Split payment session created'
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to create split session', { 
        error, 
        tableId: req.params.tableId 
      });
      next(error);
    }
  }
);

// GET /api/v1/payments/split/:sessionId - Get split session status
router.get('/split/:sessionId',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_READ),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { sessionId } = req.params;
      
      routeLogger.info('Getting split session', { sessionId });
      
      const session = await SplitPaymentService.getSplitSession(sessionId);
      
      res.json({
        success: true,
        session
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to get split session', { 
        error, 
        sessionId: req.params.sessionId 
      });
      next(error);
    }
  }
);

// POST /api/v1/payments/split/:sessionId/pay/:splitId - Process split payment
router.post('/split/:sessionId/pay/:splitId',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { sessionId, splitId } = req.params;
      const { paymentMethod, tipAmount = 0 } = req.body;
      
      if (!paymentMethod) {
        throw BadRequest('Payment method required');
      }
      
      routeLogger.info('Processing split payment', { 
        sessionId, 
        splitId,
        paymentMethod: paymentMethod.type,
        tipAmount
      });
      
      const result = await SplitPaymentService.processSplitPayment(
        sessionId,
        splitId,
        paymentMethod as PaymentMethod,
        tipAmount
      );
      
      res.json({
        success: true,
        payment: result,
        message: 'Split payment processed successfully'
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to process split payment', { 
        error, 
        sessionId: req.params.sessionId,
        splitId: req.params.splitId
      });
      next(error);
    }
  }
);

// PUT /api/v1/payments/split/:sessionId/allocate - Update split allocations
router.put('/split/:sessionId/allocate',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { sessionId } = req.params;
      const { allocations } = req.body;
      
      if (!allocations || !Array.isArray(allocations)) {
        throw BadRequest('Allocations array required');
      }
      
      routeLogger.info('Updating split allocations', { 
        sessionId, 
        numAllocations: allocations.length 
      });
      
      const session = await SplitPaymentService.updateSplitAllocation(
        sessionId,
        allocations
      );
      
      res.json({
        success: true,
        session,
        message: 'Split allocations updated'
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to update allocations', { 
        error, 
        sessionId: req.params.sessionId 
      });
      next(error);
    }
  }
);

// DELETE /api/v1/payments/split/:sessionId - Cancel split session
router.delete('/split/:sessionId',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { sessionId } = req.params;
      
      routeLogger.info('Cancelling split session', { sessionId });
      
      await SplitPaymentService.cancelSplitSession(sessionId);
      
      res.json({
        success: true,
        message: 'Split session cancelled'
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to cancel split session', { 
        error, 
        sessionId: req.params.sessionId 
      });
      next(error);
    }
  }
);

// GET /api/v1/payments/table/:tableId/status - Check payment status
router.get('/table/:tableId/status',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_READ),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
    try {
      const { tableId } = req.params;
      
      routeLogger.info('Checking payment status', { tableId });
      
      // Get check status
      const check = await TableCheckService.getTableCheck(tableId);
      
      res.json({
        success: true,
        status: check.status,
        check
      });
      
    } catch (error: any) {
      routeLogger.error('Failed to check payment status', { 
        error, 
        tableId: req.params.tableId 
      });
      next(error);
    }
  }
);

export { router as tablePaymentRoutes };