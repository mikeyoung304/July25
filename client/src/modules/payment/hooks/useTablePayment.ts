import { useState, useCallback } from 'react';
import { useApiRequest } from '@/hooks/useApiRequest';
import type { CheckSummary, PaymentMethod, PaymentResult, SplitSession } from '../types';
import { toast } from 'react-hot-toast';

export const useTablePayment = (tableId: string) => {
  const [check, setCheck] = useState<CheckSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApiRequest();

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  const isCheckSummary = (value: unknown): value is CheckSummary =>
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.tableId === 'string' &&
    typeof value.subtotal === 'number' &&
    typeof value.tax === 'number' &&
    typeof value.tip === 'number' &&
    typeof value.total === 'number';

  const isPaymentResult = (value: unknown): value is PaymentResult =>
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    isRecord(value.amount) &&
    typeof value.amount.total === 'number';

  const isSplitSession = (value: unknown): value is SplitSession =>
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.tableId === 'string' &&
    typeof value.totalAmount === 'number';

  const extractMessage = (err: unknown, fallback: string): string => {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    if (typeof err === 'string' && err.trim().length > 0) {
      return err;
    }
    return fallback;
  };

  const isCheckResponse = (value: unknown): value is { check: CheckSummary } =>
    isRecord(value) && isCheckSummary(value.check);

  const isAmountResponse = (
    value: unknown
  ): value is { amount: { subtotal: number; tax: number; tip: number; total: number } } => {
    if (!isRecord(value) || !isRecord(value.amount)) return false;
    const amount = value.amount as Record<string, unknown>;
    return ['subtotal', 'tax', 'tip', 'total'].every((key) => typeof amount[key] === 'number');
  };

  const isPaymentResponse = (value: unknown): value is { payment: PaymentResult } =>
    isRecord(value) && isPaymentResult(value.payment);

  const isSplitSessionResponse = (value: unknown): value is { session: SplitSession } =>
    isRecord(value) && isSplitSession(value.session);

  const presentCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/v1/tables/${tableId}/present-check`, {});
      if (isCheckResponse(response)) {
        setCheck(response.check);
        return response.check;
      }
      throw new Error('Invalid response when presenting check');
    } catch (err: unknown) {
      const errorMessage = extractMessage(err, 'Failed to present check');
      setError(errorMessage);
      toast.error(errorMessage);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [tableId, api]);

  const getCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/v1/tables/${tableId}/check`);
      if (isCheckResponse(response)) {
        setCheck(response.check);
        return response.check;
      }
      throw new Error('Invalid response when retrieving check');
    } catch (err: unknown) {
      const errorMessage = extractMessage(err, 'Failed to get check');
      setError(errorMessage);
      toast.error(errorMessage);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [tableId, api]);

  const calculateWithTip = useCallback(async (tipAmount: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/v1/payments/table/${tableId}/calculate-tip`, {
        tipAmount,
        isPercentage: false,
      });

      if (isAmountResponse(response)) {
        setCheck((prev) =>
          prev
            ? {
                ...prev,
                tip: response.amount.tip,
                total: response.amount.total,
              }
            : prev
        );
        return response.amount;
      }
      throw new Error('Invalid response when calculating tip');
    } catch (err: unknown) {
      const errorMessage = extractMessage(err, 'Failed to calculate tip');
      setError(errorMessage);
      toast.error(errorMessage);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [tableId, api]);

  const processPayment = useCallback(async (paymentMethod: PaymentMethod) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/v1/payments/table/${tableId}/process`, {
        paymentMethod
      });
      
      if (isPaymentResponse(response)) {
        toast.success('Payment processed successfully!');
        return response.payment;
      }
      throw new Error('Invalid response when processing payment');
    } catch (err: unknown) {
      const errorMessage = extractMessage(err, 'Payment processing failed');
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [tableId, api]);

  const createSplitSession = useCallback(async (numSplits: number, strategy: string = 'EVEN') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/v1/payments/table/${tableId}/split`, {
        numSplits,
        strategy
      });
      
      if (isSplitSessionResponse(response)) {
        return response.session;
      }
      throw new Error('Invalid response when creating split session');
    } catch (err: unknown) {
      const errorMessage = extractMessage(err, 'Failed to create split session');
      setError(errorMessage);
      toast.error(errorMessage);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [tableId, api]);

  const processSplitPayment = useCallback(async (
    sessionId: string,
    splitId: string,
    paymentMethod: PaymentMethod,
    tipAmount: number = 0
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/v1/payments/split/${sessionId}/pay/${splitId}`, {
        paymentMethod,
        tipAmount
      });
      
      if (isPaymentResponse(response)) {
        toast.success('Split payment processed!');
        return response.payment;
      }
      throw new Error('Invalid response when processing split payment');
    } catch (err: unknown) {
      const errorMessage = extractMessage(err, 'Split payment failed');
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const unlockCheck = useCallback(async () => {
    try {
      await api.post(`/api/v1/tables/${tableId}/unlock-check`, {});
    } catch (err) {
      console.error('Failed to unlock check:', err);
    }
  }, [tableId, api]);

  return {
    check,
    isLoading,
    error,
    presentCheck,
    getCheck,
    calculateWithTip,
    processPayment,
    createSplitSession,
    processSplitPayment,
    unlockCheck
  };
};

