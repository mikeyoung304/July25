import { useState, useCallback } from 'react';
import { useApiRequest } from '@/hooks/useApiRequest';
import { CheckSummary } from '../types';
import { toast } from 'react-hot-toast';

export const useTablePayment = (tableId: string) => {
  const [check, setCheck] = useState<CheckSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApiRequest();

  const presentCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/v1/tables/${tableId}/present-check`, {});
      if (response && response.check) {
        setCheck(response.check);
        return response.check;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to present check';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tableId, api]);

  const getCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/v1/tables/${tableId}/check`);
      if (response && response.check) {
        setCheck(response.check);
        return response.check;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get check';
      setError(errorMessage);
      toast.error(errorMessage);
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
        isPercentage: false
      });
      
      if (response && response.amount) {
        // Update local check with new tip
        setCheck(prev => prev ? {
          ...prev,
          tip: tipAmount,
          total: response.amount.total
        } : null);
        return response.amount;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to calculate tip';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tableId, api]);

  const processPayment = useCallback(async (paymentMethod: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/v1/payments/table/${tableId}/process`, {
        paymentMethod
      });
      
      if (response && response.payment) {
        toast.success('Payment processed successfully!');
        return response.payment;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Payment processing failed';
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
      
      if (response && response.session) {
        return response.session;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create split session';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tableId, api]);

  const processSplitPayment = useCallback(async (
    sessionId: string,
    splitId: string,
    paymentMethod: any,
    tipAmount: number = 0
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/v1/payments/split/${sessionId}/pay/${splitId}`, {
        paymentMethod,
        tipAmount
      });
      
      if (response && response.payment) {
        toast.success('Split payment processed!');
        return response.payment;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Split payment failed';
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