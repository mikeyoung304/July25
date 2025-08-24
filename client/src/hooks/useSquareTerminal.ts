import { useState, useCallback, useRef, useEffect } from 'react';
import { useApiRequest } from './useApiRequest';
import { useToast } from './useToast';

export interface TerminalDevice {
  id: string;
  name: string;
  code: string;
  deviceId: string;
  status: string;
  statusChangedAt: string;
  pairBy: string;
}

export interface TerminalCheckout {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'CANCEL_REQUESTED' | 'CANCELED' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  referenceId?: string;
  amountMoney?: {
    amount: string;
    currency: string;
  };
  paymentIds?: string[];
  paymentType?: string;
}

export interface TerminalPayment {
  id?: string;
  paymentId?: string;
  status: string;
  receiptUrl?: string;
}

export interface UseSquareTerminalOptions {
  onSuccess?: (orderData: any, paymentData: TerminalPayment) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: TerminalCheckout['status']) => void;
  pollingInterval?: number; // milliseconds, default 2000
  timeout?: number; // milliseconds, default 300000 (5 minutes)
  debug?: boolean;
}

export interface UseSquareTerminalReturn {
  // State
  isLoading: boolean;
  isPolling: boolean;
  currentCheckout: TerminalCheckout | null;
  availableDevices: TerminalDevice[];
  error: string | null;
  
  // Actions
  loadDevices: () => Promise<void>;
  startCheckout: (orderId: string, deviceId: string) => Promise<void>;
  cancelCheckout: () => Promise<void>;
  reset: () => void;
  
  // Status helpers
  isCheckoutActive: boolean;
  isCheckoutCompleted: boolean;
  isCheckoutFailed: boolean;
}

/**
 * Hook for managing Square Terminal checkout flow
 * 
 * Provides complete terminal payment functionality including:
 * - Device discovery and selection
 * - Checkout creation and polling
 * - Payment completion handling
 * - Error and timeout management
 * 
 * @param options Configuration options for terminal behavior
 * @returns Terminal state and control functions
 */
