/**
 * Finite State Machine for Payment Flow
 *
 * PHASE 3: Architectural Hardening - Replaces ad-hoc boolean flags with a proper
 * event-driven state machine for payment processing.
 *
 * Key Design Principles:
 * - Single source of truth for payment state
 * - Event-driven transitions (no setTimeout-based state changes)
 * - Explicit guard conditions prevent invalid transitions
 * - Comprehensive error recovery paths
 * - Transition history for debugging
 * - Works with both Card and Terminal payment methods
 *
 * Version: 1.0.0
 * Created: 2025-01-23 (Phase 3: Architectural Hardening)
 * Payment Provider: Stripe
 */

import { logger } from '../logger';

// ============================================================================
// STATE AND EVENT DEFINITIONS
// ============================================================================

/**
 * All possible states in the payment processing lifecycle
 */
export enum PaymentState {
  // Initial state
  IDLE = 'IDLE',                                    // No payment initiated

  // Card payment flow
  INITIALIZING_SDK = 'INITIALIZING_SDK',            // Loading Stripe SDK
  SDK_READY = 'SDK_READY',                          // Stripe SDK loaded and ready
  TOKENIZING_CARD = 'TOKENIZING_CARD',              // Converting card to token
  PROCESSING_CARD = 'PROCESSING_CARD',              // Submitting card payment to API

  // Terminal payment flow
  LOADING_DEVICES = 'LOADING_DEVICES',              // Fetching available terminals
  DEVICES_READY = 'DEVICES_READY',                  // Terminals loaded, awaiting selection
  CREATING_CHECKOUT = 'CREATING_CHECKOUT',          // Creating terminal checkout
  AWAITING_TERMINAL = 'AWAITING_TERMINAL',          // Waiting for customer at terminal
  PROCESSING_TERMINAL = 'PROCESSING_TERMINAL',      // Terminal payment in progress

  // Common completion states
  COMPLETING_ORDER = 'COMPLETING_ORDER',            // Finalizing order after payment
  COMPLETED = 'COMPLETED',                          // Payment successful

  // Error and recovery states
  SDK_ERROR = 'SDK_ERROR',                          // SDK failed to load (fallback to demo)
  ERROR = 'ERROR',                                  // Recoverable error occurred
  TIMEOUT = 'TIMEOUT',                              // Operation timed out
  CANCELLED = 'CANCELLED',                          // User cancelled payment

  // Demo mode state
  PROCESSING_DEMO = 'PROCESSING_DEMO',              // Demo payment simulation
}

/**
 * All events that can trigger state transitions
 */
export enum PaymentEvent {
  // SDK lifecycle events
  CARD_PAYMENT_REQUESTED = 'CARD_PAYMENT_REQUESTED',
  SDK_LOAD_STARTED = 'SDK_LOAD_STARTED',
  SDK_LOADED = 'SDK_LOADED',
  SDK_FAILED = 'SDK_FAILED',                        // SDK blocked/unavailable -> demo mode

  // Card payment events
  TOKENIZATION_STARTED = 'TOKENIZATION_STARTED',
  TOKENIZATION_COMPLETE = 'TOKENIZATION_COMPLETE',
  CARD_PROCESSING_STARTED = 'CARD_PROCESSING_STARTED',

  // Terminal payment events
  TERMINAL_PAYMENT_REQUESTED = 'TERMINAL_PAYMENT_REQUESTED',
  DEVICES_LOAD_STARTED = 'DEVICES_LOAD_STARTED',
  DEVICES_LOADED = 'DEVICES_LOADED',
  DEVICE_SELECTED = 'DEVICE_SELECTED',
  CHECKOUT_CREATED = 'CHECKOUT_CREATED',
  TERMINAL_PROCESSING = 'TERMINAL_PROCESSING',

  // Demo mode events
  DEMO_PAYMENT_REQUESTED = 'DEMO_PAYMENT_REQUESTED',
  DEMO_PROCESSING_STARTED = 'DEMO_PROCESSING_STARTED',

  // Common completion events
  PAYMENT_CAPTURED = 'PAYMENT_CAPTURED',            // Payment successful on Stripe side
  ORDER_COMPLETION_STARTED = 'ORDER_COMPLETION_STARTED',
  PAYMENT_COMPLETE = 'PAYMENT_COMPLETE',            // Full flow complete

  // Error and recovery events
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  TIMEOUT_OCCURRED = 'TIMEOUT_OCCURRED',
  RETRY_REQUESTED = 'RETRY_REQUESTED',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  RESET_REQUESTED = 'RESET_REQUESTED',
}

// ============================================================================
// TRANSITION TABLE
// ============================================================================

/**
 * Complete state machine transition table.
 *
 * Maps: Current State -> Event -> Next State
 *
 * Only valid transitions are defined. Invalid transitions will be rejected
 * by the state machine with clear error messages.
 */
export const PAYMENT_STATE_TRANSITIONS: Record<
  PaymentState,
  Partial<Record<PaymentEvent, PaymentState>>
