/**
 * VoiceStateMachine Tests
 *
 * PHASE 2 VERIFICATION: Ensures state machine enforces valid transitions
 * and prevents race conditions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VoiceStateMachine,
  VoiceState,
  VoiceEvent,
  STATE_TRANSITIONS,
  STATE_TIMEOUTS
} from '../VoiceStateMachine';

describe('VoiceStateMachine', () => {
  let stateMachine: VoiceStateMachine;
  let onStateChangeSpy: ReturnType<typeof vi.fn>;
  let onTimeoutSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onStateChangeSpy = vi.fn();
    onTimeoutSpy = vi.fn();

    stateMachine = new VoiceStateMachine({
      onStateChange: onStateChangeSpy,
      onTimeout: onTimeoutSpy,
      maxHistorySize: 10
    });
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should start in DISCONNECTED state', () => {
      expect(stateMachine.getState()).toBe(VoiceState.DISCONNECTED);
    });

    it('should have empty transition history initially', () => {
      expect(stateMachine.getHistory().length).toBe(0);
    });
  });

  // ============================================================================
  // VALID TRANSITION TESTS - CONNECTION LIFECYCLE
  // ============================================================================

  describe('Connection Lifecycle - Valid Transitions', () => {
    it('should transition: DISCONNECTED → CONNECTING', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      expect(stateMachine.getState()).toBe(VoiceState.CONNECTING);
      expect(onStateChangeSpy).toHaveBeenCalledWith(
        VoiceState.DISCONNECTED,
        VoiceState.CONNECTING,
        VoiceEvent.CONNECT_REQUESTED
      );
    });

    it('should transition: CONNECTING → AWAITING_SESSION_CREATED', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      expect(stateMachine.getState()).toBe(VoiceState.AWAITING_SESSION_CREATED);
    });

    it('should transition: AWAITING_SESSION_CREATED → AWAITING_SESSION_READY', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      expect(stateMachine.getState()).toBe(VoiceState.AWAITING_SESSION_READY);
    });

    it('should transition: AWAITING_SESSION_READY → IDLE (via SESSION_READY)', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);
      expect(stateMachine.getState()).toBe(VoiceState.IDLE);
    });

    it('should complete full connection flow to IDLE', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);

      expect(stateMachine.getState()).toBe(VoiceState.IDLE);
      expect(stateMachine.isReady()).toBe(true);
      expect(stateMachine.isConnected()).toBe(true);
    });
  });

  // ============================================================================
  // VALID TRANSITION TESTS - RECORDING LIFECYCLE
  // ============================================================================

  describe('Recording Lifecycle - Valid Transitions', () => {
    beforeEach(() => {
      // Set up connected state
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);
    });

    it('should transition: IDLE → RECORDING', () => {
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      expect(stateMachine.getState()).toBe(VoiceState.RECORDING);
    });

    it('should transition: RECORDING → COMMITTING_AUDIO', () => {
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      expect(stateMachine.getState()).toBe(VoiceState.COMMITTING_AUDIO);
    });

    it('should transition: COMMITTING_AUDIO → AWAITING_TRANSCRIPT', () => {
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);
      expect(stateMachine.getState()).toBe(VoiceState.AWAITING_TRANSCRIPT);
    });

    it('should transition: AWAITING_TRANSCRIPT → AWAITING_RESPONSE', () => {
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);
      stateMachine.transition(VoiceEvent.TRANSCRIPT_RECEIVED);
      expect(stateMachine.getState()).toBe(VoiceState.AWAITING_RESPONSE);
    });

    it('should transition: AWAITING_RESPONSE → IDLE (via RESPONSE_COMPLETE)', () => {
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);
      stateMachine.transition(VoiceEvent.TRANSCRIPT_RECEIVED);
      stateMachine.transition(VoiceEvent.RESPONSE_COMPLETE);
      expect(stateMachine.getState()).toBe(VoiceState.IDLE);
    });

    it('should complete full recording flow back to IDLE', () => {
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);
      stateMachine.transition(VoiceEvent.TRANSCRIPT_RECEIVED);
      stateMachine.transition(VoiceEvent.RESPONSE_COMPLETE);

      expect(stateMachine.getState()).toBe(VoiceState.IDLE);
      expect(stateMachine.canStartRecording()).toBe(true);
    });
  });

  // ============================================================================
  // INVALID TRANSITION TESTS - RACE CONDITION PREVENTION
  // ============================================================================

  describe('Invalid Transitions - Race Condition Prevention', () => {
    it('should reject RECORDING_STARTED when not in IDLE', () => {
      // Still in DISCONNECTED state
      expect(() => {
        stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      }).toThrow('Invalid transition');
    });

    it('should reject RECORDING_STOPPED when not in RECORDING', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);

      // In IDLE, cannot stop recording
      expect(() => {
        stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      }).toThrow('Invalid transition');
    });

    it('should reject duplicate CONNECT_REQUESTED when already connecting', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);

      // Already in CONNECTING state
      expect(() => {
        stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      }).toThrow('Invalid transition');
    });

    it('should reject SESSION_CREATED before CONNECTION_ESTABLISHED', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);

      // Still in CONNECTING, haven't received CONNECTION_ESTABLISHED
      expect(() => {
        stateMachine.transition(VoiceEvent.SESSION_CREATED);
      }).toThrow('Invalid transition');
    });

    it('should reject AUDIO_COMMITTED before RECORDING_STOPPED', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);

      // In RECORDING, cannot commit audio yet
      expect(() => {
        stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);
      }).toThrow('Invalid transition');
    });
  });

  // ============================================================================
  // GUARD CONDITION TESTS
  // ============================================================================

  describe('Guard Conditions', () => {
    it('canStartRecording() should return false when DISCONNECTED', () => {
      expect(stateMachine.canStartRecording()).toBe(false);
    });

    it('canStartRecording() should return false when CONNECTING', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      expect(stateMachine.canStartRecording()).toBe(false);
    });

    it('canStartRecording() should return true only when IDLE', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);

      expect(stateMachine.canStartRecording()).toBe(true);
    });

    it('canStopRecording() should return false when not RECORDING', () => {
      expect(stateMachine.canStopRecording()).toBe(false);
    });

    it('canStopRecording() should return true only when RECORDING', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);

      expect(stateMachine.canStopRecording()).toBe(true);
    });

    it('isReady() should return false until IDLE', () => {
      expect(stateMachine.isReady()).toBe(false);

      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      expect(stateMachine.isReady()).toBe(false);

      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      expect(stateMachine.isReady()).toBe(false);

      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      expect(stateMachine.isReady()).toBe(false);

      stateMachine.transition(VoiceEvent.SESSION_READY);
      expect(stateMachine.isReady()).toBe(true);
    });

    it('isConnecting() should return true during connection phase', () => {
      expect(stateMachine.isConnecting()).toBe(false);

      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      expect(stateMachine.isConnecting()).toBe(true);

      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      expect(stateMachine.isConnecting()).toBe(true);

      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      expect(stateMachine.isConnecting()).toBe(true);

      stateMachine.transition(VoiceEvent.SESSION_READY);
      expect(stateMachine.isConnecting()).toBe(false);
    });

    it('isRecordingActive() should return true during recording lifecycle', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);

      expect(stateMachine.isRecordingActive()).toBe(false);

      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      expect(stateMachine.isRecordingActive()).toBe(true);

      stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      expect(stateMachine.isRecordingActive()).toBe(true);

      stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);
      expect(stateMachine.isRecordingActive()).toBe(true);

      stateMachine.transition(VoiceEvent.TRANSCRIPT_RECEIVED);
      expect(stateMachine.isRecordingActive()).toBe(true);

      stateMachine.transition(VoiceEvent.RESPONSE_COMPLETE);
      expect(stateMachine.isRecordingActive()).toBe(false);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should transition to ERROR from any state on ERROR_OCCURRED', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.ERROR_OCCURRED);
      expect(stateMachine.getState()).toBe(VoiceState.ERROR);
      expect(stateMachine.hasError()).toBe(true);
    });

    it('should allow RETRY_REQUESTED from ERROR state', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.ERROR_OCCURRED);
      stateMachine.transition(VoiceEvent.RETRY_REQUESTED);
      expect(stateMachine.getState()).toBe(VoiceState.DISCONNECTED);
    });

    it('should transition to TIMEOUT on TIMEOUT_OCCURRED', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.TIMEOUT_OCCURRED);
      expect(stateMachine.getState()).toBe(VoiceState.TIMEOUT);
    });

    it('should allow recovery from TIMEOUT via RETRY_REQUESTED', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.TIMEOUT_OCCURRED);
      stateMachine.transition(VoiceEvent.RETRY_REQUESTED);
      expect(stateMachine.getState()).toBe(VoiceState.DISCONNECTED);
    });
  });

  // ============================================================================
  // GRACEFUL FALLBACK TESTS
  // ============================================================================

  describe('Graceful Timeout Fallbacks', () => {
    beforeEach(() => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.transition(VoiceEvent.SESSION_CREATED);
      stateMachine.transition(VoiceEvent.SESSION_READY);
    });

    it('should fallback to IDLE on timeout in AWAITING_TRANSCRIPT', () => {
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);

      // Now in AWAITING_TRANSCRIPT
      stateMachine.transition(VoiceEvent.TIMEOUT_OCCURRED);
      expect(stateMachine.getState()).toBe(VoiceState.IDLE);
    });

    it('should fallback to IDLE on timeout in AWAITING_RESPONSE', () => {
      stateMachine.transition(VoiceEvent.RECORDING_STARTED);
      stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
      stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);
      stateMachine.transition(VoiceEvent.TRANSCRIPT_RECEIVED);

      // Now in AWAITING_RESPONSE
      stateMachine.transition(VoiceEvent.TIMEOUT_OCCURRED);
      expect(stateMachine.getState()).toBe(VoiceState.IDLE);
    });
  });

  // ============================================================================
  // TRANSITION HISTORY TESTS
  // ============================================================================

  describe('Transition History', () => {
    it('should record transitions in history', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);

      const history = stateMachine.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].from_state).toBe(VoiceState.DISCONNECTED);
      expect(history[0].event).toBe(VoiceEvent.CONNECT_REQUESTED);
      expect(history[0].to_state).toBe(VoiceState.CONNECTING);
    });

    it('should include metadata in transition records', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED, { source: 'test' });

      const history = stateMachine.getHistory();
      expect(history[0].metadata).toEqual({ source: 'test' });
    });

    it('should respect maxHistorySize', () => {
      const smallMachine = new VoiceStateMachine({ maxHistorySize: 3 });

      // Create 5 transitions
      smallMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      smallMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      smallMachine.transition(VoiceEvent.SESSION_CREATED);
      smallMachine.transition(VoiceEvent.SESSION_READY);
      smallMachine.transition(VoiceEvent.RECORDING_STARTED);

      expect(smallMachine.getHistory().length).toBe(3);
    });

    it('should format history for logging', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);

      const formatted = stateMachine.formatHistory();
      expect(formatted).toContain('DISCONNECTED');
      expect(formatted).toContain('CONNECT_REQUESTED');
      expect(formatted).toContain('CONNECTING');
    });

    it('should clear history when requested', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      expect(stateMachine.getHistory().length).toBe(1);

      stateMachine.clearHistory();
      expect(stateMachine.getHistory().length).toBe(0);
    });
  });

  // ============================================================================
  // RESET TESTS
  // ============================================================================

  describe('Reset', () => {
    it('should reset to DISCONNECTED state', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);

      stateMachine.reset();
      expect(stateMachine.getState()).toBe(VoiceState.DISCONNECTED);
    });

    it('should allow reconnection after reset', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);
      stateMachine.reset();

      // Should be able to connect again
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      expect(stateMachine.getState()).toBe(VoiceState.CONNECTING);
    });
  });

  // ============================================================================
  // FORCE STATE TESTS
  // ============================================================================

  describe('Force State (Emergency Recovery)', () => {
    it('should allow forcing state for error recovery', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);

      stateMachine.forceState(VoiceState.ERROR, 'Test emergency recovery');
      expect(stateMachine.getState()).toBe(VoiceState.ERROR);
    });

    it('should record forced transitions in history', () => {
      stateMachine.forceState(VoiceState.ERROR, 'Manual override');

      const history = stateMachine.getHistory();
      expect(history[0].metadata?.forced).toBe(true);
      expect(history[0].metadata?.reason).toBe('Manual override');
    });
  });

  // ============================================================================
  // TRANSITION TABLE VALIDATION TESTS
  // ============================================================================

  describe('Transition Table Validation', () => {
    it('should have valid transition table', () => {
      const errors = VoiceStateMachine.validateTransitionTable();
      expect(errors).toEqual([]);
    });

    it('should have entries for all states', () => {
      const allStates = Object.values(VoiceState);
      const tableStates = Object.keys(STATE_TRANSITIONS);

      expect(tableStates.length).toBe(allStates.length);
    });

    it('should only transition to valid states', () => {
      const allStates = Object.values(VoiceState);

      for (const [_fromState, transitions] of Object.entries(STATE_TRANSITIONS)) {
        for (const [_event, toState] of Object.entries(transitions)) {
          expect(allStates).toContain(toState as VoiceState);
        }
      }
    });
  });

  // ============================================================================
  // TIMEOUT CONFIGURATION TESTS
  // ============================================================================

  describe('Timeout Configuration', () => {
    it('should have timeouts for critical states', () => {
      expect(STATE_TIMEOUTS[VoiceState.CONNECTING]).toBeDefined();
      expect(STATE_TIMEOUTS[VoiceState.AWAITING_SESSION_CREATED]).toBeDefined();
      expect(STATE_TIMEOUTS[VoiceState.AWAITING_TRANSCRIPT]).toBeDefined();
      expect(STATE_TIMEOUTS[VoiceState.AWAITING_RESPONSE]).toBeDefined();
    });

    it('should have reasonable timeout durations', () => {
      // All timeouts should be between 3s and 30s
      for (const [_state, duration] of Object.entries(STATE_TIMEOUTS)) {
        if (duration !== undefined) {
          expect(duration).toBeGreaterThanOrEqual(3000);
          expect(duration).toBeLessThanOrEqual(30000);
        }
      }
    });
  });

  // ============================================================================
  // CALLBACK TESTS
  // ============================================================================

  describe('Callbacks', () => {
    it('should invoke onStateChange callback on transitions', () => {
      stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);

      expect(onStateChangeSpy).toHaveBeenCalledTimes(1);
      expect(onStateChangeSpy).toHaveBeenCalledWith(
        VoiceState.DISCONNECTED,
        VoiceState.CONNECTING,
        VoiceEvent.CONNECT_REQUESTED
      );
    });

    it('should work without callbacks', () => {
      const noCallbackMachine = new VoiceStateMachine();

      expect(() => {
        noCallbackMachine.transition(VoiceEvent.CONNECT_REQUESTED);
      }).not.toThrow();
    });
  });
});
