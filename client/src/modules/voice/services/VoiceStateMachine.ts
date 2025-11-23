/**
 * Finite State Machine for WebRTC Voice Connection
 *
 * PHASE 2: Stabilization - Replaces ad-hoc boolean flags and timeout-based logic
 * with a proper event-driven state machine.
 *
 * Key Design Principles:
 * - Single source of truth for connection state
 * - Event-driven transitions (no setTimeout-based state changes)
 * - Explicit guard conditions prevent invalid transitions
 * - Comprehensive error recovery paths
 * - Transition history for debugging
 *
 * Version: 2.0.0
 * Created: 2025-01-23 (Phase 2: Stabilization)
 */

import { logger } from '../../../services/logger';

// ============================================================================
// STATE AND EVENT DEFINITIONS
// ============================================================================

/**
 * All possible states in the WebRTC voice connection lifecycle
 */
export enum VoiceState {
  // Initial and terminal states
  DISCONNECTED = 'DISCONNECTED',

  // Connection establishment phase
  CONNECTING = 'CONNECTING',                    // WebSocket connection in progress
  AWAITING_SESSION_CREATED = 'AWAITING_SESSION_CREATED',  // Waiting for server's session.created
  AWAITING_SESSION_READY = 'AWAITING_SESSION_READY',      // Waiting for session config confirmation

  // Ready state - can accept recording commands
  IDLE = 'IDLE',                                // Connected, configured, ready for interaction

  // Recording lifecycle states
  RECORDING = 'RECORDING',                      // Actively capturing audio
  COMMITTING_AUDIO = 'COMMITTING_AUDIO',       // Audio stopped, sending final buffer
  AWAITING_TRANSCRIPT = 'AWAITING_TRANSCRIPT', // Committed, waiting for conversation.item.created
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',     // Transcript received, waiting for response.done

  // Error and recovery states
  ERROR = 'ERROR',                              // Recoverable error occurred
  TIMEOUT = 'TIMEOUT',                          // Operation timed out

  // Cleanup state
  DISCONNECTING = 'DISCONNECTING',              // Graceful shutdown in progress
}

/**
 * All events that can trigger state transitions
 */
export enum VoiceEvent {
  // Connection lifecycle events
  CONNECT_REQUESTED = 'CONNECT_REQUESTED',
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED',      // WebSocket opened
  SESSION_CREATED = 'SESSION_CREATED',                    // Server sent session.created
  SESSION_READY = 'SESSION_READY',                        // Session config confirmed (via event or timeout)

  // Recording control events
  RECORDING_STARTED = 'RECORDING_STARTED',                // User pressed button
  RECORDING_STOPPED = 'RECORDING_STOPPED',                // User released button
  AUDIO_COMMITTED = 'AUDIO_COMMITTED',                    // Final audio buffer sent

  // Server response events
  TRANSCRIPT_RECEIVED = 'TRANSCRIPT_RECEIVED',            // conversation.item.created received
  RESPONSE_STARTED = 'RESPONSE_STARTED',                  // response.created received
  RESPONSE_COMPLETE = 'RESPONSE_COMPLETE',                // response.done received

  // Error and recovery events
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  TIMEOUT_OCCURRED = 'TIMEOUT_OCCURRED',
  RETRY_REQUESTED = 'RETRY_REQUESTED',                    // User/system requests retry from error

