/**
 * PIN Authentication Unit Tests
 *
 * Tests the PIN authentication service, with focus on security-critical behaviors:
 * - Atomic increment_pin_attempts RPC on failed PIN
 * - Account lockout after max attempts (5)
 * - Error handling when RPC fails
 * - Timing-safe behavior (dummy hash comparison on user not found)
 *
 * Related:
 * - server/src/services/auth/pinAuth.ts
 * - supabase/migrations/20260101_atomic_pin_attempt_increment.sql
 * - docs/solutions/security-issues/demo-bypass-prevention.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';

// Store original env
const originalEnv = { ...process.env };

// Test constants
const PIN_PEPPER = 'dev-only-pepper';
const validPin = '5678';
const wrongPin = '9999';
const pinSalt = bcrypt.genSaltSync(10);
const validPinHash = bcrypt.hashSync(validPin + PIN_PEPPER, pinSalt);

// Mock Supabase client
vi.mock('../../../src/config/database', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock logger to prevent console noise and verify logging behavior
vi.mock('../../../src/utils/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnThis()
  };
  return {
    logger: mockLogger
  };
});

// Import after mocks are set up
import { supabase } from '../../../src/config/database';
import { logger } from '../../../src/utils/logger';
import { validatePin, resetPinAttempts, isPinLocked, generateRandomPin } from '../../../src/services/auth/pinAuth';

describe('PIN Authentication Service', () => {
  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
  const mockUserId = '22222222-2222-2222-2222-222222222222';
  const mockPinId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validatePin - increment_pin_attempts RPC', () => {
    it('should call increment_pin_attempts RPC on failed PIN validation', async () => {
      // Setup: PIN records exist but PIN is wrong
      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({
        data: [{
          id: mockPinId,
          user_id: mockUserId,
          pin_hash: validPinHash,
          salt: pinSalt,
          attempts: 0,
          locked_until: null,
          users: { id: mockUserId, email: 'test@example.com' }
        }],
        error: null
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return {
            select: vi.fn().mockReturnValue(pinSelectChain)
          };
        }
        if (table === 'auth_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ new_attempts: 1, is_locked: false, locked_until: null }],
        error: null
      });
      (supabase.rpc as any) = mockRpc;

      // Call with wrong PIN (bcrypt comparison will fail because PIN doesn't match)
      const result = await validatePin(wrongPin, mockRestaurantId);

      // Verify RPC was called with correct parameters
      expect(mockRpc).toHaveBeenCalledWith('increment_pin_attempts', {
        p_pin_id: mockPinId,
        p_restaurant_id: mockRestaurantId,
        p_max_attempts: 5,
        p_lockout_minutes: 15
      });

      // Verify result indicates invalid PIN
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid PIN');
    });

    it('should return error when increment_pin_attempts RPC fails', async () => {
      // Setup: PIN records exist but RPC fails
      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({
        data: [{
          id: mockPinId,
          user_id: mockUserId,
          pin_hash: validPinHash,
          salt: pinSalt,
          attempts: 0,
          locked_until: null,
          users: { id: mockUserId, email: 'test@example.com' }
        }],
        error: null
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return {
            select: vi.fn().mockReturnValue(pinSelectChain)
          };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      // Mock RPC to fail
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'PGRST500' }
      });
      (supabase.rpc as any) = mockRpc;

      // Call with wrong PIN - RPC failure should cause authentication error
      const result = await validatePin(wrongPin, mockRestaurantId);

      // Verify error handling - the implementation throws which gets caught
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Authentication failed');

      // Verify error was logged as CRITICAL
      expect(logger.error).toHaveBeenCalledWith(
        'CRITICAL: Failed to update PIN attempt counter',
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Database connection failed' }),
          userId: mockUserId,
          restaurantId: mockRestaurantId
        })
      );
    });

    it('should include correct RPC parameters: p_pin_id, p_restaurant_id, p_max_attempts, p_lockout_minutes', async () => {
      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({
        data: [{
          id: mockPinId,
          user_id: mockUserId,
          pin_hash: validPinHash,
          salt: pinSalt,
          attempts: 0,
          locked_until: null,
          users: { id: mockUserId, email: 'test@example.com' }
        }],
        error: null
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return { select: vi.fn().mockReturnValue(pinSelectChain) };
        }
        if (table === 'auth_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ new_attempts: 1, is_locked: false, locked_until: null }],
        error: null
      });
      (supabase.rpc as any) = mockRpc;

      await validatePin(wrongPin, mockRestaurantId);

      // Verify all RPC parameters are correct
      expect(mockRpc).toHaveBeenCalledWith('increment_pin_attempts', {
        p_pin_id: mockPinId,           // UUID of the PIN record
        p_restaurant_id: mockRestaurantId,  // Restaurant ID for multi-tenancy
        p_max_attempts: 5,             // Max attempts before lockout
        p_lockout_minutes: 15          // Lockout duration
      });
    });
  });

  describe('validatePin - Account lockout after max attempts', () => {
    it('should lock account after 5 failed attempts', async () => {
      // Setup: PIN record with 4 attempts (next failure will lock)
      const lockoutTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({
        data: [{
          id: mockPinId,
          user_id: mockUserId,
          pin_hash: validPinHash,
          salt: pinSalt,
          attempts: 4,
          locked_until: null,
          users: { id: mockUserId, email: 'test@example.com' }
        }],
        error: null
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return { select: vi.fn().mockReturnValue(pinSelectChain) };
        }
        if (table === 'auth_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ new_attempts: 5, is_locked: true, locked_until: lockoutTime }],
        error: null
      });
      (supabase.rpc as any) = mockRpc;

      // Call with wrong PIN (5th attempt)
      await validatePin(wrongPin, mockRestaurantId);

      // Verify lockout was logged
      expect(logger.warn).toHaveBeenCalledWith(
        'Account locked due to failed PIN attempts',
        expect.objectContaining({
          userId: mockUserId,
          attempts: 5,
          lockedUntil: lockoutTime
        })
      );
    });

    it('should skip locked accounts during PIN validation', async () => {
      // Setup: User account is locked (15 mins in future)
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({
        data: [{
          id: mockPinId,
          user_id: mockUserId,
          pin_hash: validPinHash,
          salt: pinSalt,
          attempts: 5,
          locked_until: lockedUntil, // This account is locked
          users: { id: mockUserId, email: 'locked@example.com' }
        }],
        error: null
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return { select: vi.fn().mockReturnValue(pinSelectChain) };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      // Try to validate (even with correct PIN, it should fail due to lock)
      const result = await validatePin(validPin, mockRestaurantId);

      // Verify the locked account was logged as skipped
      expect(logger.warn).toHaveBeenCalledWith(
        'Account locked for PIN attempts',
        expect.objectContaining({
          userId: mockUserId,
          lockedUntil: lockedUntil
        })
      );

      // Should return invalid since the only account is locked
      expect(result.isValid).toBe(false);
    });

    it('should log pin_locked event when RPC indicates account was locked', async () => {
      const lockoutTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({
        data: [{
          id: mockPinId,
          user_id: mockUserId,
          pin_hash: validPinHash,
          salt: pinSalt,
          attempts: 4,
          locked_until: null,
          users: { id: mockUserId, email: 'test@example.com' }
        }],
        error: null
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return { select: vi.fn().mockReturnValue(pinSelectChain) };
        }
        if (table === 'auth_logs') {
          return { insert: mockInsert };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ new_attempts: 5, is_locked: true, locked_until: lockoutTime }],
        error: null
      });
      (supabase.rpc as any) = mockRpc;

      await validatePin(wrongPin, mockRestaurantId);

      // Verify auth_logs insert was called for 'pin_locked' event
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          restaurant_id: mockRestaurantId,
          event_type: 'pin_locked'
        })
      );
    });
  });

  describe('validatePin - Timing-safe behavior', () => {
    it('should perform dummy bcrypt comparison when no PIN records exist', async () => {
      // Spy on bcrypt.compareSync to verify it's called for timing safety
      const compareSpy = vi.spyOn(bcrypt, 'compareSync');

      // Setup: No PIN records for this restaurant
      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({ data: [], error: null });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return { select: vi.fn().mockReturnValue(pinSelectChain) };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      // Call validatePin
      const result = await validatePin('1234', mockRestaurantId);

      // Verify bcrypt.compareSync was called (timing-safe dummy comparison)
      expect(compareSpy).toHaveBeenCalled();

      // Verify result indicates invalid PIN
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid PIN');

      // Verify warning was logged
      expect(logger.warn).toHaveBeenCalledWith(
        'No PIN records found for restaurant',
        expect.objectContaining({ restaurantId: mockRestaurantId })
      );
    });

    it('should perform dummy bcrypt comparison when query returns error', async () => {
      const compareSpy = vi.spyOn(bcrypt, 'compareSync');

      // Setup: Query returns error
      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({ data: null, error: { message: 'Connection failed' } });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return { select: vi.fn().mockReturnValue(pinSelectChain) };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      const result = await validatePin('1234', mockRestaurantId);

      // Verify bcrypt.compareSync was called for timing safety
      expect(compareSpy).toHaveBeenCalled();
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid PIN');
    });
  });

  describe('validatePin - Input validation', () => {
    it('should return error when PIN is empty', async () => {
      const result = await validatePin('', mockRestaurantId);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('PIN and restaurant ID required');
    });

    it('should return error when restaurant ID is empty', async () => {
      const result = await validatePin('1234', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('PIN and restaurant ID required');
    });

    it('should return error when both are empty', async () => {
      const result = await validatePin('', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('PIN and restaurant ID required');
    });
  });

  describe('validatePin - Auth logging', () => {
    it('should log PIN failed event after failed validation', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      const pinSelectChain: any = { eq: vi.fn() };
      pinSelectChain.eq.mockResolvedValue({
        data: [{
          id: mockPinId,
          user_id: mockUserId,
          pin_hash: validPinHash,
          salt: pinSalt,
          attempts: 0,
          locked_until: null,
          users: { id: mockUserId, email: 'test@example.com' }
        }],
        error: null
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_pins') {
          return { select: vi.fn().mockReturnValue(pinSelectChain) };
        }
        if (table === 'auth_logs') {
          return { insert: mockInsert };
        }
        return {};
      });
      (supabase.from as any) = mockFrom;

      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ new_attempts: 1, is_locked: false, locked_until: null }],
        error: null
      });
      (supabase.rpc as any) = mockRpc;

      await validatePin(wrongPin, mockRestaurantId);

      // Verify auth_logs insert was called for 'pin_failed' event
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          restaurant_id: mockRestaurantId,
          event_type: 'pin_failed'
        })
      );
    });
  });

  describe('isPinLocked', () => {
    it('should return true when locked_until is in the future', async () => {
      const futureLockout = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const selectChain: any = { eq: vi.fn(), single: vi.fn() };
      selectChain.eq.mockImplementation(() => selectChain);
      selectChain.single.mockResolvedValue({
        data: { locked_until: futureLockout },
        error: null
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain)
      });
      (supabase.from as any) = mockFrom;

      const result = await isPinLocked(mockUserId, mockRestaurantId);
      expect(result).toBe(true);
    });

    it('should return false when locked_until is in the past', async () => {
      const pastLockout = new Date(Date.now() - 1000).toISOString();

      const selectChain: any = { eq: vi.fn(), single: vi.fn() };
      selectChain.eq.mockImplementation(() => selectChain);
      selectChain.single.mockResolvedValue({
        data: { locked_until: pastLockout },
        error: null
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain)
      });
      (supabase.from as any) = mockFrom;

      const result = await isPinLocked(mockUserId, mockRestaurantId);
      expect(result).toBe(false);
    });

    it('should return false when locked_until is null', async () => {
      const selectChain: any = { eq: vi.fn(), single: vi.fn() };
      selectChain.eq.mockImplementation(() => selectChain);
      selectChain.single.mockResolvedValue({
        data: { locked_until: null },
        error: null
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain)
      });
      (supabase.from as any) = mockFrom;

      const result = await isPinLocked(mockUserId, mockRestaurantId);
      expect(result).toBe(false);
    });

    it('should return false when no PIN record exists', async () => {
      const selectChain: any = { eq: vi.fn(), single: vi.fn() };
      selectChain.eq.mockImplementation(() => selectChain);
      selectChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain)
      });
      (supabase.from as any) = mockFrom;

      const result = await isPinLocked(mockUserId, mockRestaurantId);
      expect(result).toBe(false);
    });
  });

  describe('generateRandomPin', () => {
    it('should generate a PIN of default length 4', () => {
      const pin = generateRandomPin();
      expect(pin.length).toBe(4);
      expect(/^\d+$/.test(pin)).toBe(true);
    });

    it('should generate a PIN of specified length', () => {
      const pin = generateRandomPin(6);
      expect(pin.length).toBe(6);
      expect(/^\d+$/.test(pin)).toBe(true);
    });

    it('should not generate simple patterns like all same digit', () => {
      // Generate many PINs and verify none are all same digit
      for (let i = 0; i < 100; i++) {
        const pin = generateRandomPin();
        expect(/^(\d)\1+$/.test(pin)).toBe(false);
      }
    });

    it('should not generate common weak PINs', () => {
      // Generate many PINs and verify none are common weak patterns
      const weakPins = ['1234', '0000', '123456', '000000'];
      for (let i = 0; i < 100; i++) {
        const pin = generateRandomPin();
        expect(weakPins.includes(pin)).toBe(false);
      }
    });

    it('should clamp length to minimum 4', () => {
      const pin = generateRandomPin(2);
      expect(pin.length).toBe(4);
    });

    it('should clamp length to maximum 6', () => {
      const pin = generateRandomPin(10);
      expect(pin.length).toBe(4); // Falls back to MIN when out of range
    });
  });
});
