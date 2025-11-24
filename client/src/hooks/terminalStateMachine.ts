/**
 * Terminal Checkout State Machine
 *
 * Replaces boolean flags and manual setInterval cleanup with a deterministic FSM.
 * Pattern based on PaymentStateMachine.ts (Phase 3) and orderStateMachine.ts.
 *
 * @see docs/reports/ARCHITECTURAL_AUDIT_REPORT_V2.md - Line 183 (Terminal Polling Anti-Pattern)
 */

export type TerminalState =
  | 'idle'
  | 'loading_devices'
  | 'devices_loaded'
  | 'creating_checkout'
  | 'polling'
  | 'completing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export type TerminalEvent =
  | { type: 'LOAD_DEVICES' }
  | { type: 'DEVICES_LOADED'; devices: any[] }
  | { type: 'DEVICE_LOAD_FAILED'; error: string }
  | { type: 'START_CHECKOUT'; orderId: string; deviceId: string }
  | { type: 'CHECKOUT_CREATED'; checkoutId: string }
  | { type: 'CHECKOUT_CREATE_FAILED'; error: string }
  | { type: 'POLL_UPDATE'; status: 'PENDING' | 'IN_PROGRESS' | 'CANCEL_REQUESTED' }
  | { type: 'CHECKOUT_COMPLETED' }
  | { type: 'CHECKOUT_FAILED'; error: string }
  | { type: 'CHECKOUT_CANCELLED' }
  | { type: 'TIMEOUT' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

export interface TerminalStateMachineContext {
  state: TerminalState;
  availableDevices: any[];
  currentCheckoutId: string | null;
  error: string | null;
  pollingAbortController: AbortController | null;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

export class TerminalStateMachine {
  private context: TerminalStateMachineContext;
  private listeners: Array<(context: TerminalStateMachineContext) => void> = [];

  constructor() {
    this.context = {
      state: 'idle',
      availableDevices: [],
      currentCheckoutId: null,
      error: null,
      pollingAbortController: null,
      timeoutHandle: null
    };
  }

  /**
   * Transition to a new state based on current state + event
   */
  transition(event: TerminalEvent): void {
    const { state } = this.context;

    switch (event.type) {
      case 'LOAD_DEVICES':
        if (state === 'idle' || state === 'devices_loaded') {
          this.updateState({ state: 'loading_devices', error: null });
        }
        break;

      case 'DEVICES_LOADED':
        if (state === 'loading_devices') {
          this.updateState({
            state: 'devices_loaded',
            availableDevices: event.devices
          });
        }
        break;

      case 'DEVICE_LOAD_FAILED':
        if (state === 'loading_devices') {
          this.updateState({
            state: 'idle',
            error: event.error
          });
        }
        break;

      case 'START_CHECKOUT':
        if (state === 'devices_loaded' || state === 'idle') {
          this.cleanup(); // Clean up any previous state
          this.updateState({
            state: 'creating_checkout',
            error: null
          });
        }
        break;

      case 'CHECKOUT_CREATED':
        if (state === 'creating_checkout') {
          // Initialize polling controller
          const abortController = new AbortController();

          this.updateState({
            state: 'polling',
            currentCheckoutId: event.checkoutId,
            pollingAbortController: abortController
          });
        }
        break;

      case 'CHECKOUT_CREATE_FAILED':
        if (state === 'creating_checkout') {
          this.updateState({
            state: 'failed',
            error: event.error
          });
        }
        break;

      case 'POLL_UPDATE':
        if (state === 'polling') {
          // State remains 'polling' - no transition needed
          // This event just confirms we're still actively polling
        }
        break;

      case 'CHECKOUT_COMPLETED':
        if (state === 'polling') {
          this.cleanup();
          this.updateState({
            state: 'completing'
          });
        }
        break;

      case 'CHECKOUT_FAILED':
        if (state === 'polling' || state === 'completing') {
          this.cleanup();
          this.updateState({
            state: 'failed',
            error: event.error
          });
        }
        break;

      case 'CHECKOUT_CANCELLED':
        if (state === 'polling' || state === 'creating_checkout') {
          this.cleanup();
          this.updateState({
            state: 'cancelled'
          });
        }
        break;

      case 'TIMEOUT':
        if (state === 'polling') {
          this.cleanup();
          this.updateState({
            state: 'timeout',
            error: 'Terminal checkout timed out after 5 minutes'
          });
        }
        break;

      case 'CANCEL':
        if (state === 'polling' || state === 'creating_checkout') {
          this.cleanup();
          this.updateState({
            state: 'cancelled'
          });
        }
        break;

      case 'RESET':
        this.cleanup();
        this.updateState({
          state: 'idle',
          currentCheckoutId: null,
          error: null,
          availableDevices: this.context.availableDevices // Keep devices
        });
        break;

      default:
        // Invalid transition - no-op
        break;
    }
  }

  /**
   * Check if a transition is valid from current state
   */
  canTransition(event: TerminalEvent): boolean {
    const { state } = this.context;

    switch (event.type) {
      case 'LOAD_DEVICES':
        return state === 'idle' || state === 'devices_loaded';

      case 'START_CHECKOUT':
        return state === 'devices_loaded' || state === 'idle';

      case 'CANCEL':
        return state === 'polling' || state === 'creating_checkout';

      case 'RESET':
        return true; // Can always reset

      default:
        return false; // State-specific events handled by transition()
    }
  }

  /**
   * Set polling timeout handle (for cleanup)
   */
  setTimeoutHandle(handle: ReturnType<typeof setTimeout>): void {
    this.context.timeoutHandle = handle;
  }

  /**
   * Get current state context
   */
  getContext(): Readonly<TerminalStateMachineContext> {
    return this.context;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (context: TerminalStateMachineContext) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Cleanup polling resources
   */
  private cleanup(): void {
    if (this.context.pollingAbortController) {
      this.context.pollingAbortController.abort();
    }

    if (this.context.timeoutHandle) {
      clearTimeout(this.context.timeoutHandle);
    }

    this.context.pollingAbortController = null;
    this.context.timeoutHandle = null;
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<TerminalStateMachineContext>): void {
    this.context = { ...this.context, ...updates };
    this.listeners.forEach(listener => listener(this.context));
  }
}