  // Disconnection events
  DISCONNECT_REQUESTED = 'DISCONNECT_REQUESTED',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',                // WebSocket closed
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
export const STATE_TRANSITIONS: Record<
  VoiceState,
  Partial<Record<VoiceEvent, VoiceState>>
> = {
  [VoiceState.DISCONNECTED]: {
    [VoiceEvent.CONNECT_REQUESTED]: VoiceState.CONNECTING,
  },

  [VoiceState.CONNECTING]: {
    [VoiceEvent.CONNECTION_ESTABLISHED]: VoiceState.AWAITING_SESSION_CREATED,
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    [VoiceEvent.TIMEOUT_OCCURRED]: VoiceState.TIMEOUT,
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.AWAITING_SESSION_CREATED]: {
    [VoiceEvent.SESSION_CREATED]: VoiceState.AWAITING_SESSION_READY,
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    [VoiceEvent.TIMEOUT_OCCURRED]: VoiceState.TIMEOUT,
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.AWAITING_SESSION_READY]: {
    [VoiceEvent.SESSION_READY]: VoiceState.IDLE,
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    [VoiceEvent.TIMEOUT_OCCURRED]: VoiceState.TIMEOUT,
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.IDLE]: {
    [VoiceEvent.RECORDING_STARTED]: VoiceState.RECORDING,
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.RECORDING]: {
    [VoiceEvent.RECORDING_STOPPED]: VoiceState.COMMITTING_AUDIO,
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.COMMITTING_AUDIO]: {
    [VoiceEvent.AUDIO_COMMITTED]: VoiceState.AWAITING_TRANSCRIPT,
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    [VoiceEvent.TIMEOUT_OCCURRED]: VoiceState.TIMEOUT,
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.AWAITING_TRANSCRIPT]: {
    [VoiceEvent.TRANSCRIPT_RECEIVED]: VoiceState.AWAITING_RESPONSE,
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    [VoiceEvent.TIMEOUT_OCCURRED]: VoiceState.IDLE, // Graceful fallback
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.AWAITING_RESPONSE]: {
    [VoiceEvent.RESPONSE_STARTED]: VoiceState.AWAITING_RESPONSE, // Stay in state, log progress
    [VoiceEvent.RESPONSE_COMPLETE]: VoiceState.IDLE,
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    [VoiceEvent.TIMEOUT_OCCURRED]: VoiceState.IDLE, // Graceful fallback
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.ERROR]: {
    [VoiceEvent.RETRY_REQUESTED]: VoiceState.DISCONNECTED,
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.TIMEOUT]: {
    [VoiceEvent.RETRY_REQUESTED]: VoiceState.DISCONNECTED,
    [VoiceEvent.DISCONNECT_REQUESTED]: VoiceState.DISCONNECTING,
  },

  [VoiceState.DISCONNECTING]: {
    [VoiceEvent.CONNECTION_CLOSED]: VoiceState.DISCONNECTED,
  },
};

// ============================================================================
// TIMEOUT CONFIGURATION
// ============================================================================

/**
 * Timeout durations for each state that requires a timeout guard.
 * These are FALLBACK mechanisms - normal flow is event-driven.
 */
export const STATE_TIMEOUTS: Partial<Record<VoiceState, number>> = {
  [VoiceState.CONNECTING]: 15000,                // 15s to establish WebSocket
  [VoiceState.AWAITING_SESSION_CREATED]: 5000,   // 5s to receive session.created
  [VoiceState.AWAITING_SESSION_READY]: 3000,     // 3s to confirm session (fallback)
  [VoiceState.COMMITTING_AUDIO]: 3000,           // 3s to commit audio buffer
  [VoiceState.AWAITING_TRANSCRIPT]: 10000,       // 10s to receive transcript
  [VoiceState.AWAITING_RESPONSE]: 30000,         // 30s to receive full response
  [VoiceState.DISCONNECTING]: 5000,              // 5s to close connection
};

// ============================================================================
// TRANSITION HISTORY
// ============================================================================

/**
 * Record of a state transition for debugging and auditing
 */
export interface TransitionRecord {
  from_state: VoiceState;
  event: VoiceEvent;
  to_state: VoiceState;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// STATE MACHINE IMPLEMENTATION
// ============================================================================

/**
 * Finite State Machine for WebRTC Voice Connection
 *
 * Usage:
 *   const fsm = new VoiceStateMachine();
 *   fsm.transition(VoiceEvent.CONNECT_REQUESTED);
 *   if (fsm.canStartRecording()) {
 *     fsm.transition(VoiceEvent.RECORDING_STARTED);
 *   }
 */
export class VoiceStateMachine {
  private currentState: VoiceState = VoiceState.DISCONNECTED;
  private transitionHistory: TransitionRecord[] = [];
  private timeoutHandle: NodeJS.Timeout | null = null;
  private maxHistorySize: number;

