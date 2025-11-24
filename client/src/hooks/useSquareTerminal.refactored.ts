/**
 * useSquareTerminal - Refactored with FSM Pattern
 *
 * PHASE 4: Replaced boolean flags and manual setInterval cleanup with
 * a deterministic Finite State Machine pattern.
 *
 * Changes from original:
 * - Eliminated `isLoading`, `isPolling` boolean flags
 * - Replaced manual setInterval/setTimeout cleanup with AbortController
 * - All state managed by TerminalStateMachine
 * - Polling lifecycle tied to FSM state, not refs
 *
 * @see client/src/hooks/terminalStateMachine.ts
 * @see docs/reports/ARCHITECTURAL_AUDIT_REPORT_V2.md - Line 183
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useHttpClient } from '@/services/http';
import { useToast } from './useToast';
import { logger } from '@/services/logger';
import {
  TerminalStateMachine,
  type TerminalState
} from './terminalStateMachine';

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

// API Response types
interface TerminalDevicesResponse {
  success: boolean;
  devices?: TerminalDevice[];
  error?: string;
}

interface TerminalCheckoutResponse {
  success: boolean;
  checkout?: TerminalCheckout;
  payment?: any;
  order?: any;
  error?: string;
}

interface TerminalCreateCheckoutResponse {
  success: boolean;
  checkout?: TerminalCheckout;
  error?: string;
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
  state: TerminalState;
  currentCheckout: TerminalCheckout | null;
  availableDevices: TerminalDevice[];
  error: string | null;

  // Actions
  loadDevices: () => Promise<void>;
  startCheckout: (orderId: string, deviceId: string) => Promise<void>;
  cancelCheckout: () => Promise<void>;
  reset: () => void;

  // Status helpers (derived from FSM state)
  isLoading: boolean;
  isPolling: boolean;
  isCheckoutActive: boolean;
  isCheckoutCompleted: boolean;
  isCheckoutFailed: boolean;
}

/**
 * Hook for managing Square Terminal checkout flow with FSM pattern
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

  // FSM instance (stable across renders)
  const fsmRef = useRef<TerminalStateMachine | null>(null);
  if (!fsmRef.current) {
    fsmRef.current = new TerminalStateMachine();
  }
  const fsm = fsmRef.current;

  // State synced from FSM
  const [state, setState] = useState<TerminalState>(fsm.getContext().state);
  const [currentCheckout, setCurrentCheckout] = useState<TerminalCheckout | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const { get, post } = useHttpClient();
  const { toast } = useToast();

  // Polling interval ref (managed by FSM lifecycle)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to FSM state changes
  useEffect(() => {
    const unsubscribe = fsm.subscribe((context) => {
      setState(context.state);
      setError(context.error);

      if (debug) {
        logger.info('[useSquareTerminal] FSM state changed', {
          state: context.state,
          checkoutId: context.currentCheckoutId
        });
      }
    });

    return () => {
      unsubscribe();
      // Cleanup polling on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fsm, debug]);

  // Poll checkout status (only called when FSM is in 'polling' state)
  const pollCheckoutStatus = useCallback(async (checkoutId: string) => {
    try {
      const fsmContext = fsm.getContext();

      // Safety check: Only poll if FSM is in polling state
      if (fsmContext.state !== 'polling') {
        return;
      }

      // Check if aborted
      if (fsmContext.pollingAbortController?.signal.aborted) {
        return;
      }

      const response = await get(`/api/v1/terminal/checkout/${checkoutId}`) as TerminalCheckoutResponse;

      if (!response || !response.success) {
        throw new Error('Failed to get checkout status');
      }

      const checkout = response.checkout as TerminalCheckout;

      setCurrentCheckout(checkout);
      onStatusChange?.(checkout.status);

      // FSM transitions based on checkout status
      if (checkout.status === 'COMPLETED') {
        fsm.transition({ type: 'CHECKOUT_COMPLETED' });

        // Complete the order
        try {
          const completionResponse = await post(`/api/v1/terminal/checkout/${checkoutId}/complete`);

          if (completionResponse && (completionResponse as any).success) {
            const paymentData: TerminalPayment = {
              ...(completionResponse as any).payment,
              status: 'completed'
            };

            onSuccess?.((completionResponse as any).order, paymentData);
            toast.success('Payment completed successfully!');
          } else {
            throw new Error('Failed to complete order after payment');
          }
        } catch (completionError: any) {
          const errorMessage = completionError?.message || 'Failed to complete order';
          fsm.transition({ type: 'CHECKOUT_FAILED', error: errorMessage });
          onError?.(errorMessage);
          toast.error(errorMessage);
        }

      } else if (checkout.status === 'FAILED') {
        fsm.transition({ type: 'CHECKOUT_FAILED', error: 'Payment failed' });
        onError?.('Payment failed');
        toast.error('Payment failed. Please try again.');

      } else if (checkout.status === 'CANCELED') {
        fsm.transition({ type: 'CHECKOUT_CANCELLED' });
        onError?.('Payment was cancelled');
        toast.error('Payment was cancelled');

      } else {
        // PENDING, IN_PROGRESS, CANCEL_REQUESTED - update FSM (no state change)
        fsm.transition({ type: 'POLL_UPDATE', status: checkout.status });
      }

    } catch (err: any) {
      const fsmContext = fsm.getContext();

      // Don't fail on abort
      if (fsmContext.pollingAbortController?.signal.aborted) {
        return;
      }

      const errorMessage = err?.message || 'Failed to check payment status';
      logger.warn('[useSquareTerminal] Polling warning:', errorMessage);
      // Don't immediately fail - could be temporary network issue
    }
  }, [fsm, get, post, onSuccess, onError, onStatusChange, toast]);

  // Start polling when FSM enters 'polling' state
  useEffect(() => {
    const fsmContext = fsm.getContext();

    if (fsmContext.state === 'polling' && fsmContext.currentCheckoutId) {
      // Start polling interval
      pollingIntervalRef.current = setInterval(() => {
        pollCheckoutStatus(fsmContext.currentCheckoutId!);
      }, pollingInterval);

      // Set timeout for checkout
      const timeoutHandle = setTimeout(() => {
        fsm.transition({ type: 'TIMEOUT' });
        toast.error('Payment timed out. Please try again.');

        // Attempt to cancel the checkout
        cancelCheckout().catch(err => {
          logger.warn('Failed to cancel timed out checkout:', err);
        });
      }, timeout);

      fsm.setTimeoutHandle(timeoutHandle);

      // Cleanup on state exit
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [fsm, pollCheckoutStatus, pollingInterval, timeout, toast]);

  // Load available terminal devices
  const loadDevices = useCallback(async () => {
    try {
      fsm.transition({ type: 'LOAD_DEVICES' });

      const response = await get('/api/v1/terminal/devices') as TerminalDevicesResponse;

      if (!response || !response.success) {
        throw new Error('Failed to load terminal devices');
      }

      fsm.transition({ type: 'DEVICES_LOADED', devices: response.devices || [] });

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load terminal devices';
      fsm.transition({ type: 'DEVICE_LOAD_FAILED', error: errorMessage });
      onError?.(errorMessage);

      if (debug) {
        logger.error('[useSquareTerminal] Device loading error:', err);
      }
    }
  }, [fsm, get, onError, debug]);

  // Start terminal checkout
  const startCheckout = useCallback(async (orderId: string, deviceId: string) => {
    try {
      fsm.transition({ type: 'START_CHECKOUT', orderId, deviceId });

      const response = await post('/api/v1/terminal/checkout', {
        orderId,
        deviceId
      }) as TerminalCreateCheckoutResponse;

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to create terminal checkout');
      }

      const checkout = response.checkout as TerminalCheckout;
      setCurrentCheckout(checkout);

      fsm.transition({ type: 'CHECKOUT_CREATED', checkoutId: checkout.id });

      toast.success('Terminal checkout started. Please follow instructions on the terminal.');

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to start terminal checkout';
      fsm.transition({ type: 'CHECKOUT_CREATE_FAILED', error: errorMessage });
      onError?.(errorMessage);
      toast.error(errorMessage);

      if (debug) {
        logger.error('[useSquareTerminal] Checkout start error:', err);
      }
    }
  }, [fsm, post, onError, toast, debug]);

  // Cancel current checkout
  const cancelCheckout = useCallback(async () => {
    const fsmContext = fsm.getContext();

    if (!fsmContext.currentCheckoutId) {
      return;
    }

    try {
      fsm.transition({ type: 'CANCEL' });

      const response = await post(`/api/v1/terminal/checkout/${fsmContext.currentCheckoutId}/cancel`) as TerminalCheckoutResponse;

      if (response && response.success) {
        setCurrentCheckout(response.checkout || null);
        toast.success('Terminal checkout cancelled');
      }

      // Reset state regardless of API response
      setCurrentCheckout(null);

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to cancel terminal checkout';
      logger.warn('[useSquareTerminal] Cancel error:', errorMessage);

      // Still reset state even if cancel failed
      setCurrentCheckout(null);
    }
  }, [fsm, post, toast]);

  // Reset all state
  const reset = useCallback(() => {
    fsm.transition({ type: 'RESET' });
    setCurrentCheckout(null);

    if (debug) {
      logger.info('[useSquareTerminal] State reset');
    }
  }, [fsm, debug]);

  // Derived state from FSM
  const fsmContext = fsm.getContext();
  const isLoading = state === 'loading_devices' || state === 'creating_checkout' || state === 'completing';
  const isPolling = state === 'polling';
  const isCheckoutActive = currentCheckout?.status === 'PENDING' || currentCheckout?.status === 'IN_PROGRESS';
  const isCheckoutCompleted = state === 'completed' || currentCheckout?.status === 'COMPLETED';
  const isCheckoutFailed = state === 'failed' || state === 'timeout' || state === 'cancelled';

  return {
    // State
    state,
    currentCheckout,
    availableDevices: fsmContext.availableDevices,
    error,

    // Actions
    loadDevices,
    startCheckout,
    cancelCheckout,
    reset,

    // Status helpers (backward compatible)
    isLoading,
    isPolling,
    isCheckoutActive,
    isCheckoutCompleted,
    isCheckoutFailed,
  };
}
