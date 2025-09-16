/**
 * Voice Agent Mode Detector
 * Determines agent behavior based on authentication context
 * Created: September 15, 2025
 */

import { logger } from '@/utils/logger';

/**
 * Voice agent operating modes
 */
export enum VoiceAgentMode {
  EMPLOYEE = 'employee',  // Logged-in staff members
  CUSTOMER = 'customer'   // No auth or kiosk auth
}

/**
 * Employee roles that should use employee mode
 */
const EMPLOYEE_ROLES = [
  'manager',
  'admin',
  'owner',
  'server',
  'cashier',
  'kitchen',
  'expo'
];

/**
 * Auth context interface (subset of AuthContextType)
 */
interface AuthInfo {
  isAuthenticated: boolean;
  user?: {
    role?: string;
    email?: string;
  } | null;
}

/**
 * Detect voice agent mode based on authentication context
 */
export function detectVoiceAgentMode(authInfo: AuthInfo): VoiceAgentMode {
  // Check if user is authenticated with an employee role
  if (authInfo.isAuthenticated && authInfo.user?.role) {
    if (EMPLOYEE_ROLES.includes(authInfo.user.role)) {
      logger.info('[VoiceAgentMode] Employee mode detected', {
        role: authInfo.user.role,
        email: authInfo.user.email
      });
      return VoiceAgentMode.EMPLOYEE;
    }
  }

  // Default to customer mode for:
  // - Unauthenticated users
  // - Kiosk authentication
  // - Unknown roles
  logger.info('[VoiceAgentMode] Customer mode detected', {
    isAuthenticated: authInfo.isAuthenticated,
    role: authInfo.user?.role || 'none'
  });

  return VoiceAgentMode.CUSTOMER;
}

/**
 * Configuration for agent modes
 */
export interface AgentModeConfig {
  mode: VoiceAgentMode;
  enableVoiceOutput: boolean;
  enableVoiceInput: boolean;
  requirePayment: boolean;
  requireCustomerInfo: boolean;
  directToKitchen: boolean;
  confirmationStyle: 'voice' | 'visual' | 'both';
  greeting?: string;
  instructions?: string;
}

/**
 * Get configuration for a specific agent mode
 */
export function getAgentModeConfig(mode: VoiceAgentMode): AgentModeConfig {
  switch (mode) {
    case VoiceAgentMode.EMPLOYEE:
      return {
        mode: VoiceAgentMode.EMPLOYEE,
        enableVoiceOutput: false,      // No voice responses
        enableVoiceInput: true,         // Can still use voice input
        requirePayment: false,          // Payment at table close
        requireCustomerInfo: false,     // Already know who's ordering
        directToKitchen: true,          // Send immediately to kitchen
        confirmationStyle: 'visual',    // Display only
        instructions: 'Display order for confirmation. No voice responses.'
      };

    case VoiceAgentMode.CUSTOMER:
      return {
        mode: VoiceAgentMode.CUSTOMER,
        enableVoiceOutput: true,        // Full voice interaction
        enableVoiceInput: true,          // Voice input enabled
        requirePayment: true,           // Must pay before kitchen
        requireCustomerInfo: true,      // Need email/phone
        directToKitchen: false,         // Hold until payment
        confirmationStyle: 'both',      // Voice and visual
        greeting: 'Welcome! How can I help you today?',
        instructions: 'Guide customer through ordering with voice responses.'
      };

    default:
      // Fallback to customer mode for safety
      logger.warn('[VoiceAgentMode] Unknown mode, defaulting to customer', { mode });
      return getAgentModeConfig(VoiceAgentMode.CUSTOMER);
  }
}

/**
 * Check if current mode is employee mode
 */
export function isEmployeeMode(authInfo: AuthInfo): boolean {
  return detectVoiceAgentMode(authInfo) === VoiceAgentMode.EMPLOYEE;
}

/**
 * Check if current mode is customer mode
 */
export function isCustomerMode(authInfo: AuthInfo): boolean {
  return detectVoiceAgentMode(authInfo) === VoiceAgentMode.CUSTOMER;
}