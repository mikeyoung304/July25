import request from 'supertest';
import express from 'express';
import { tablePaymentRouter } from '../table-payment.routes';
import { PaymentFlowService } from '../../services/payment-flow.service';
import { jest } from '@jest/globals';

// Mock services
jest.mock('../../services/payment-flow.service');

describe('Table Payment Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', tablePaymentRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/tables/:tableId/present-check', () => {
    it('should present check successfully', async () => {
      const mockCheck = {
        id: 'check-1',
        tableId: 'table-1',
        subtotal: 50.00,
        tax: 4.00,
        total: 54.00,
        status: 'presented'
      };

      (PaymentFlowService.presentTableCheck as jest.Mock).mockResolvedValue(mockCheck);

      const response = await request(app)
        .post('/api/v1/tables/table-1/present-check')
        .set('x-restaurant-id', 'rest-1')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.check).toEqual(mockCheck);
    });

    it('should return 404 for invalid table', async () => {
      (PaymentFlowService.presentTableCheck as jest.Mock).mockRejectedValue(
        new Error('Table not found')
      );

      const response = await request(app)
        .post('/api/v1/tables/invalid-table/present-check')
        .set('x-restaurant-id', 'rest-1')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Table not found');
    });

    it('should require restaurant ID', async () => {
      const response = await request(app)
        .post('/api/v1/tables/table-1/present-check')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Restaurant ID required');
    });
  });

  describe('POST /api/v1/payments/table/:tableId/calculate-tip', () => {
    it('should calculate percentage tip', async () => {
      const mockCalculation = {
        tipAmount: 10.00,
        tipPercentage: 20,
        total: 64.00
      };

      (PaymentFlowService.calculateWithTip as jest.Mock).mockResolvedValue(mockCalculation);

      const response = await request(app)
        .post('/api/v1/payments/table/table-1/calculate-tip')
        .set('x-restaurant-id', 'rest-1')
        .send({ tipAmount: 20, isPercentage: true });

      expect(response.status).toBe(200);
      expect(response.body.amount).toEqual(mockCalculation);
    });

    it('should calculate fixed tip amount', async () => {
      const mockCalculation = {
        tipAmount: 8.50,
        tipPercentage: 17,
        total: 62.50
      };

      (PaymentFlowService.calculateWithTip as jest.Mock).mockResolvedValue(mockCalculation);

      const response = await request(app)
        .post('/api/v1/payments/table/table-1/calculate-tip')
        .set('x-restaurant-id', 'rest-1')
        .send({ tipAmount: 8.50, isPercentage: false });

      expect(response.status).toBe(200);
      expect(response.body.amount.tipAmount).toBe(8.50);
    });

    it('should validate tip amount', async () => {
      const response = await request(app)
        .post('/api/v1/payments/table/table-1/calculate-tip')
        .set('x-restaurant-id', 'rest-1')
        .send({ tipAmount: -5, isPercentage: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid tip amount');
    });
  });

  describe('POST /api/v1/payments/table/:tableId/process', () => {
    it('should process Square Terminal payment', async () => {
      const mockPayment = {
        id: 'payment-1',
        status: 'completed',
        amount: { total: 64.00 },
        method: { type: 'SQUARE_TERMINAL' }
      };

      (PaymentFlowService.processTablePayment as jest.Mock).mockResolvedValue(mockPayment);

      const response = await request(app)
        .post('/api/v1/payments/table/table-1/process')
        .set('x-restaurant-id', 'rest-1')
        .send({
          paymentMethod: {
            type: 'SQUARE_TERMINAL',
            deviceId: 'device-123'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.payment).toEqual(mockPayment);
    });

    it('should process cash payment with change', async () => {
      const mockPayment = {
        id: 'payment-2',
        status: 'completed',
        amount: { total: 54.00 },
        method: { type: 'CASH' },
        changeAmount: 46.00
      };

      (PaymentFlowService.processTablePayment as jest.Mock).mockResolvedValue(mockPayment);

      const response = await request(app)
        .post('/api/v1/payments/table/table-1/process')
        .set('x-restaurant-id', 'rest-1')
        .send({
          paymentMethod: {
            type: 'CASH',
            tenderedAmount: 100.00
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.payment.changeAmount).toBe(46.00);
    });

    it('should handle payment failures', async () => {
      (PaymentFlowService.processTablePayment as jest.Mock).mockRejectedValue(
        new Error('Card declined')
      );

      const response = await request(app)
        .post('/api/v1/payments/table/table-1/process')
        .set('x-restaurant-id', 'rest-1')
        .send({
          paymentMethod: { type: 'SQUARE_TERMINAL' }
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Card declined');
    });
  });

  describe('POST /api/v1/payments/table/:tableId/split', () => {
    it('should create split session', async () => {
      const mockSession = {
        id: 'session-1',
        tableId: 'table-1',
        splits: [
          { id: 'split-1', amount: 32.00 },
          { id: 'split-2', amount: 32.00 }
        ]
      };

      (PaymentFlowService.createSplitSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/v1/payments/table/table-1/split')
        .set('x-restaurant-id', 'rest-1')
        .send({ numSplits: 2, strategy: 'EVEN' });

      expect(response.status).toBe(200);
      expect(response.body.session).toEqual(mockSession);
    });

    it('should validate number of splits', async () => {
      const response = await request(app)
        .post('/api/v1/payments/table/table-1/split')
        .set('x-restaurant-id', 'rest-1')
        .send({ numSplits: 11, strategy: 'EVEN' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid number of splits');
    });
  });

  describe('POST /api/v1/payments/split/:sessionId/pay/:splitId', () => {
    it('should process split payment', async () => {
      const mockPayment = {
        id: 'split-payment-1',
        splitId: 'split-1',
        amount: 35.00,
        status: 'completed'
      };

      (PaymentFlowService.processSplitPayment as jest.Mock).mockResolvedValue(mockPayment);

      const response = await request(app)
        .post('/api/v1/payments/split/session-1/pay/split-1')
        .set('x-restaurant-id', 'rest-1')
        .send({
          paymentMethod: { type: 'DIGITAL_WALLET' },
          tipAmount: 3.00
        });

      expect(response.status).toBe(200);
      expect(response.body.payment).toEqual(mockPayment);
    });
  });

  describe('GET /api/v1/tables/:tableId/check', () => {
    it('should get current check', async () => {
      const mockCheck = {
        id: 'check-1',
        tableId: 'table-1',
        status: 'open'
      };

      (PaymentFlowService.getTableCheck as jest.Mock).mockResolvedValue(mockCheck);

      const response = await request(app)
        .get('/api/v1/tables/table-1/check')
        .set('x-restaurant-id', 'rest-1');

      expect(response.status).toBe(200);
      expect(response.body.check).toEqual(mockCheck);
    });
  });

  describe('POST /api/v1/tables/:tableId/unlock-check', () => {
    it('should unlock check', async () => {
      (PaymentFlowService.unlockCheck as jest.Mock).mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .post('/api/v1/tables/table-1/unlock-check')
        .set('x-restaurant-id', 'rest-1')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});