> = {
  [PaymentState.IDLE]: {
    [PaymentEvent.CARD_PAYMENT_REQUESTED]: PaymentState.INITIALIZING_SDK,
    [PaymentEvent.TERMINAL_PAYMENT_REQUESTED]: PaymentState.LOADING_DEVICES,
    [PaymentEvent.DEMO_PAYMENT_REQUESTED]: PaymentState.PROCESSING_DEMO,
  },

  [PaymentState.INITIALIZING_SDK]: {
    [PaymentEvent.SDK_LOADED]: PaymentState.SDK_READY,
    [PaymentEvent.SDK_FAILED]: PaymentState.SDK_ERROR,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
    [PaymentEvent.TIMEOUT_OCCURRED]: PaymentState.TIMEOUT,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.SDK_READY]: {
    [PaymentEvent.TOKENIZATION_STARTED]: PaymentState.TOKENIZING_CARD,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.TOKENIZING_CARD]: {
    [PaymentEvent.TOKENIZATION_COMPLETE]: PaymentState.PROCESSING_CARD,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
    [PaymentEvent.TIMEOUT_OCCURRED]: PaymentState.TIMEOUT,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.PROCESSING_CARD]: {
    [PaymentEvent.PAYMENT_CAPTURED]: PaymentState.COMPLETING_ORDER,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
    [PaymentEvent.TIMEOUT_OCCURRED]: PaymentState.TIMEOUT,
  },

  [PaymentState.LOADING_DEVICES]: {
    [PaymentEvent.DEVICES_LOADED]: PaymentState.DEVICES_READY,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
    [PaymentEvent.TIMEOUT_OCCURRED]: PaymentState.TIMEOUT,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.DEVICES_READY]: {
    [PaymentEvent.DEVICE_SELECTED]: PaymentState.CREATING_CHECKOUT,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.CREATING_CHECKOUT]: {
    [PaymentEvent.CHECKOUT_CREATED]: PaymentState.AWAITING_TERMINAL,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
    [PaymentEvent.TIMEOUT_OCCURRED]: PaymentState.TIMEOUT,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.AWAITING_TERMINAL]: {
    [PaymentEvent.TERMINAL_PROCESSING]: PaymentState.PROCESSING_TERMINAL,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
    [PaymentEvent.TIMEOUT_OCCURRED]: PaymentState.TIMEOUT,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.PROCESSING_TERMINAL]: {
    [PaymentEvent.PAYMENT_CAPTURED]: PaymentState.COMPLETING_ORDER,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
    [PaymentEvent.TIMEOUT_OCCURRED]: PaymentState.TIMEOUT,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.PROCESSING_DEMO]: {
    [PaymentEvent.PAYMENT_CAPTURED]: PaymentState.COMPLETING_ORDER,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
  },

  [PaymentState.COMPLETING_ORDER]: {
    [PaymentEvent.PAYMENT_COMPLETE]: PaymentState.COMPLETED,
    [PaymentEvent.ERROR_OCCURRED]: PaymentState.ERROR,
  },

  [PaymentState.COMPLETED]: {
    [PaymentEvent.RESET_REQUESTED]: PaymentState.IDLE,
  },

  [PaymentState.SDK_ERROR]: {
    [PaymentEvent.DEMO_PAYMENT_REQUESTED]: PaymentState.PROCESSING_DEMO,
    [PaymentEvent.RETRY_REQUESTED]: PaymentState.IDLE,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.ERROR]: {
    [PaymentEvent.RETRY_REQUESTED]: PaymentState.IDLE,
    [PaymentEvent.RESET_REQUESTED]: PaymentState.IDLE,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.TIMEOUT]: {
    [PaymentEvent.RETRY_REQUESTED]: PaymentState.IDLE,
    [PaymentEvent.RESET_REQUESTED]: PaymentState.IDLE,
    [PaymentEvent.CANCEL_REQUESTED]: PaymentState.CANCELLED,
  },

  [PaymentState.CANCELLED]: {
    [PaymentEvent.RESET_REQUESTED]: PaymentState.IDLE,
  },
};

// ============================================================================
// TRANSITION HISTORY
// ============================================================================

export interface PaymentTransitionRecord {
  from: PaymentState;
  to: PaymentState;
  event: PaymentEvent;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// STATE MACHINE CLASS
// ============================================================================

export interface PaymentStateMachineOptions {
  debug?: boolean;
  maxHistorySize?: number;
  onTransition?: (record: PaymentTransitionRecord) => void;
}

export class PaymentStateMachine {
  private currentState: PaymentState = PaymentState.IDLE;
  private transitionHistory: PaymentTransitionRecord[] = [];
  private readonly debug: boolean;
  private readonly maxHistorySize: number;
  private readonly onTransition?: (record: PaymentTransitionRecord) => void;

  constructor(options: PaymentStateMachineOptions = {}) {
    this.debug = options.debug ?? false;
    this.maxHistorySize = options.maxHistorySize ?? 50;
    this.onTransition = options.onTransition;

    if (this.debug) {
      logger.info('[PaymentStateMachine] Initialized', { initialState: this.currentState });
    }
  }

