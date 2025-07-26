import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// Imports kept for type checking only
import { MenuService as _MenuService } from '../src/services/menu.service';
import { OrdersService as _OrdersService } from '../src/services/orders.service';

describe('Voice Order Integration', () => {
  const _restaurantId = '11111111-1111-1111-1111-111111111111';
  
  beforeAll(async () => {
    // In a real test, you'd set up test database
    console.warn('Setting up voice order tests...');
  });

  afterAll(async () => {
    // Clean up
    console.warn('Cleaning up voice order tests...');
  });

  const voiceTestCases = [
    {
      input: "I'd like a soul bowl",
      expectedItem: 'Soul Bowl',
      expectedConfidence: 0.8
    },
    {
      input: "Greek bowl no olives",
      expectedItem: 'Greek Bowl',
      expectedModifiers: ['No olives'],
      expectedConfidence: 0.8
    },
    {
      input: "Mom's chicken salad please",
      expectedItem: "Mom's Chicken Salad",
      expectedConfidence: 0.8
    },
    {
      input: "Can I get a veggie plate with three sides",
      expectedItem: 'Veggie Plate',
      expectedModifiers: ['Three sides'],
      expectedConfidence: 0.7
    },
    {
      input: "Summer salad add salmon",
      expectedItem: 'Summer Salad',
      expectedModifiers: ['Add salmon'],
      expectedConfidence: 0.8
    },
    {
      input: "I want a chicken fajita keto bowl",
      expectedItem: 'Chicken Fajita Keto',
      expectedConfidence: 0.9
    },
    {
      input: "Soul bowl with extra collards no rice",
      expectedItem: 'Soul Bowl',
      expectedModifiers: ['Extra collards', 'No rice'],
      expectedConfidence: 0.8
    }
  ];

  voiceTestCases.forEach(({ input, expectedItem, expectedModifiers, expectedConfidence }) => {
    it(`should correctly parse: "${input}"`, async () => {
      // Import the parseVoiceOrder function
      const { parseVoiceOrder } = await import('../src/modules/voice/services/orderIntegration');
      
      const result = parseVoiceOrder(input);
      
      expect(result).toBeTruthy();
      expect(result?.items).toHaveLength(1);
      
      const item = result?.items[0];
      expect(item?.name).toBe(expectedItem);
      
      if (expectedModifiers) {
        expect(item?.modifiers).toEqual(expect.arrayContaining(expectedModifiers));
      }
      
      // Check confidence is reasonable
      expect(item?.confidence || 0.5).toBeGreaterThanOrEqual(expectedConfidence);
    });
  });

  describe('Voice Order Error Handling', () => {
    it('should handle unclear orders gracefully', async () => {
      const unclearInputs = [
        "I want something",
        "Give me food",
        "Ummm... let me think",
        "Do you have burgers?" // They don't serve burgers
      ];

      for (const input of unclearInputs) {
        const { parseVoiceOrder } = await import('../src/modules/voice/services/orderIntegration');
        const result = parseVoiceOrder(input);
        
        // Should either return null or empty items
        expect(!result || result.items.length === 0).toBeTruthy();
      }
    });
  });

  describe('Southern Accent Recognition', () => {
    const accentTests = [
      { input: "Ah'd like a sole bol", expected: 'Soul Bowl' },
      { input: "Grecian chicken bol please", expected: 'Greek Bowl' },
      { input: "Mama's chicken sallad", expected: "Mom's Chicken Salad" },
      { input: "Lemme get that ketto bowl", expected: 'Chicken Fajita Keto' }
    ];

    accentTests.forEach(({ input, expected }) => {
      it(`should understand Southern accent: "${input}"`, async () => {
        const { parseVoiceOrder } = await import('../src/modules/voice/services/orderIntegration');
        const result = parseVoiceOrder(input);
        
        expect(result).toBeTruthy();
        expect(result?.items[0]?.name).toBe(expected);
      });
    });
  });
});