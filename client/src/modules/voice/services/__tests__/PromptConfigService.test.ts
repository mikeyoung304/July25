/**
 * PromptConfigService Tests
 *
 * PHASE 1 VERIFICATION: Ensures prompts are consistent and correctly formatted
 */

// Note: Jest globals are provided by client/server test environments
// This test file is executed by client workspace, not shared workspace
import { PromptConfigService } from '../PromptConfigService';

describe('PromptConfigService', () => {
  const sampleMenuContext = `
📋 FULL MENU (Summer Lunch Menu):
=====================================

SALADS:
  • Greek Salad - $12.00 [Ask: dressing? add protein?]
    Fresh mixed greens with feta cheese and olives
  • Peach Arugula - $14.00 [Ask: dressing? add protein?]
    Arugula with fresh peaches and goat cheese

BOWLS:
  • Soul Bowl - $14.00 [Check dietary needs]
    Southern comfort food bowl with greens and beans
  • Greek Bowl - $13.00 [Check dietary needs]
    Mediterranean-style grain bowl
`;

  describe('Version Management', () => {
    it('should return a valid semantic version', () => {
      const version = PromptConfigService.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(version).toBe('1.0.0');
    });
  });

  describe('Kiosk Mode Instructions', () => {
    it('should build complete kiosk instructions with menu context', () => {
      const instructions = PromptConfigService.buildInstructions('kiosk', sampleMenuContext);

      // Verify critical sections
      expect(instructions).toContain('CRITICAL SYSTEM DIRECTIVE: YOU MUST SPEAK ONLY IN ENGLISH');
      expect(instructions).toContain('Welcome to Grow Restaurant, mon!');
      expect(instructions).toContain('⚠️ GOLDEN RULES:');
      expect(instructions).toContain('add_to_order function');
      expect(instructions).toContain('🎤 TRANSCRIPTION HELP');

      // Verify menu context is included
      expect(instructions).toContain('🔴 CRITICAL SYSTEM KNOWLEDGE - THIS IS YOUR MENU:');
      expect(instructions).toContain(sampleMenuContext);
      expect(instructions).toContain('YOU ARE THE MENU EXPERT');
    });

    it('should handle empty menu context gracefully', () => {
      const instructions = PromptConfigService.buildInstructions('kiosk', '');

      expect(instructions).toContain('CRITICAL SYSTEM DIRECTIVE');
      expect(instructions).toContain('Note: Menu information is currently unavailable');
      expect(instructions).not.toContain('🔴 CRITICAL SYSTEM KNOWLEDGE');
    });

    it('should preserve exact formatting for AI interpretation', () => {
      const instructions = PromptConfigService.buildInstructions('kiosk', sampleMenuContext);

      // These emoji markers are critical for AI parsing
      expect(instructions).toContain('🎤 GREETING');
      expect(instructions).toContain('🎯 YOUR JOB:');
      expect(instructions).toContain('📋 SMART FOLLOW-UPS BY CATEGORY:');
      expect(instructions).toContain('💬 EXAMPLE RESPONSES:');
      expect(instructions).toContain('🚫 REDIRECT NON-FOOD TOPICS:');
    });
  });

  describe('Server Mode Instructions', () => {
    it('should build complete server instructions with menu context', () => {
      const instructions = PromptConfigService.buildInstructions('server', sampleMenuContext);

      // Verify critical sections for staff mode
      expect(instructions).toContain('CRITICAL: SPEAK ONLY ENGLISH');
      expect(instructions).toContain('staff ordering assistant');
      expect(instructions).toContain('⚡ SPEED RULES:');
      expect(instructions).toContain('Response length: 5-10 words max');
      expect(instructions).toContain('confirm_seat_order');

      // Verify menu context is included
      expect(instructions).toContain(sampleMenuContext);
    });

    it('should be significantly shorter than kiosk mode', () => {
      const kioskInstructions = PromptConfigService.buildInstructions('kiosk', sampleMenuContext);
      const serverInstructions = PromptConfigService.buildInstructions('server', sampleMenuContext);

      // Server mode should be more concise (at least 20% shorter)
      expect(serverInstructions.length).toBeLessThan(kioskInstructions.length * 0.8);
    });

    it('should not contain customer-facing greetings', () => {
      const instructions = PromptConfigService.buildInstructions('server', sampleMenuContext);

      // Server mode should NOT have the Jamaican greeting
      expect(instructions).not.toContain('Welcome to Grow Restaurant, mon!');
      expect(instructions).not.toContain('GREETING (FOR DEPLOYMENT VERIFICATION)');
    });
  });

  describe('Kiosk Mode Tools', () => {
    it('should define exactly 3 function tools', () => {
      const tools = PromptConfigService.buildTools('kiosk');

      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual([
        'add_to_order',
        'confirm_order',
        'remove_from_order'
      ]);
    });

    it('should define add_to_order with correct schema', () => {
      const tools = PromptConfigService.buildTools('kiosk');
      const addTool = tools.find(t => t.name === 'add_to_order');

      expect(addTool).toBeDefined();
      expect(addTool!.type).toBe('function');
      expect(addTool!.parameters.type).toBe('object');
      expect(addTool!.parameters.required).toEqual(['items']);

      // Verify item schema
      const itemSchema = addTool!.parameters.properties.items.items.properties;
      expect(itemSchema.name).toBeDefined();
      expect(itemSchema.quantity).toBeDefined();
      expect(itemSchema.modifications).toBeDefined();
      expect(itemSchema.specialInstructions).toBeDefined();

      // Kiosk mode should NOT have allergyNotes or rushOrder
      expect(itemSchema.allergyNotes).toBeUndefined();
      expect(itemSchema.rushOrder).toBeUndefined();
    });

    it('should define confirm_order with checkout actions', () => {
      const tools = PromptConfigService.buildTools('kiosk');
      const confirmTool = tools.find(t => t.name === 'confirm_order');

      expect(confirmTool).toBeDefined();
      expect(confirmTool!.parameters.properties.action.enum).toEqual([
        'checkout', 'review', 'cancel'
      ]);
    });
  });

  describe('Server Mode Tools', () => {
    it('should define exactly 3 function tools', () => {
      const tools = PromptConfigService.buildTools('server');

      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual([
        'add_to_order',
        'confirm_seat_order',  // Different from kiosk!
        'remove_from_order'
      ]);
    });

    it('should define add_to_order with staff-specific fields', () => {
      const tools = PromptConfigService.buildTools('server');
      const addTool = tools.find(t => t.name === 'add_to_order');

      const itemSchema = addTool!.parameters.properties.items.items.properties;

      // Server mode SHOULD have allergyNotes and rushOrder
      expect(itemSchema.allergyNotes).toBeDefined();
      expect(itemSchema.allergyNotes.type).toBe('string');
      expect(itemSchema.allergyNotes.description).toContain('allergy');

      expect(itemSchema.rushOrder).toBeDefined();
      expect(itemSchema.rushOrder.type).toBe('boolean');
    });

    it('should define confirm_seat_order with staff workflow actions', () => {
      const tools = PromptConfigService.buildTools('server');
      const confirmTool = tools.find(t => t.name === 'confirm_seat_order');

      expect(confirmTool).toBeDefined();
      expect(confirmTool!.parameters.properties.action.enum).toEqual([
        'submit', 'review', 'next_seat', 'finish_table'
      ]);
    });
  });

  describe('Context Switching', () => {
    it('should return different instructions for different contexts', () => {
      const kioskInstructions = PromptConfigService.buildInstructions('kiosk', sampleMenuContext);
      const serverInstructions = PromptConfigService.buildInstructions('server', sampleMenuContext);

      expect(kioskInstructions).not.toBe(serverInstructions);
    });

    it('should return different tools for different contexts', () => {
      const kioskTools = PromptConfigService.buildTools('kiosk');
      const serverTools = PromptConfigService.buildTools('server');

      // Tools should differ in schema
      expect(JSON.stringify(kioskTools)).not.toBe(JSON.stringify(serverTools));

      // Specifically, confirm function names differ
      const kioskConfirm = kioskTools.find(t => t.name.includes('confirm'));
      const serverConfirm = serverTools.find(t => t.name.includes('confirm'));

      expect(kioskConfirm!.name).toBe('confirm_order');
      expect(serverConfirm!.name).toBe('confirm_seat_order');
    });
  });

  describe('Menu Context Integration', () => {
    it('should append menu context to end of instructions', () => {
      const instructions = PromptConfigService.buildInstructions('kiosk', sampleMenuContext);

      // Menu should appear after core instructions
      const menuStartIndex = instructions.indexOf('🔴 CRITICAL SYSTEM KNOWLEDGE');
      const coreInstructionsEndIndex = instructions.indexOf('🚫 REDIRECT NON-FOOD TOPICS:');

      expect(menuStartIndex).toBeGreaterThan(coreInstructionsEndIndex);
    });

    it('should preserve menu context exactly as provided', () => {
      const instructions = PromptConfigService.buildInstructions('kiosk', sampleMenuContext);

      // The menu context should appear verbatim (no modifications)
      expect(instructions).toContain(sampleMenuContext);
    });

    it('should handle multi-line menu context correctly', () => {
      const multiLineMenu = `Line 1
Line 2
Line 3`;

      const instructions = PromptConfigService.buildInstructions('kiosk', multiLineMenu);
      expect(instructions).toContain(multiLineMenu);
    });
  });

  describe('Prompt Stability (No Unintended Changes)', () => {
    it('should produce identical output for identical inputs', () => {
      const instructions1 = PromptConfigService.buildInstructions('kiosk', sampleMenuContext);
      const instructions2 = PromptConfigService.buildInstructions('kiosk', sampleMenuContext);

      expect(instructions1).toBe(instructions2);
    });

    it('should produce identical tools for identical contexts', () => {
      const tools1 = PromptConfigService.buildTools('kiosk');
      const tools2 = PromptConfigService.buildTools('kiosk');

      expect(JSON.stringify(tools1)).toBe(JSON.stringify(tools2));
    });
  });

  describe('Error Handling', () => {
    it('should handle whitespace-only menu context', () => {
      const instructions = PromptConfigService.buildInstructions('kiosk', '   \n   ');

      expect(instructions).toContain('Note: Menu information is currently unavailable');
    });

    it('should not crash with very long menu context', () => {
      const longMenu = 'Menu Item\n'.repeat(1000);

      expect(() => {
        PromptConfigService.buildInstructions('kiosk', longMenu);
      }).not.toThrow();
    });
  });
});
