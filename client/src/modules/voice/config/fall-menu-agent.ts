/**
 * OpenAI Realtime Agent Configuration for Fall Menu
 * Created: September 15, 2025
 *
 * This configuration implements a lean, slot-filling voice agent
 * optimized for fast, natural restaurant ordering.
 */

export const FALL_MENU_AGENT_CONFIG = {
  model: 'gpt-4o-realtime-preview-2024-12-17',

  instructions: `You are a fast, courteous voice ordering agent for Grow Fresh restaurant.

## CORE BEHAVIOR
- Parse the whole utterance first; fill all known slots
- Only ask for REQUIRED fields marked in menu_config
- Use implicit confirmations: "Got it: Fall Salad, ranch, feta"
- Keep ALL responses under 12 words
- Support interruptions (barge-in friendly)
- Explicit confirm only at checkout with total

## SLOT-FILLING RULES
1. When item has required slots missing, ask ONE pointed question
2. Combine related slots: "Which bread and side?" not separate
3. Never ask about optional modifications (only record if mentioned)
4. Use progressive disclosure: show max 3 options when listing

## RESPONSE TEMPLATES

### Item with all slots filled
"[item name], [key details]. Anything else?"
Example: "BLT on wheat with mac salad. What else?"

### Missing required slot
"[question for slot]"
Example: "Which dressing?" or "Chicken or Sloppy Joe?"

### Multiple missing slots
"[question 1] and [question 2]?"
Example: "Which bread and side?"

### Checkout
"Order: [items]. Total $[amount]. Ready to pay?"

### Clarification
"Did you say [option 1] or [option 2]?"

## MENU KNOWLEDGE
Will be injected via menu_config in session.update

## ERROR HANDLING
- Unknown item: "What item would you like?"
- Unavailable: "Sorry, [item] is unavailable today."
- Multiple interpretations: Confirm the most likely one

## SAFETY
- If allergy mentioned, switch to explicit confirm mode
- Verify: "Noted [allergy]. Confirming items are safe?"

## EXAMPLES

User: "Fall salad"
Agent: "Which dressing and cheese?"

User: "Ranch and feta, add salmon"
Agent: "Fall salad, ranch, feta, with salmon. What else?"

User: "Two nachos, one chicken one beef"
Agent: "Two Grow Nachos, chicken and sloppy joe. Anything else?"

User: "Chicken and dressing"
Agent: "Two sides?"

User: "Collards and mac salad"
Agent: "Chicken & Dressing, collards, mac salad. What else?"

User: "That's it"
Agent: "Total thirty-two fifty. Ready to pay?"`,

  voice: 'alloy',

  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500
  },

  modalities: ['audio', 'text'],

  temperature: 0.7,
  max_response_output_tokens: 150,

  // Tool definitions for order management
  tools: [
    {
      type: 'function',
      name: 'add_to_order',
      description: 'Add an item to the current order',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string' },
          item_name: { type: 'string' },
          filled_slots: { type: 'object' },
          modifications: { type: 'array', items: { type: 'string' } },
          quantity: { type: 'number' },
          price: { type: 'number' }
        },
        required: ['item_id', 'item_name', 'filled_slots', 'quantity', 'price']
      }
    },
    {
      type: 'function',
      name: 'get_order_total',
      description: 'Calculate the current order total',
      parameters: { type: 'object', properties: {} }
    },
    {
      type: 'function',
      name: 'confirm_order',
      description: 'Finalize the order for payment',
      parameters: { type: 'object', properties: {} }
    },
    {
      type: 'function',
      name: 'clear_order',
      description: 'Cancel and clear the current order',
      parameters: { type: 'object', properties: {} }
    }
  ]
};

/**
 * Generate session configuration with menu context
 */
export function generateSessionConfig(menuContext: any) {
  return {
    ...FALL_MENU_AGENT_CONFIG,
    instructions: FALL_MENU_AGENT_CONFIG.instructions.replace(
      'Will be injected via menu_config in session.update',
      `menu_config = ${JSON.stringify(menuContext, null, 2)}`
    )
  };
}

/**
 * Response handler for agent events
 */
export const AGENT_RESPONSE_HANDLERS = {
  /**
   * Handle function calls from the agent
   */
  handleFunctionCall: (functionName: string, args: any) => {
    switch (functionName) {
      case 'add_to_order':
        return {
          success: true,
          message: 'Item added to order'
        };

      case 'get_order_total':
        // This should connect to your cart context
        return {
          total: 0, // Calculate from cart
          itemCount: 0
        };

      case 'confirm_order':
        return {
          success: true,
          orderId: Date.now().toString()
        };

      case 'clear_order':
        return {
          success: true,
          message: 'Order cleared'
        };

      default:
        return {
          error: `Unknown function: ${functionName}`
        };
    }
  },

  /**
   * Parse agent response for order information
   */
  parseOrderIntent: (transcript: string) => {
    // This would connect to MenuContextManager
    const patterns = {
      addItem: /(?:i'll have|i want|add|give me)\s+(.+)/i,
      removeItem: /(?:remove|no|cancel|take off)\s+(.+)/i,
      modifyItem: /(?:change|make it|switch)\s+(.+)/i,
      checkout: /(?:that's it|done|checkout|ready to pay|pay)/i,
      cancel: /(?:cancel|nevermind|start over)/i
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
      const match = transcript.match(pattern);
      if (match) {
        return {
          intent,
          value: match[1]?.trim()
        };
      }
    }

    return { intent: 'unknown', value: transcript };
  }
};

/**
 * Export configuration for easy import
 */
export default {
  config: FALL_MENU_AGENT_CONFIG,
  generateSessionConfig,
  handlers: AGENT_RESPONSE_HANDLERS
};