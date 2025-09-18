import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useTablePayment } from '../useTablePayment';
import { useApiRequest } from '@/hooks/useApiRequest';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/hooks/useApiRequest', () => ({
  useApiRequest: vi.fn()
}));
vi.mock('react-hot-toast', () => {
  const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  };
  return {
    __esModule: true,
    default: toastMock,
    toast: toastMock
  };
});

describe('useTablePayment', () => {
  let mockApi: any;
  const mockedUseApiRequest = vi.mocked(useApiRequest);

  beforeEach(() => {
    mockApi = {
      get: vi.fn(),
      post: vi.fn()
    };
    mockedUseApiRequest.mockReturnValue(mockApi);
    vi.clearAllMocks();
  });

  describe('presentCheck', () => {
    it('should present check and update state', async () => {
      const mockCheck = {
        id: 'check-1',
        tableId: 'table-1',
        subtotal: 50.00,
        tax: 4.00,
        tip: 0,
        total: 54.00,
        status: 'presented'
      };

      mockApi.post.mockResolvedValue({ check: mockCheck });

      const { result } = renderHook(() => useTablePayment('table-1'));

      await act(async () => {
        const check = await result.current.presentCheck();
        expect(check).toEqual(mockCheck);
      });

      expect(result.current.check).toEqual(mockCheck);
      expect(result.current.isLoading).toBe(false);
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/tables/table-1/present-check', {});
    });

    it('should handle presentation errors', async () => {
      const error = new Error('Table has no active order');
      mockApi.post.mockRejectedValue(error);

      const { result } = renderHook(() => useTablePayment('table-1'));

      await act(async () => {
        await result.current.presentCheck();
      });

      expect(result.current.error).toBe('Table has no active order');
      expect(toast.error).toHaveBeenCalledWith('Table has no active order');
    });
  });

  describe('calculateWithTip', () => {
    it('should calculate tip and update check', async () => {
      const mockResponse = {
        amount: {
          subtotal: 50.00,
          tax: 4.00,
          tip: 10.00,
          total: 64.00
        }
      };

      const initialCheck = {
        id: 'check-1',
        tableId: 'table-1',
        subtotal: 50.0,
        tax: 4.0,
        tip: 0,
        total: 54.0
      };

      mockApi.post
        .mockResolvedValueOnce({ check: initialCheck })
        .mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTablePayment('table-1'));

      await act(async () => {
        await result.current.presentCheck();
      });

      await act(async () => {
        const amount = await result.current.calculateWithTip(10.00);
        expect(amount).toEqual(mockResponse.amount);
      });

      expect(result.current.check?.tip).toBe(10.00);
      expect(result.current.check?.total).toBe(64.00);
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/payments/table/table-1/calculate-tip',
        { tipAmount: 10.00, isPercentage: false }
      );
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const mockPayment = {
        id: 'payment-1',
        status: 'completed',
        amount: { total: 64.00 }
      };

      mockApi.post.mockResolvedValue({ payment: mockPayment });

      const { result } = renderHook(() => useTablePayment('table-1'));

      const paymentMethod = { type: 'SQUARE_TERMINAL', deviceId: 'device-1' };

      await act(async () => {
        const payment = await result.current.processPayment(paymentMethod);
        expect(payment).toEqual(mockPayment);
      });

      expect(toast.success).toHaveBeenCalledWith('Payment processed successfully!');
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/payments/table/table-1/process',
        { paymentMethod }
      );
    });

    it('should handle payment failures', async () => {
      const error = new Error('Card declined');
      mockApi.post.mockRejectedValue(error);

      const { result } = renderHook(() => useTablePayment('table-1'));

      await act(async () => {
        await expect(
          result.current.processPayment({ type: 'SQUARE_TERMINAL' })
        ).rejects.toThrow('Card declined');
      });

      expect(result.current.error).toBe('Card declined');
      expect(toast.error).toHaveBeenCalledWith('Card declined');
    });
  });

  describe('createSplitSession', () => {
    it('should create even split session', async () => {
      const mockSession = {
        id: 'session-1',
        tableId: 'table-1',
        totalAmount: 64.00,
        splits: [
          { id: 'split-1', amount: 32.00 },
          { id: 'split-2', amount: 32.00 }
        ]
      };

      mockApi.post.mockResolvedValue({ session: mockSession });

      const { result } = renderHook(() => useTablePayment('table-1'));

      await act(async () => {
        const session = await result.current.createSplitSession(2, 'EVEN');
        expect(session).toEqual(mockSession);
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/payments/table/table-1/split',
        { numSplits: 2, strategy: 'EVEN' }
      );
    });
  });

  describe('processSplitPayment', () => {
    it('should process individual split payment', async () => {
      const mockPayment = {
        id: 'split-payment-1',
        splitId: 'split-1',
        amount: 35.00,
        status: 'completed'
      };

      mockApi.post.mockResolvedValue({ payment: mockPayment });

      const { result } = renderHook(() => useTablePayment('table-1'));

      await act(async () => {
        const payment = await result.current.processSplitPayment(
          'session-1',
          'split-1',
          { type: 'DIGITAL_WALLET' },
          3.00
        );
        expect(payment).toEqual(mockPayment);
      });

      expect(toast.success).toHaveBeenCalledWith('Split payment processed!');
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/payments/split/session-1/pay/split-1',
        { paymentMethod: { type: 'DIGITAL_WALLET' }, tipAmount: 3.00 }
      );
    });
  });

  describe('unlockCheck', () => {
    it('should unlock check silently', async () => {
      mockApi.post.mockResolvedValue({});

      const { result } = renderHook(() => useTablePayment('table-1'));

      await act(async () => {
        await result.current.unlockCheck();
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/tables/table-1/unlock-check',
        {}
      );
    });

    it('should handle unlock errors silently', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.post.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTablePayment('table-1'));

      await act(async () => {
        await result.current.unlockCheck();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to unlock check:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
