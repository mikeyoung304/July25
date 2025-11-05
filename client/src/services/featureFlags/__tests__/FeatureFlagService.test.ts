/**
 * Feature Flag Service Tests
 *
 * Tests the feature flag service including:
 * - Hash function distribution
 * - Percentage rollout bucketing
 * - Environment variable parsing
 * - Security features (production localStorage blocking)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureFlagService, type FeatureFlagConfig } from '../FeatureFlagService';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset import.meta.env.PROD
    vi.stubGlobal('import', {
      meta: {
        env: {
          PROD: false,
          VITE_FEATURE_TEST_FLAG: 'true',
          VITE_FEATURE_DISABLED_FLAG: 'false',
          VITE_FEATURE_PERCENTAGE_FLAG: '50'
        }
      }
    });
  });

  describe('isEnabled', () => {
    it('should return false for undefined flags', async () => {
      service = new FeatureFlagService();
      const enabled = await service.isEnabled('NONEXISTENT_FLAG');
      expect(enabled).toBe(false);
    });

    it('should return true for enabled flags', async () => {
      service = new FeatureFlagService();
      const enabled = await service.isEnabled('TEST_FLAG');
      expect(enabled).toBe(true);
    });

    it('should return false for disabled flags', async () => {
      service = new FeatureFlagService();
      const enabled = await service.isEnabled('DISABLED_FLAG');
      expect(enabled).toBe(false);
    });

    it('should respect user targeting', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('TARGETED_FLAG', {
        enabled: true,
        targetUserIds: ['user-123']
      });

      const enabledForTargetUser = await service.isEnabled('TARGETED_FLAG', 'user-123');
      const enabledForOtherUser = await service.isEnabled('TARGETED_FLAG', 'user-456');

      expect(enabledForTargetUser).toBe(true);
      expect(enabledForOtherUser).toBe(false);
    });

    it('should respect restaurant targeting', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('RESTAURANT_FLAG', {
        enabled: true,
        targetRestaurantIds: ['rest-abc']
      });

      const enabledForTargetRestaurant = await service.isEnabled('RESTAURANT_FLAG', undefined, 'rest-abc');
      const enabledForOtherRestaurant = await service.isEnabled('RESTAURANT_FLAG', undefined, 'rest-xyz');

      expect(enabledForTargetRestaurant).toBe(true);
      expect(enabledForOtherRestaurant).toBe(false);
    });
  });

  describe('percentage rollout', () => {
    it('should use consistent hashing for same user/flag combination', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('PERCENTAGE_FLAG', {
        enabled: true,
        rolloutPercentage: 50
      });

      // Same user should always get same result
      const result1 = await service.isEnabled('PERCENTAGE_FLAG', 'user-123');
      const result2 = await service.isEnabled('PERCENTAGE_FLAG', 'user-123');
      const result3 = await service.isEnabled('PERCENTAGE_FLAG', 'user-123');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should distribute users across 0-100% range', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('ROLLOUT_FLAG', {
        enabled: true,
        rolloutPercentage: 50
      });

      // Test with 100 different users
      const users = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const results = await Promise.all(
        users.map(userId => service.isEnabled('ROLLOUT_FLAG', userId))
      );

      const enabledCount = results.filter(r => r).length;

      // With 100 users and 50% rollout, expect ~50 enabled (allow 30-70 range for variance)
      expect(enabledCount).toBeGreaterThan(30);
      expect(enabledCount).toBeLessThan(70);
    });

    it('should handle 0% rollout (none enabled)', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('ZERO_ROLLOUT', {
        enabled: true,
        rolloutPercentage: 0
      });

      const users = Array.from({ length: 20 }, (_, i) => `user-${i}`);
      const results = await Promise.all(
        users.map(userId => service.isEnabled('ZERO_ROLLOUT', userId))
      );

      const enabledCount = results.filter(r => r).length;
      expect(enabledCount).toBe(0);
    });

    it('should handle 100% rollout (all enabled)', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('FULL_ROLLOUT', {
        enabled: true,
        rolloutPercentage: 100
      });

      const users = Array.from({ length: 20 }, (_, i) => `user-${i}`);
      const results = await Promise.all(
        users.map(userId => service.isEnabled('FULL_ROLLOUT', userId))
      );

      const enabledCount = results.filter(r => r).length;
      expect(enabledCount).toBe(20);
    });
  });

  describe('localStorage overrides', () => {
    it('should save and load overrides in development', () => {
      service = new FeatureFlagService();

      const config: FeatureFlagConfig = {
        enabled: true,
        rolloutPercentage: 75
      };

      service.setLocalOverride('DEV_FLAG', config);

      // Create new instance to test loading from localStorage
      const newService = new FeatureFlagService();
      const allFlags = newService.getAllFlags();

      expect(allFlags['DEV_FLAG']).toEqual(config);
    });

    it('should block localStorage overrides in production', () => {
      // Mock production environment
      vi.stubGlobal('import', {
        meta: {
          env: {
            PROD: true
          }
        }
      });

      service = new FeatureFlagService();

      const config: FeatureFlagConfig = {
        enabled: true
      };

      service.setLocalOverride('PROD_FLAG', config);

      // Create new instance - should NOT load from localStorage
      const newService = new FeatureFlagService();
      const allFlags = newService.getAllFlags();

      expect(allFlags['PROD_FLAG']).toBeUndefined();
    });

    it('should clear all overrides', () => {
      service = new FeatureFlagService();

      service.setLocalOverride('FLAG1', { enabled: true });
      service.setLocalOverride('FLAG2', { enabled: true });

      service.clearLocalOverrides();

      const stored = localStorage.getItem('feature_flags_override');
      expect(stored).toBeNull();
    });
  });

  describe('environment variable parsing', () => {
    it('should parse boolean true', () => {
      service = new FeatureFlagService();
      const allFlags = service.getAllFlags();

      expect(allFlags['TEST_FLAG']).toEqual({ enabled: true });
    });

    it('should parse boolean false', () => {
      service = new FeatureFlagService();
      const allFlags = service.getAllFlags();

      expect(allFlags['DISABLED_FLAG']).toEqual({ enabled: false });
    });

    it('should parse percentage values', () => {
      service = new FeatureFlagService();
      const allFlags = service.getAllFlags();

      expect(allFlags['PERCENTAGE_FLAG']).toEqual({
        enabled: true,
        rolloutPercentage: 50
      });
    });
  });

  describe('cryptographic hash function', () => {
    it('should produce consistent hashes for same input', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('HASH_TEST', {
        enabled: true,
        rolloutPercentage: 50
      });

      const results = await Promise.all([
        service.isEnabled('HASH_TEST', 'test-user'),
        service.isEnabled('HASH_TEST', 'test-user'),
        service.isEnabled('HASH_TEST', 'test-user')
      ]);

      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    it('should produce different hashes for different inputs', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('HASH_TEST', {
        enabled: true,
        rolloutPercentage: 50
      });

      // Test 100 different users - should not all be same
      const users = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const results = await Promise.all(
        users.map(userId => service.isEnabled('HASH_TEST', userId))
      );

      const allSame = results.every(r => r === results[0]);
      expect(allSame).toBe(false);
    });

    it('should produce different results for different flags with same user', async () => {
      service = new FeatureFlagService();
      service.setLocalOverride('FLAG_A', {
        enabled: true,
        rolloutPercentage: 50
      });
      service.setLocalOverride('FLAG_B', {
        enabled: true,
        rolloutPercentage: 50
      });

      // Test 20 users across 2 flags - not all should be same
      const users = Array.from({ length: 20 }, (_, i) => `user-${i}`);
      const resultsA = await Promise.all(
        users.map(userId => service.isEnabled('FLAG_A', userId))
      );
      const resultsB = await Promise.all(
        users.map(userId => service.isEnabled('FLAG_B', userId))
      );

      // Results arrays should differ (flag name is part of hash input)
      const identical = resultsA.every((r, i) => r === resultsB[i]);
      expect(identical).toBe(false);
    });
  });
});
