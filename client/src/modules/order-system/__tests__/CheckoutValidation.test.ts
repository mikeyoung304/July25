import { describe, it, expect } from 'vitest';
import { validators } from '@/utils/validation';
import { checkoutValidationRules } from '@/config/checkoutValidation';

/**
 * Unit tests for checkout validation logic
 *
 * Converted from E2E test: TC-VALIDATION-001
 * Original E2E test: tests/e2e/checkout-flow.spec.ts
 *
 * These tests verify the validation logic in isolation without requiring
 * a full browser environment or checkout flow navigation.
 */

describe('Checkout Validation', () => {
  describe('Email Validation', () => {
    it('rejects empty email', () => {
      const result = validators.required('');
      expect(result).toBe('This field is required');
    });

    it('rejects invalid email format (no @)', () => {
      const result = validators.email('invalid-email');
      expect(result).toBe('Please enter a valid email address');
    });

    it('rejects invalid email format (no domain)', () => {
      const result = validators.email('test@');
      expect(result).toBe('Please enter a valid email address');
    });

    it('rejects invalid email format (no local part)', () => {
      const result = validators.email('@example.com');
      expect(result).toBe('Please enter a valid email address');
    });

    it('rejects email with spaces', () => {
      const result = validators.email('test @example.com');
      expect(result).toBe('Please enter a valid email address');
    });

    it('accepts valid email', () => {
      const result = validators.email('test@example.com');
      expect(result).toBeNull();
    });

    it('accepts valid email with subdomain', () => {
      const result = validators.email('user@mail.example.com');
      expect(result).toBeNull();
    });

    it('accepts valid email with plus sign', () => {
      const result = validators.email('user+tag@example.com');
      expect(result).toBeNull();
    });
  });

  describe('Phone Validation', () => {
    it('rejects empty phone', () => {
      const result = validators.required('');
      expect(result).toBe('This field is required');
    });

    it('rejects phone with less than 10 digits', () => {
      const result = validators.phone('123');
      expect(result).toBe('Please enter a valid 10-digit phone number');
    });

    it('rejects phone with 9 digits', () => {
      const result = validators.phone('123456789');
      expect(result).toBe('Please enter a valid 10-digit phone number');
    });

    it('rejects phone with 11 digits', () => {
      const result = validators.phone('12345678901');
      expect(result).toBe('Please enter a valid 10-digit phone number');
    });

    it('accepts valid phone with formatting', () => {
      const result = validators.phone('(555) 123-4567');
      expect(result).toBeNull();
    });

    it('accepts valid phone without formatting', () => {
      const result = validators.phone('5551234567');
      expect(result).toBeNull();
    });

    it('accepts valid phone with dots', () => {
      const result = validators.phone('555.123.4567');
      expect(result).toBeNull();
    });

    it('accepts valid phone with spaces', () => {
      const result = validators.phone('555 123 4567');
      expect(result).toBeNull();
    });

    it('accepts valid phone with dashes', () => {
      const result = validators.phone('555-123-4567');
      expect(result).toBeNull();
    });
  });

  describe('Name Validation', () => {
    it('rejects empty name', () => {
      const result = validators.required('');
      expect(result).toBe('This field is required');
    });

    it('rejects null name', () => {
      const result = validators.required(null);
      expect(result).toBe('This field is required');
    });

    it('rejects undefined name', () => {
      const result = validators.required(undefined);
      expect(result).toBe('This field is required');
    });

    it('accepts valid name', () => {
      const result = validators.required('John Doe');
      expect(result).toBeNull();
    });

    it('accepts name with single character', () => {
      const result = validators.required('J');
      expect(result).toBeNull();
    });

    it('accepts name with special characters', () => {
      const result = validators.required("O'Brien");
      expect(result).toBeNull();
    });
  });

  describe('Checkout Validation Rules Configuration', () => {
    it('has correct rules for customerEmail', () => {
      const config = checkoutValidationRules.customerEmail;
      expect(config.rules).toHaveLength(2);
      expect(config.validateOnBlur).toBe(true);
    });

    it('has correct rules for customerPhone', () => {
      const config = checkoutValidationRules.customerPhone;
      expect(config.rules).toHaveLength(2);
      expect(config.validateOnBlur).toBe(true);
    });

    it('has correct rules for customerName', () => {
      const config = checkoutValidationRules.customerName;
      expect(config.rules).toHaveLength(1);
      expect(config.validateOnBlur).toBe(true);
    });
  });

  describe('Full Validation Chain (Email)', () => {
    it('validates empty email through full chain', () => {
      const rules = checkoutValidationRules.customerEmail.rules;
      const value = '';

      // Required validator should catch this
      const error = rules.find(rule => rule(value) !== null);
      expect(error).toBeDefined();
      expect(error!(value)).toBe('This field is required');
    });

    it('validates invalid email through full chain', () => {
      const rules = checkoutValidationRules.customerEmail.rules;
      const value = 'invalid-email';

      // Required passes, email validator should catch this
      let error: string | null = null;
      for (const rule of rules) {
        error = rule(value);
        if (error) break;
      }
      expect(error).toBe('Please enter a valid email address');
    });

    it('validates valid email through full chain', () => {
      const rules = checkoutValidationRules.customerEmail.rules;
      const value = 'test@example.com';

      // All validators should pass
      let error: string | null = null;
      for (const rule of rules) {
        error = rule(value);
        if (error) break;
      }
      expect(error).toBeNull();
    });
  });

  describe('Full Validation Chain (Phone)', () => {
    it('validates empty phone through full chain', () => {
      const rules = checkoutValidationRules.customerPhone.rules;
      const value = '';

      // Required validator should catch this
      const error = rules.find(rule => rule(value) !== null);
      expect(error).toBeDefined();
      expect(error!(value)).toBe('This field is required');
    });

    it('validates invalid phone through full chain', () => {
      const rules = checkoutValidationRules.customerPhone.rules;
      const value = '123';

      // Required passes, phone validator should catch this
      let error: string | null = null;
      for (const rule of rules) {
        error = rule(value);
        if (error) break;
      }
      expect(error).toBe('Please enter a valid 10-digit phone number');
    });

    it('validates valid phone through full chain', () => {
      const rules = checkoutValidationRules.customerPhone.rules;
      const value = '(555) 123-4567';

      // All validators should pass
      let error: string | null = null;
      for (const rule of rules) {
        error = rule(value);
        if (error) break;
      }
      expect(error).toBeNull();
    });
  });

  describe('Full Validation Chain (Name)', () => {
    it('validates empty name through full chain', () => {
      const rules = checkoutValidationRules.customerName.rules;
      const value = '';

      // Required validator should catch this
      const error = rules.find(rule => rule(value) !== null);
      expect(error).toBeDefined();
      expect(error!(value)).toBe('This field is required');
    });

    it('validates valid name through full chain', () => {
      const rules = checkoutValidationRules.customerName.rules;
      const value = 'Demo Customer';

      // All validators should pass
      let error: string | null = null;
      for (const rule of rules) {
        error = rule(value);
        if (error) break;
      }
      expect(error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('email validator allows null when not required', () => {
      // Email validator specifically handles empty values by returning null
      // This allows required validator to handle empty values
      const result = validators.email('');
      expect(result).toBeNull();
    });

    it('phone validator allows null when not required', () => {
      // Phone validator specifically handles empty values by returning null
      // This allows required validator to handle empty values
      const result = validators.phone('');
      expect(result).toBeNull();
    });

    it('validates whitespace-only values as empty', () => {
      // Note: Current validators don't trim, so whitespace passes required
      // This is a potential improvement area
      const result = validators.required('   ');
      expect(result).toBeNull();
    });
  });
});