  /**
   * Callbacks for state changes and timeouts
   */
  private onStateChange?: (
    fromState: VoiceState,
    toState: VoiceState,
    event: VoiceEvent
  ) => void;

  private onTimeout?: (state: VoiceState) => void;

  constructor(
    options?: {
      onStateChange?: VoiceStateMachine['onStateChange'];
      onTimeout?: VoiceStateMachine['onTimeout'];
      maxHistorySize?: number;
    }
  ) {
    this.onStateChange = options?.onStateChange;
    this.onTimeout = options?.onTimeout;
    this.maxHistorySize = options?.maxHistorySize || 100;
  }

  // ==========================================================================
  // CORE STATE MACHINE METHODS
  // ==========================================================================

  /**
   * Get current state
   */
  public getState(): VoiceState {
    return this.currentState;
  }

  /**
   * Check if currently in a specific state
   */
  public isState(state: VoiceState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if a transition is valid from current state
   */
  public canTransition(event: VoiceEvent): boolean {
    const transitions = STATE_TRANSITIONS[this.currentState];
    return transitions?.[event] !== undefined;
  }

  /**
   * Attempt a state transition based on an event
   *
   * @throws Error if transition is invalid
   */
  public transition(event: VoiceEvent, metadata?: Record<string, any>): void {
    const fromState = this.currentState;
    const transitions = STATE_TRANSITIONS[fromState];
    const toState = transitions?.[event];

    if (toState === undefined) {
      const validEvents = Object.keys(transitions || {}).join(', ') || 'none';
      throw new Error(
        `Invalid transition: ${event} from state ${fromState}. ` +
        `Valid events: ${validEvents}`
      );
    }

    // Clear any existing timeout
    this.clearTimeout();

    // Record transition
    this.addTransitionToHistory({
      from_state: fromState,
      event,
      to_state: toState,
      timestamp: Date.now(),
      metadata,
    });

    // Update state
    this.currentState = toState;

    // Log transition
    logger.info(`[VoiceStateMachine] ${fromState} --[${event}]--> ${toState}`, metadata);

    // Notify listener
    this.onStateChange?.(fromState, toState, event);

    // Set timeout for new state if applicable
    this.startTimeoutForState(toState);
  }

  /**
   * Force transition to a specific state (for error recovery)
   * Use sparingly - prefer event-driven transitions
   */
  public forceState(state: VoiceState, reason?: string): void {
    const fromState = this.currentState;

    this.clearTimeout();

    this.addTransitionToHistory({
      from_state: fromState,
      event: VoiceEvent.ERROR_OCCURRED, // Generic event for forced transitions
      to_state: state,
      timestamp: Date.now(),
      metadata: { forced: true, reason },
    });

    this.currentState = state;
    logger.warn(`[VoiceStateMachine] FORCED: ${fromState} --> ${state}`, { reason });
    this.onStateChange?.(fromState, state, VoiceEvent.ERROR_OCCURRED);
    this.startTimeoutForState(state);
  }

  /**
   * Reset state machine to initial state
   */
  public reset(): void {
    this.clearTimeout();
    this.currentState = VoiceState.DISCONNECTED;
    logger.info('[VoiceStateMachine] Reset to DISCONNECTED');
  }

  // ==========================================================================
  // GUARD CONDITIONS
  // ==========================================================================

  /**
   * Check if recording can be started
   */
  public canStartRecording(): boolean {
    return this.currentState === VoiceState.IDLE;
  }

  /**
   * Check if recording can be stopped
   */
  public canStopRecording(): boolean {
    return this.currentState === VoiceState.RECORDING;
  }

  /**
   * Check if connection is established and ready
   */
  public isReady(): boolean {
    return this.currentState === VoiceState.IDLE;
  }

  /**
   * Check if currently in a recording-related state
   */
  public isRecordingActive(): boolean {
    return [
      VoiceState.RECORDING,
      VoiceState.COMMITTING_AUDIO,
      VoiceState.AWAITING_TRANSCRIPT,
      VoiceState.AWAITING_RESPONSE,
    ].includes(this.currentState);
  }

  /**
   * Check if connection is being established
   */
  public isConnecting(): boolean {
    return [
      VoiceState.CONNECTING,
      VoiceState.AWAITING_SESSION_CREATED,
      VoiceState.AWAITING_SESSION_READY,
    ].includes(this.currentState);
  }

  /**
   * Check if in error or timeout state
   */
  public hasError(): boolean {
    return [
      VoiceState.ERROR,
      VoiceState.TIMEOUT,
    ].includes(this.currentState);
  }

  /**
   * Check if connection is active (not disconnected/disconnecting)
   */
  public isConnected(): boolean {
    return ![
      VoiceState.DISCONNECTED,
      VoiceState.DISCONNECTING,
    ].includes(this.currentState);
  }

  // ==========================================================================
  // TIMEOUT MANAGEMENT
  // ==========================================================================

  /**
   * Start timeout for states that require timeout guards
   */
  private startTimeoutForState(state: VoiceState): void {
    const timeoutMs = STATE_TIMEOUTS[state];

    if (timeoutMs !== undefined) {
      this.timeoutHandle = setTimeout(() => {
        // Only fire timeout if still in the same state
        if (this.currentState === state) {
          logger.warn(`[VoiceStateMachine] Timeout in state ${state} after ${timeoutMs}ms`);
          this.onTimeout?.(state);

          // Auto-transition to TIMEOUT state
          if (this.canTransition(VoiceEvent.TIMEOUT_OCCURRED)) {
            this.transition(VoiceEvent.TIMEOUT_OCCURRED, {
              timed_out_state: state,
              timeout_duration_ms: timeoutMs,
            });
          }
        }
      }, timeoutMs);
    }
  }

  /**
   * Clear any active timeout
   */
  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  // ==========================================================================
  // DEBUGGING AND HISTORY
  // ==========================================================================

  /**
   * Add transition to history with size limit
   */
  private addTransitionToHistory(record: TransitionRecord): void {
    this.transitionHistory.push(record);

    // Keep only last N transitions
    if (this.transitionHistory.length > this.maxHistorySize) {
      this.transitionHistory.shift();
    }
  }

  /**
   * Get transition history
   */
  public getHistory(): readonly TransitionRecord[] {
    return this.transitionHistory;
  }

  /**
   * Get last N transitions
   */
  public getRecentHistory(count: number = 10): readonly TransitionRecord[] {
    return this.transitionHistory.slice(-count);
  }

  /**
   * Clear transition history
   */
  public clearHistory(): void {
    this.transitionHistory = [];
  }

  /**
   * Get formatted history for logging
   */
  public formatHistory(): string {
    return this.transitionHistory
      .map((record) => {
        const timestamp = new Date(record.timestamp).toISOString();
        const meta = record.metadata ? ` [${JSON.stringify(record.metadata)}]` : '';
        return `${timestamp}: ${record.from_state} --[${record.event}]--> ${record.to_state}${meta}`;
      })
      .join('\n');
  }

  /**
   * Validate state machine integrity
   * Useful for testing and development
   */
  public static validateTransitionTable(): string[] {
    const errors: string[] = [];

    // Check that all states have entries in transition table
    for (const state of Object.values(VoiceState)) {
      if (!(state in STATE_TRANSITIONS)) {
        errors.push(`Missing transition table entry for state: ${state}`);
      }
    }

    // Check that all transitions point to valid states
    for (const [fromState, transitions] of Object.entries(STATE_TRANSITIONS)) {
      for (const [event, toState] of Object.entries(transitions)) {
        if (!Object.values(VoiceState).includes(toState as VoiceState)) {
          errors.push(
            `Invalid target state in ${fromState} -> ${event} -> ${toState}`
          );
        }
      }
    }

    return errors;
  }
}