export function useSquareTerminal(options: UseSquareTerminalOptions = {}): UseSquareTerminalReturn {
  const {
    onSuccess,
    onError,
    onStatusChange,
    pollingInterval = 2000,
    timeout = 300000, // 5 minutes
    debug = false
  } = options;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [currentCheckout, setCurrentCheckout] = useState<TerminalCheckout | null>(null);
  const [availableDevices, setAvailableDevices] = useState<TerminalDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const api = useApiRequest();
  const { toast } = useToast();

  // Refs for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  // Load available terminal devices
  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (debug) {
        console.log('[useSquareTerminal] Loading terminal devices...');
      }

      const response = await api.get('/api/v1/terminal/devices');
      
      if (!response || !response.success) {
        throw new Error('Failed to load terminal devices');
      }

      setAvailableDevices(response.devices || []);

      if (debug) {
        console.log('[useSquareTerminal] Loaded devices:', response.devices?.length || 0);
      }

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load terminal devices';
      setError(errorMessage);
      onError?.(errorMessage);
      
      if (debug) {
        console.error('[useSquareTerminal] Device loading error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, onError, debug]);

  // Poll checkout status
  const pollCheckoutStatus = useCallback(async (checkoutId: string) => {
    try {
      if (isUnmountedRef.current) return;

      const response = await api.get(`/api/v1/terminal/checkout/${checkoutId}`);
      
      if (!response || !response.success) {
        throw new Error('Failed to get checkout status');
      }

      const checkout = response.checkout as TerminalCheckout;
      
      if (debug) {
        console.log('[useSquareTerminal] Checkout status:', checkout.status);
      }

      setCurrentCheckout(checkout);
      onStatusChange?.(checkout.status);

      // Handle terminal states
      if (checkout.status === 'COMPLETED') {
        // Payment completed successfully
        cleanup();

        try {
          // Complete the order
          const completionResponse = await api.post(`/api/v1/terminal/checkout/${checkoutId}/complete`);
          
          if (completionResponse && completionResponse.success) {
            const paymentData: TerminalPayment = {
              ...completionResponse.payment,
              status: 'completed'
            };

            onSuccess?.(completionResponse.order, paymentData);
            
            toast.success('Payment completed successfully!');

            if (debug) {
              console.log('[useSquareTerminal] Payment completed:', paymentData);
            }
          } else {
            throw new Error('Failed to complete order after payment');
          }
        } catch (completionError: any) {
          const errorMessage = completionError?.message || 'Failed to complete order';
          setError(errorMessage);
          onError?.(errorMessage);
          toast.error(errorMessage);
        }

      } else if (checkout.status === 'FAILED' || checkout.status === 'CANCELED') {
        // Payment failed or cancelled
        cleanup();
        const errorMessage = checkout.status === 'CANCELED' 
          ? 'Payment was cancelled' 
          : 'Payment failed';
        
        setError(errorMessage);
        onError?.(errorMessage);
        
        if (checkout.status === 'CANCELED') {
          toast.error('Payment was cancelled');
        } else {
          toast.error('Payment failed. Please try again.');
        }
      }
      // For PENDING, IN_PROGRESS, CANCEL_REQUESTED - continue polling

    } catch (err: any) {
      if (isUnmountedRef.current) return;
      
      const errorMessage = err?.message || 'Failed to check payment status';
      
      if (debug) {
        console.error('[useSquareTerminal] Polling error:', err);
      }

      // Don't immediately fail on polling errors - could be temporary
      // But log them and continue polling for now
      console.warn('[useSquareTerminal] Polling warning:', errorMessage);
    }
  }, [api, onSuccess, onError, onStatusChange, cleanup, toast, debug]);

  // Start terminal checkout
  const startCheckout = useCallback(async (orderId: string, deviceId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      cleanup(); // Clean up any existing polling

      if (debug) {
        console.log('[useSquareTerminal] Starting checkout:', { orderId, deviceId });
      }

      const response = await api.post('/api/v1/terminal/checkout', {
        orderId,
        deviceId
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to create terminal checkout');
      }

      const checkout = response.checkout as TerminalCheckout;
      setCurrentCheckout(checkout);

      if (debug) {
        console.log('[useSquareTerminal] Checkout created:', checkout.id);
      }

      // Start polling for status updates
      setIsPolling(true);
      
      pollingIntervalRef.current = setInterval(() => {
        if (!isUnmountedRef.current) {
          pollCheckoutStatus(checkout.id);
        }
      }, pollingInterval);

      // Set timeout for checkout
      timeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          cleanup();
          setError('Terminal checkout timed out');
          onError?.('Terminal checkout timed out after 5 minutes');
          toast.error('Payment timed out. Please try again.');
          
          // Attempt to cancel the checkout
          cancelCheckout().catch(err => {
            console.warn('Failed to cancel timed out checkout:', err);
          });
        }
      }, timeout);

      toast.success('Terminal checkout started. Please follow instructions on the terminal.');

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to start terminal checkout';
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error(errorMessage);
      
      if (debug) {
        console.error('[useSquareTerminal] Checkout start error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, onError, cleanup, pollCheckoutStatus, pollingInterval, timeout, toast, debug]);

  // Cancel current checkout
  const cancelCheckout = useCallback(async () => {
    if (!currentCheckout?.id) {
      return;
    }

    try {
      setIsLoading(true);
      cleanup();

      if (debug) {
        console.log('[useSquareTerminal] Cancelling checkout:', currentCheckout.id);
      }

      const response = await api.post(`/api/v1/terminal/checkout/${currentCheckout.id}/cancel`);
      
      if (response && response.success) {
        setCurrentCheckout(response.checkout);
        toast.success('Terminal checkout cancelled');
      }

      // Reset state regardless of API response
      setCurrentCheckout(null);
      setError(null);

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to cancel terminal checkout';
      console.warn('[useSquareTerminal] Cancel error:', errorMessage);
      
      // Still reset state even if cancel failed
      setCurrentCheckout(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentCheckout?.id, api, cleanup, toast, debug]);

  // Reset all state
  const reset = useCallback(() => {
    cleanup();
    setCurrentCheckout(null);
    setError(null);
    setIsLoading(false);
    
    if (debug) {
      console.log('[useSquareTerminal] State reset');
    }
  }, [cleanup, debug]);

  // Computed values
  const isCheckoutActive = currentCheckout?.status === 'PENDING' || 
                          currentCheckout?.status === 'IN_PROGRESS';
  const isCheckoutCompleted = currentCheckout?.status === 'COMPLETED';
  const isCheckoutFailed = currentCheckout?.status === 'FAILED' || 
                          currentCheckout?.status === 'CANCELED';

  return {
    // State
    isLoading,
    isPolling,
    currentCheckout,
    availableDevices,
    error,
    
    // Actions
    loadDevices,
    startCheckout,
    cancelCheckout,
    reset,
    
    // Status helpers
    isCheckoutActive,
    isCheckoutCompleted,
    isCheckoutFailed,
  };
}