  /**
   * Get current state
   */
  getState(): PaymentState {
    return this.currentState;
  }

  /**
   * Attempt a state transition based on an event
   */
  transition(event: PaymentEvent, metadata?: Record<string, any>): PaymentState {
    const fromState = this.currentState;
    const validTransitions = PAYMENT_STATE_TRANSITIONS[fromState];

    if (!validTransitions || !validTransitions[event]) {
      const errorMsg = `Invalid transition: ${event} from state ${fromState}`;
      logger.error('[PaymentStateMachine] Invalid transition', {
        currentState: fromState,
        event,
        validEvents: Object.keys(validTransitions || {}),
      });
      throw new Error(errorMsg);
    }

    const toState = validTransitions[event]!;
    this.currentState = toState;

    // Record transition
    const record: PaymentTransitionRecord = {
      from: fromState,
      to: toState,
      event,
      timestamp: new Date(),
      metadata,
    };

    this.transitionHistory.push(record);

    // Limit history size
    if (this.transitionHistory.length > this.maxHistorySize) {
      this.transitionHistory.shift();
    }

    // Notify listener
    this.onTransition?.(record);

    if (this.debug) {
      logger.info('[PaymentStateMachine] Transition', {
        from: fromState,
        to: toState,
        event,
        metadata,
      });
    }

    return toState;
  }

  /**
   * Get transition history for debugging
   */
  getHistory(): PaymentTransitionRecord[] {
    return [...this.transitionHistory];
  }

  /**
   * Clear transition history
   */
  clearHistory(): void {
    this.transitionHistory = [];
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    const previousState = this.currentState;
    this.currentState = PaymentState.IDLE;
    this.clearHistory();

    if (this.debug) {
      logger.info('[PaymentStateMachine] Reset', {
        previousState,
        newState: PaymentState.IDLE,
      });
    }
  }

  // ============================================================================
  // GUARD CONDITIONS (State Predicates)
  // ============================================================================

  /**
   * Check if payment can be initiated
   */
  canInitiatePayment(): boolean {
    return this.currentState === PaymentState.IDLE;
  }

  /**
   * Check if currently processing
   */
  isProcessing(): boolean {
    return [
      PaymentState.INITIALIZING_SDK,
      PaymentState.TOKENIZING_CARD,
      PaymentState.PROCESSING_CARD,
      PaymentState.CREATING_CHECKOUT,
      PaymentState.PROCESSING_TERMINAL,
      PaymentState.PROCESSING_DEMO,
      PaymentState.COMPLETING_ORDER,
    ].includes(this.currentState);
  }

  /**
   * Check if payment is complete
   */
  isComplete(): boolean {
    return this.currentState === PaymentState.COMPLETED;
  }

  /**
   * Check if in error state
   */
  isError(): boolean {
    return [
      PaymentState.SDK_ERROR,
      PaymentState.ERROR,
      PaymentState.TIMEOUT,
      PaymentState.CANCELLED,
    ].includes(this.currentState);
  }

  /**
   * Check if can retry
   */
  canRetry(): boolean {
    return [
      PaymentState.SDK_ERROR,
      PaymentState.ERROR,
      PaymentState.TIMEOUT,
    ].includes(this.currentState);
  }

  /**
   * Check if can cancel
   */
  canCancel(): boolean {
    return [
      PaymentState.INITIALIZING_SDK,
      PaymentState.SDK_READY,
      PaymentState.TOKENIZING_CARD,
      PaymentState.LOADING_DEVICES,
      PaymentState.DEVICES_READY,
      PaymentState.CREATING_CHECKOUT,
      PaymentState.AWAITING_TERMINAL,
      PaymentState.PROCESSING_TERMINAL,
      PaymentState.SDK_ERROR,
      PaymentState.ERROR,
      PaymentState.TIMEOUT,
    ].includes(this.currentState);
  }

  /**
   * Check if waiting for terminal
   */
  isAwaitingTerminal(): boolean {
    return this.currentState === PaymentState.AWAITING_TERMINAL;
  }

  /**
   * Check if SDK is ready for card payment
   */
  isSDKReady(): boolean {
    return this.currentState === PaymentState.SDK_READY;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate that the transition table is complete and correct
   */
  static validateTransitionTable(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check all states have an entry
    const allStates = Object.values(PaymentState);
    const definedStates = Object.keys(PAYMENT_STATE_TRANSITIONS);

    for (const state of allStates) {
      if (!definedStates.includes(state)) {
        errors.push(`Missing transition definition for state: ${state}`);
      }
    }

    // Check for unreachable states (except IDLE)
    const reachableStates = new Set<PaymentState>([PaymentState.IDLE]);
    for (const transitions of Object.values(PAYMENT_STATE_TRANSITIONS)) {
      for (const targetState of Object.values(transitions)) {
        if (targetState) {
          reachableStates.add(targetState);
        }
      }
    }

    for (const state of allStates) {
      if (!reachableStates.has(state as PaymentState)) {
        errors.push(`Unreachable state detected: ${state}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
