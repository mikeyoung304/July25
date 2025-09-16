import { describe, it, expect } from 'vitest';
import {
  normalizeSessionConfig,
  clamp,
  PROVIDER_LIMITS
} from '../SessionConfigNormalizer';

describe('SessionConfigNormalizer', () => {
  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(2, 0, 1)).toBe(1);
      expect(clamp(-1, 0, 1)).toBe(0);
    });

    it('should handle NaN', () => {
      expect(clamp(NaN, 0, 1)).toBe(0);
    });
  });

  describe('normalizeSessionConfig', () => {
    describe('employee mode', () => {
      it('should normalize temperature below minimum to provider minimum', () => {
        const result = normalizeSessionConfig(
          { temperature: 0.3 },
          'employee'
        );
        expect(result.temperature).toBe(0.6); // Clamped to provider minimum
      });

      it('should use default temperature when not provided', () => {
        const result = normalizeSessionConfig({}, 'employee');
        expect(result.temperature).toBe(PROVIDER_LIMITS.temperature.employeeDefault);
      });

      it('should keep valid temperature unchanged', () => {
        const result = normalizeSessionConfig(
          { temperature: 0.8 },
          'employee'
        );
        expect(result.temperature).toBe(0.8);
      });

      it('should clamp temperature above maximum', () => {
        const result = normalizeSessionConfig(
          { temperature: 3.0 },
          'employee'
        );
        expect(result.temperature).toBe(2.0);
      });

      it('should use employee default for max_response_output_tokens', () => {
        const result = normalizeSessionConfig({}, 'employee');
        expect(result.max_response_output_tokens).toBe(
          PROVIDER_LIMITS.maxTokens.employeeDefault
        );
      });
    });

    describe('customer mode', () => {
      it('should normalize temperature below minimum to provider minimum', () => {
        const result = normalizeSessionConfig(
          { temperature: 0.3 },
          'customer'
        );
        expect(result.temperature).toBe(0.6); // Clamped to provider minimum
      });

      it('should use customer default temperature when not provided', () => {
        const result = normalizeSessionConfig({}, 'customer');
        expect(result.temperature).toBe(PROVIDER_LIMITS.temperature.customerDefault);
      });

      it('should use customer default for max_response_output_tokens', () => {
        const result = normalizeSessionConfig({}, 'customer');
        expect(result.max_response_output_tokens).toBe(
          PROVIDER_LIMITS.maxTokens.customerDefault
        );
      });
    });

    describe('other parameters', () => {
      it('should normalize all parameters', () => {
        const result = normalizeSessionConfig(
          {
            temperature: 0.3,
            topP: 2.0,
            presencePenalty: -3.0,
            frequencyPenalty: 3.0,
            max_response_output_tokens: 10000
          },
          'customer'
        );

        expect(result.temperature).toBe(0.6); // Clamped to min
        expect(result.topP).toBe(1.0); // Clamped to max
        expect(result.presencePenalty).toBe(-2.0); // Clamped to min
        expect(result.frequencyPenalty).toBe(2.0); // Clamped to max
        expect(result.max_response_output_tokens).toBe(4096); // Clamped to max
      });

      it('should provide defaults for missing parameters', () => {
        const result = normalizeSessionConfig({}, 'customer');

        expect(result.topP).toBe(1.0);
        expect(result.presencePenalty).toBe(0);
        expect(result.frequencyPenalty).toBe(0);
      });
    });
  });

  describe('OpenAI Realtime API compliance', () => {
    it('should never return temperature below 0.6', () => {
      const testValues = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.59];

      for (const value of testValues) {
        const employeeResult = normalizeSessionConfig(
          { temperature: value },
          'employee'
        );
        const customerResult = normalizeSessionConfig(
          { temperature: value },
          'customer'
        );

        expect(employeeResult.temperature).toBeGreaterThanOrEqual(0.6);
        expect(customerResult.temperature).toBeGreaterThanOrEqual(0.6);
      }
    });

    it('should never return temperature above 2.0', () => {
      const testValues = [2.1, 3.0, 5.0, 10.0];

      for (const value of testValues) {
        const employeeResult = normalizeSessionConfig(
          { temperature: value },
          'employee'
        );
        const customerResult = normalizeSessionConfig(
          { temperature: value },
          'customer'
        );

        expect(employeeResult.temperature).toBeLessThanOrEqual(2.0);
        expect(customerResult.temperature).toBeLessThanOrEqual(2.0);
      }
    });
  });
});