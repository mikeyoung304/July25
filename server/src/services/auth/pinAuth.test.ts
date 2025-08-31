import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { PinAuthService } from './pinAuth';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}));

describe('PinAuthService', () => {
  let pinAuthService: PinAuthService;

  beforeEach(() => {
    pinAuthService = new PinAuthService();
  });

  describe('PIN Hashing', () => {
    it('should hash a PIN code', async () => {
      const pin = '1234';
      const hashedPin = await pinAuthService.hashPin(pin);
      
      expect(hashedPin).toBeDefined();
      expect(hashedPin).not.toBe(pin);
      expect(hashedPin.length).toBeGreaterThan(20);
    });

    it('should generate different hashes for the same PIN', async () => {
      const pin = '5678';
      const hash1 = await pinAuthService.hashPin(pin);
      const hash2 = await pinAuthService.hashPin(pin);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle 6-digit PINs', async () => {
      const pin = '123456';
      const hashedPin = await pinAuthService.hashPin(pin);
      
      expect(hashedPin).toBeDefined();
      expect(hashedPin).not.toBe(pin);
    });
  });

  describe('PIN Verification', () => {
    it('should verify a correct PIN', async () => {
      const pin = '1234';
      const hashedPin = await bcrypt.hash(pin, 10);
      
      const isValid = await pinAuthService.verifyPin(pin, hashedPin);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect PIN', async () => {
      const correctPin = '1234';
      const wrongPin = '5678';
      const hashedPin = await bcrypt.hash(correctPin, 10);
      
      const isValid = await pinAuthService.verifyPin(wrongPin, hashedPin);
      expect(isValid).toBe(false);
    });

    it('should handle empty PIN gracefully', async () => {
      const hashedPin = await bcrypt.hash('1234', 10);
      
      const isValid = await pinAuthService.verifyPin('', hashedPin);
      expect(isValid).toBe(false);
    });
  });

  describe('PIN Validation', () => {
    it('should validate 4-digit PIN', () => {
      expect(pinAuthService.isValidPin('1234')).toBe(true);
    });

    it('should validate 6-digit PIN', () => {
      expect(pinAuthService.isValidPin('123456')).toBe(true);
    });

    it('should reject 3-digit PIN', () => {
      expect(pinAuthService.isValidPin('123')).toBe(false);
    });

    it('should reject 7-digit PIN', () => {
      expect(pinAuthService.isValidPin('1234567')).toBe(false);
    });

    it('should reject non-numeric PIN', () => {
      expect(pinAuthService.isValidPin('12AB')).toBe(false);
    });

    it('should reject PIN with spaces', () => {
      expect(pinAuthService.isValidPin('12 34')).toBe(false);
    });
  });

  describe('Integration with bcryptjs', () => {
    it('should use bcrypt for hashing', async () => {
      const pin = '9876';
      const hashedPin = await pinAuthService.hashPin(pin);
      
      // Verify it's a valid bcrypt hash
      const isValidBcryptHash = hashedPin.startsWith('$2');
      expect(isValidBcryptHash).toBe(true);
      
      // Verify bcrypt can validate it
      const isValid = await bcrypt.compare(pin, hashedPin);
      expect(isValid).toBe(true);
    });

    it('should handle bcrypt rounds configuration', async () => {
      const pin = '4321';
      const rounds = 12;
      const hashedPin = await pinAuthService.hashPin(pin, rounds);
      
      expect(hashedPin).toBeDefined();
      const isValid = await bcrypt.compare(pin, hashedPin);
      expect(isValid).toBe(true);
    });
  });
});