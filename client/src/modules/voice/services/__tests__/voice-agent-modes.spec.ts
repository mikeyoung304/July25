import { describe, it, expect } from 'vitest';
import {
  VoiceAgentMode,
  detectVoiceAgentMode,
  getAgentModeConfig,
  isEmployeeMode,
  isCustomerMode
} from '../VoiceAgentModeDetector';
import {
  PROVIDER_LIMITS,
  normalizeSessionConfig
} from '../SessionConfigNormalizer';

describe('Voice Agent Modes - CI Safety Guards', () => {
  describe('Temperature defaults validation', () => {
    it('should ensure employee default temperature >= provider minimum', () => {
      const employeeDefault = PROVIDER_LIMITS.temperature.employeeDefault;
      const providerMin = PROVIDER_LIMITS.temperature.min;

      expect(employeeDefault).toBeGreaterThanOrEqual(providerMin);
      expect(employeeDefault).toBe(0.7); // Verify expected value
      expect(providerMin).toBe(0.6); // Verify expected minimum
    });

    it('should ensure customer default temperature >= provider minimum', () => {
      const customerDefault = PROVIDER_LIMITS.temperature.customerDefault;
      const providerMin = PROVIDER_LIMITS.temperature.min;

      expect(customerDefault).toBeGreaterThanOrEqual(providerMin);
      expect(customerDefault).toBe(0.85); // Verify expected value
      expect(providerMin).toBe(0.6); // Verify expected minimum
    });

    it('should ensure normalizeSessionConfig returns valid defaults for employee mode', () => {
      const result = normalizeSessionConfig({}, 'employee');

      expect(result.temperature).toBeGreaterThanOrEqual(PROVIDER_LIMITS.temperature.min);
      expect(result.temperature).toBeLessThanOrEqual(PROVIDER_LIMITS.temperature.max);
      expect(result.temperature).toBe(PROVIDER_LIMITS.temperature.employeeDefault);
    });

    it('should ensure normalizeSessionConfig returns valid defaults for customer mode', () => {
      const result = normalizeSessionConfig({}, 'customer');

      expect(result.temperature).toBeGreaterThanOrEqual(PROVIDER_LIMITS.temperature.min);
      expect(result.temperature).toBeLessThanOrEqual(PROVIDER_LIMITS.temperature.max);
      expect(result.temperature).toBe(PROVIDER_LIMITS.temperature.customerDefault);
    });
  });

  describe('Agent mode detection', () => {
    it('should detect employee mode for valid employee roles', () => {
      const employeeRoles = ['manager', 'admin', 'owner', 'server', 'cashier', 'kitchen', 'expo'];

      employeeRoles.forEach(role => {
        const authInfo = {
          isAuthenticated: true,
          user: { role, email: 'test@test.com' }
        };

        expect(detectVoiceAgentMode(authInfo)).toBe(VoiceAgentMode.EMPLOYEE);
        expect(isEmployeeMode(authInfo)).toBe(true);
        expect(isCustomerMode(authInfo)).toBe(false);
      });
    });

    it('should detect customer mode for unauthenticated users', () => {
      const authInfo = {
        isAuthenticated: false,
        user: null
      };

      expect(detectVoiceAgentMode(authInfo)).toBe(VoiceAgentMode.CUSTOMER);
      expect(isEmployeeMode(authInfo)).toBe(false);
      expect(isCustomerMode(authInfo)).toBe(true);
    });

    it('should detect customer mode for unknown roles', () => {
      const authInfo = {
        isAuthenticated: true,
        user: { role: 'unknown_role', email: 'test@test.com' }
      };

      expect(detectVoiceAgentMode(authInfo)).toBe(VoiceAgentMode.CUSTOMER);
      expect(isEmployeeMode(authInfo)).toBe(false);
      expect(isCustomerMode(authInfo)).toBe(true);
    });
  });

  describe('Agent mode configuration', () => {
    it('should provide valid employee mode configuration', () => {
      const config = getAgentModeConfig(VoiceAgentMode.EMPLOYEE);

      expect(config.mode).toBe(VoiceAgentMode.EMPLOYEE);
      expect(config.enableVoiceOutput).toBe(false);
      expect(config.enableVoiceInput).toBe(true);
      expect(config.requirePayment).toBe(false);
      expect(config.requireCustomerInfo).toBe(false);
      expect(config.directToKitchen).toBe(true);
      expect(config.confirmationStyle).toBe('visual');
      expect(config.instructions).toBeTruthy();
    });

    it('should provide valid customer mode configuration', () => {
      const config = getAgentModeConfig(VoiceAgentMode.CUSTOMER);

      expect(config.mode).toBe(VoiceAgentMode.CUSTOMER);
      expect(config.enableVoiceOutput).toBe(true);
      expect(config.enableVoiceInput).toBe(true);
      expect(config.requirePayment).toBe(true);
      expect(config.requireCustomerInfo).toBe(true);
      expect(config.directToKitchen).toBe(false);
      expect(config.confirmationStyle).toBe('both');
      expect(config.greeting).toBeTruthy();
      expect(config.instructions).toBeTruthy();
    });

    it('should fallback to customer mode for invalid modes', () => {
      // Test with an invalid mode (cast to bypass TypeScript checking)
      const config = getAgentModeConfig('invalid_mode' as VoiceAgentMode);

      expect(config.mode).toBe(VoiceAgentMode.CUSTOMER);
      expect(config.enableVoiceOutput).toBe(true);
      expect(config.requirePayment).toBe(true);
    });
  });

  describe('Integration validation', () => {
    it('should ensure all temperature processing maintains provider compliance', () => {
      // Test edge cases that could break OpenAI Realtime API
      const edgeCases = [
        { input: undefined, mode: 'employee' as const },
        { input: undefined, mode: 'customer' as const },
        { input: 0, mode: 'employee' as const },
        { input: 0, mode: 'customer' as const },
        { input: Number.NaN, mode: 'employee' as const },
        { input: Number.NaN, mode: 'customer' as const },
        { input: -1, mode: 'employee' as const },
        { input: -1, mode: 'customer' as const },
        { input: 100, mode: 'employee' as const },
        { input: 100, mode: 'customer' as const }
      ];

      edgeCases.forEach(({ input, mode }) => {
        const result = normalizeSessionConfig(
          input !== undefined ? { temperature: input } : {},
          mode
        );

        expect(result.temperature).toBeGreaterThanOrEqual(PROVIDER_LIMITS.temperature.min);
        expect(result.temperature).toBeLessThanOrEqual(PROVIDER_LIMITS.temperature.max);
        expect(Number.isFinite(result.temperature)).toBe(true);
      });
    });

    it('should ensure provider limits are properly defined', () => {
      // Verify PROVIDER_LIMITS structure to prevent drift
      expect(PROVIDER_LIMITS.temperature.min).toBe(0.6);
      expect(PROVIDER_LIMITS.temperature.max).toBe(2.0);
      expect(PROVIDER_LIMITS.temperature.employeeDefault).toBeGreaterThanOrEqual(0.6);
      expect(PROVIDER_LIMITS.temperature.customerDefault).toBeGreaterThanOrEqual(0.6);
      expect(PROVIDER_LIMITS.temperature.employeeDefault).toBeLessThanOrEqual(2.0);
      expect(PROVIDER_LIMITS.temperature.customerDefault).toBeLessThanOrEqual(2.0);
    });
  });
});