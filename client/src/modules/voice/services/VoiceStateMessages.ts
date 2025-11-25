/**
 * User-Visible Messages for Voice State Machine
 *
 * PHASE 1.2: Message Mapping - Maps all 12 FSM states to user-friendly messages
 *
 * Problem Solved:
 * - Users only see ~4 states visually; 8 states are invisible making the app feel frozen
 * - This module provides clear, actionable messages for every state
 * - Includes progress indicators for multi-step connection flow
 *
 * Design:
 * - Each state maps to a message, icon, and optional progress indicator
 * - Progressive disclosure: connection states show step X of 3
 * - Action-oriented: "Tap to speak" vs "Ready"
 *
 * Version: 1.0.0
 * Created: 2025-01-25 (Phase 1.2: Visibility)
 */

import { VoiceState } from './VoiceStateMachine';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User-visible state information
 */
export interface StateMessage {
  message: string;
  icon: 'loader' | 'wifi' | 'settings' | 'mic' | 'mic-recording' | 'upload' | 'text' | 'brain' | 'alert' | 'clock' | 'x';
  showProgress?: boolean;
  step?: { current: number; total: number };
}

// ============================================================================
// STATE MESSAGE MAPPING
// ============================================================================

/**
 * Complete mapping of FSM states to user-visible messages
 *
 * Key Design Decisions:
 * - Connection states (CONNECTING → AWAITING_SESSION_CREATED → AWAITING_SESSION_READY)
 *   show as "Step X of 3" to indicate progress
 * - IDLE uses action-oriented language: "Ready - Tap to speak"
 * - Processing states explain what's happening: "Converting speech...", "Processing order..."
 * - Error states are clear and actionable
 */
export const STATE_USER_MESSAGES: Record<VoiceState, StateMessage> = {
  // Initial state
  [VoiceState.DISCONNECTED]: {
    message: 'Starting voice service...',
    icon: 'loader',
  },

  // Connection establishment phase (Steps 1-3)
  [VoiceState.CONNECTING]: {
    message: 'Connecting...',
    icon: 'wifi',
    showProgress: true,
    step: { current: 1, total: 3 },
  },
  [VoiceState.AWAITING_SESSION_CREATED]: {
    message: 'Initializing...',
    icon: 'settings',
    showProgress: true,
    step: { current: 2, total: 3 },
  },
  [VoiceState.AWAITING_SESSION_READY]: {
    message: 'Configuring audio...',
    icon: 'mic',
    showProgress: true,
    step: { current: 3, total: 3 },
  },

  // Ready state
  [VoiceState.IDLE]: {
    message: 'Ready - Tap to speak',
    icon: 'mic',
  },

  // Recording lifecycle states
  [VoiceState.RECORDING]: {
    message: 'Listening...',
    icon: 'mic-recording',
  },
  [VoiceState.COMMITTING_AUDIO]: {
    message: 'Sending audio...',
    icon: 'upload',
  },
  [VoiceState.AWAITING_TRANSCRIPT]: {
    message: 'Converting speech...',
    icon: 'text',
  },
  [VoiceState.AWAITING_RESPONSE]: {
    message: 'Processing order...',
    icon: 'brain',
  },

  // Error and recovery states
  [VoiceState.ERROR]: {
    message: 'Connection error',
    icon: 'alert',
  },
  [VoiceState.TIMEOUT]: {
    message: 'Request timed out',
    icon: 'clock',
  },

  // Cleanup state
  [VoiceState.DISCONNECTING]: {
    message: 'Closing...',
    icon: 'x',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user-visible message for a given state
 *
 * Returns a default error message if state is not mapped (should never happen)
 */
export function getStateMessage(state: VoiceState): StateMessage {
  return STATE_USER_MESSAGES[state] || {
    message: 'Unknown state',
    icon: 'alert',
  };
}

/**
 * Check if state should show progress indicator
 */
export function shouldShowProgress(state: VoiceState): boolean {
  const message = STATE_USER_MESSAGES[state];
  return message?.showProgress === true;
}

/**
 * Get progress step info for a state
 */
export function getProgressStep(state: VoiceState): { current: number; total: number } | null {
  const message = STATE_USER_MESSAGES[state];
  return message?.step || null;
}
