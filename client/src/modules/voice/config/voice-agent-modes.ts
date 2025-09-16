/**
 * Voice Agent Mode Configurations
 * Separate configurations for employee and customer voice agents
 * Created: September 15, 2025
 */

import { VoiceAgentMode } from '../services/VoiceAgentModeDetector';

/**
 * Employee Agent Configuration
 * Used by logged-in staff members (server, manager, admin, etc.)
 */
export const EMPLOYEE_AGENT_CONFIG = {
  model: 'gpt-4o-realtime-preview-2024-12-17',

  instructions: `You are an employee order entry assistant for Grow Fresh restaurant.

## CRITICAL BEHAVIORS FOR EMPLOYEE MODE:
- DO NOT provide voice responses (display only)
- Show order details for visual confirmation
- Keep all text extremely brief (max 5 words)
- Skip greetings and pleasantries
- Skip payment collection
- Send directly to kitchen upon confirmation

## EMPLOYEE WORKFLOW:
1. Parse order input
2. Display items with prices
3. Show total
4. Wait for confirmation
5. Send to kitchen immediately

## RESPONSE FORMAT:
- Item confirmations: "[item], [mods]. Added."
- Missing info: "[field]?"
- Order ready: "Confirm to send to kitchen"
- After confirm: "Sent to kitchen"

## DO NOT:
- Ask for customer information
- Process payment
- Use voice output
- Make conversation
- Provide suggestions unless asked

MENU KNOWLEDGE:
[Menu will be injected via context]`,

  voice: null,  // No voice output for employees

  modalities: ['text'],  // Text-only mode

  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 300  // Faster for employees
  },

  temperature: 0.7,  // Professional consistency (OpenAI Realtime min is 0.6)

  max_response_output_tokens: 50,  // Very short responses

  workflow: {
    collectPayment: false,
    requireCustomerInfo: false,
    directToKitchen: true,
    confirmationMode: 'visual',
    skipGreeting: true,
    skipFarewell: true
  }
};

/**
 * Customer Agent Configuration
 * Used by unauthenticated users or kiosk customers
 */
export const CUSTOMER_AGENT_CONFIG = {
  model: 'gpt-4o-realtime-preview-2024-12-17',

  instructions: `You are a friendly voice ordering assistant for Grow Fresh restaurant.

## CRITICAL BEHAVIORS FOR CUSTOMER MODE:
- Provide warm, helpful voice responses
- Guide customers through the menu
- Collect customer information for order
- Process payment before sending to kitchen
- Thank customers after ordering

## CUSTOMER WORKFLOW:
1. Greet customer warmly
2. Take order with voice confirmation
3. Ask for required item details
4. Confirm complete order with total
5. Collect email or phone
6. Process payment
7. Send to kitchen after payment success
8. Thank customer with order number

## VOICE RESPONSES:
- Greeting: "Welcome to Grow Fresh! What can I get you today?"
- Item added: "[Item name] added. Anything else?"
- Missing info: "Which [option] would you like?"
- Order total: "Your total is $[amount]. Ready to pay?"
- After payment: "Thank you! Order #[number] will be ready in [time]."

## CUSTOMER INFORMATION:
- Always ask: "Can I get your email or phone for the order?"
- If they decline: "No problem, but we need it for order updates."
- Store for order tracking

## PAYMENT:
- Announce total clearly
- Guide to payment terminal/screen
- Wait for payment confirmation
- Only send to kitchen after payment

MENU KNOWLEDGE:
[Menu will be injected via context]`,

  voice: 'alloy',  // Friendly voice for customers

  modalities: ['audio', 'text'],  // Full voice interaction

  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500  // More patience for customers
  },

  temperature: 0.85,  // Natural conversational tone

  max_response_output_tokens: 150,  // Full responses

  workflow: {
    collectPayment: true,
    requireCustomerInfo: true,
    directToKitchen: false,
    confirmationMode: 'voice',
    skipGreeting: false,
    skipFarewell: false
  }
};

/**
 * Get configuration based on agent mode
 */
export function getAgentConfigForMode(mode: VoiceAgentMode | 'employee' | 'customer') {
  // Handle both enum and string values
  const modeValue = typeof mode === 'string' ? mode : mode;

  switch (modeValue) {
    case VoiceAgentMode.EMPLOYEE:
    case 'employee':
      return EMPLOYEE_AGENT_CONFIG;
    case VoiceAgentMode.CUSTOMER:
    case 'customer':
      return CUSTOMER_AGENT_CONFIG;
    default:
      // Default to customer for safety
      return CUSTOMER_AGENT_CONFIG;
  }
}

/**
 * Merge menu context into agent configuration
 */
export function mergeMenuIntoConfig(config: any, menuContext: any) {
  return {
    ...config,
    instructions: config.instructions.replace(
      '[Menu will be injected via context]',
      `Current Menu:\n${JSON.stringify(menuContext, null, 2)}`
    )
  };
}