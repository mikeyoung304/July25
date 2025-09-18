import { vi } from 'vitest';
import { PaymentFlowService } from '../payment-flow.service';
import { TableCheckService } from '../table-check.service';
import { TipCalculationService } from '../tip-calculation.service';

// Mock dependencies
vi.mock('../table-check.service');
vi.mock('../tip-calculation.service');
vi.mock('@supabase/supabase-js');

describe('PaymentFlowService', () => {
  const mockedTableCheck = vi.mocked(TableCheckService, true);
  const mockedTipCalculation = vi.mocked(TipCalculationService, true);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('presentTableCheck', () => {
    it('should present check for occupied table', async () => {
      const mockCheck = {
        id: 'check-123',
        tableId: 'table-1',
        orderId: 'order-456',
        subtotal: 50.00,
        tax: 4.00,
        total: 54.00,
        status: 'presented'
      };

      mockedTableCheck.presentCheck.mockResolvedValue(mockCheck);

      const result = await PaymentFlowService.presentTableCheck('table-1', 'rest-1');
      
      expect(result).toEqual(mockCheck);
      expect(TableCheckService.presentCheck).toHaveBeenCalledWith('table-1', 'rest-1');
    });

    it('should throw error for invalid table', async () => {
      mockedTableCheck.presentCheck.mockRejectedValue(
        new Error('Table not found')
      );

      await expect(
        PaymentFlowService.presentTableCheck('invalid-table', 'rest-1')
      ).rejects.toThrow('Table not found');
    });
  });

  describe('calculateWithTip', () => {
    it('should calculate percentage-based tip correctly', async () => {
      const mockCalculation = {
        tipAmount: 10.00,
        tipPercentage: 20,
        total: 64.00
      };

      mockedTipCalculation.calculateTip.mockResolvedValue(mockCalculation);

      const result = await PaymentFlowService.calculateWithTip(
        'table-1',
        20,
        true,
        'rest-1'
      );

      expect(result).toEqual(mockCalculation);
      expect(TipCalculationService.calculateTip).toHaveBeenCalledWith(
        'table-1',
        20,
        true,
        'rest-1'
      );
    });

    it('should calculate fixed amount tip correctly', async () => {
      const mockCalculation = {
        tipAmount: 8.50,
        tipPercentage: 17,
        total: 62.50
      };

      mockedTipCalculation.calculateTip.mockResolvedValue(mockCalculation);

      const result = await PaymentFlowService.calculateWithTip(
        'table-1',
        8.50,
        false,
        'rest-1'
      );

      expect(result).toEqual(mockCalculation);
    });

    it('should handle zero tip', async () => {
      const mockCalculation = {
        tipAmount: 0,
        tipPercentage: 0,
        total: 54.00
      };

      mockedTipCalculation.calculateTip.mockResolvedValue(mockCalculation);

      const result = await PaymentFlowService.calculateWithTip(
        'table-1',
        0,
        false,
        'rest-1'
      );

      expect(result.tipAmount).toBe(0);
      expect(result.total).toBe(54.00);
    });
  });

  describe('processTablePayment', () => {
    it('should process Square Terminal payment successfully', async () => {
      const paymentMethod = {
        type: 'SQUARE_TERMINAL',
        deviceId: 'device-123'
      };

      const mockPayment = {
        id: 'payment-789',
        status: 'completed',
        amount: { total: 64.00 },
        method: paymentMethod,
        timestamp: new Date().toISOString()
      };

      // Mock internal methods
      const mockProcessTerminal = vi.spyOn(
        PaymentFlowService as any,
        'processSquareTerminalPayment'
      ).mockResolvedValue(mockPayment);

      const result = await PaymentFlowService.processTablePayment(
        'table-1',
        paymentMethod,
        'rest-1'
      );

      expect(result).toEqual(mockPayment);
      expect(mockProcessTerminal).toHaveBeenCalled();
    });

    it('should process cash payment with change calculation', async () => {
      const paymentMethod = {
        type: 'CASH',
        tenderedAmount: 100.00
      };

      const mockPayment = {
        id: 'payment-cash-1',
        status: 'completed',
        amount: { total: 64.00 },
        method: paymentMethod,
        changeAmount: 36.00,
        timestamp: new Date().toISOString()
      };

      const mockProcessCash = vi.spyOn(
        PaymentFlowService as any,
        'processCashPayment'
      ).mockResolvedValue(mockPayment);

      const result = await PaymentFlowService.processTablePayment(
        'table-1',
        paymentMethod,
        'rest-1'
      );

      expect(result.changeAmount).toBe(36.00);
      expect(mockProcessCash).toHaveBeenCalled();
    });

    it('should handle payment failures gracefully', async () => {
      const paymentMethod = {
        type: 'SQUARE_TERMINAL',
        deviceId: 'device-123'
      };

      vi.spyOn(
        PaymentFlowService as any,
        'processSquareTerminalPayment'
      ).mockRejectedValue(new Error('Card declined'));

      await expect(
        PaymentFlowService.processTablePayment('table-1', paymentMethod, 'rest-1')
      ).rejects.toThrow('Card declined');
    });
  });

  describe('Split Payment', () => {
    it('should create even split session', async () => {
      const mockSession = {
        id: 'split-session-1',
        tableId: 'table-1',
        totalAmount: 64.00,
        splits: [
          { id: 'split-1', amount: 32.00, status: 'pending' },
          { id: 'split-2', amount: 32.00, status: 'pending' }
        ]
      };

      const mockCreateSplit = vi.spyOn(
        TableCheckService,
        'splitCheck'
      ).mockResolvedValue(mockSession);

      const result = await PaymentFlowService.createSplitSession(
        'table-1',
        2,
        'EVEN',
        'rest-1'
      );

      expect(result).toEqual(mockSession);
      expect(mockCreateSplit).toHaveBeenCalledWith(
        'table-1',
        { numSplits: 2, strategy: 'EVEN' },
        'rest-1'
      );
    });

    it('should process individual split payment', async () => {
      const mockPayment = {
        id: 'split-payment-1',
        splitId: 'split-1',
        amount: 35.00, // 32 + 3 tip
        status: 'completed'
      };

      const mockProcessSplit = vi.spyOn(
        PaymentFlowService as any,
        'processSplitPayment'
      ).mockResolvedValue(mockPayment);

      const result = await PaymentFlowService.processSplitPayment(
        'session-1',
        'split-1',
        { type: 'DIGITAL_WALLET' },
        3.00,
        'rest-1'
      );

      expect(result).toEqual(mockPayment);
      expect(result.amount).toBe(35.00);
    });
  });
});
