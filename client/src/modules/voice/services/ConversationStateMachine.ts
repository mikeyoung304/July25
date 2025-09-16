/**
 * Conversation State Machine for Voice Agent
 *
 * Implements the expert-recommended state flow:
 * AWAIT_ORDER → CAPTURE_ITEM → CAPTURE_REQUIRED → CONFIRM_ITEM → ADD_MORE → CHECKOUT_CONFIRM → CLOSE
 */

import { logger } from '@/services/monitoring/logger';
import type { MenuItem } from '@rebuild/shared';

// Conversation states as recommended by expert
export enum ConversationState {
  AWAIT_ORDER = 'AWAIT_ORDER',
  CAPTURE_ITEM = 'CAPTURE_ITEM',
  CAPTURE_REQUIRED = 'CAPTURE_REQUIRED',
  CONFIRM_ITEM = 'CONFIRM_ITEM',
  ADD_MORE = 'ADD_MORE',
  CHECKOUT_CONFIRM = 'CHECKOUT_CONFIRM',
  CLOSE = 'CLOSE'
}

// Slot types for tracking required fields
export interface RequiredSlot {
  name: string;
  value?: string;
  options?: string[];
  required: boolean;
}

// Menu configuration for required fields
export interface MenuConfig {
  items: MenuItem[];
  required: Record<string, string[]>; // e.g., { "Sandwich": ["bread", "side"] }
  defaults: Record<string, string>; // e.g., { "bread": "wheat" }
}

// Output contract as specified by expert
export interface ConversationOutput {
  speak: string;
  state: ConversationState;
  request?: {
    slot: string;
    choices?: string[];
  };
  order_delta?: any[];
  confirmations?: {
    item?: string;
    order?: boolean;
  };
  actions?: ('quoteTotal' | 'placeOrder' | 'none')[];
  telemetry?: {
    asr_conf: number;
    turn_ms: number;
  };
}

// Current conversation context
export interface ConversationContext {
  state: ConversationState;
  currentItem?: any;
  requiredSlots: Map<string, RequiredSlot>;
  items: any[];
  turnCount: number;
  startTime: number;
  lastConfidence?: number;
  sessionMemory: Map<string, any>;
}

export class ConversationStateMachine {
  private context: ConversationContext;
  private menuConfig?: MenuConfig;
  private readonly MAX_WORDS = 12; // Expert recommendation: ≤12 words (±3)
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Expert recommendation

  constructor(menuConfig?: MenuConfig) {
    this.menuConfig = menuConfig;
    this.context = this.initializeContext();
  }

  private initializeContext(): ConversationContext {
    return {
      state: ConversationState.AWAIT_ORDER,
      requiredSlots: new Map(),
      items: [],
      turnCount: 0,
      startTime: Date.now(),
      sessionMemory: new Map()
    };
  }

  /**
   * Process user input and return structured output
   */
  public process(
    input: string,
    confidence: number = 1.0,
    extractedData?: any
  ): ConversationOutput {
    const startTime = Date.now();
    this.context.turnCount++;
    this.context.lastConfidence = confidence;

    // Check confidence threshold first
    if (confidence < this.CONFIDENCE_THRESHOLD) {
      return this.handleLowConfidence(input);
    }

    // Process based on current state
    let output: ConversationOutput;
    switch (this.context.state) {
      case ConversationState.AWAIT_ORDER:
        output = this.handleAwaitOrder(input, extractedData);
        break;
      case ConversationState.CAPTURE_ITEM:
        output = this.handleCaptureItem(input, extractedData);
        break;
      case ConversationState.CAPTURE_REQUIRED:
        output = this.handleCaptureRequired(input);
        break;
      case ConversationState.CONFIRM_ITEM:
        output = this.handleConfirmItem(input);
        break;
      case ConversationState.ADD_MORE:
        output = this.handleAddMore(input);
        break;
      case ConversationState.CHECKOUT_CONFIRM:
        output = this.handleCheckoutConfirm(input);
        break;
      case ConversationState.CLOSE:
        output = this.handleClose();
        break;
      default:
        output = this.createOutput('I didn\'t catch that. What would you like to order?');
    }

    // Add telemetry
    output.telemetry = {
      asr_conf: confidence,
      turn_ms: Date.now() - startTime
    };

    logger.debug('[StateMachine] Processed turn', {
      from: this.context.state,
      to: output.state,
      turnCount: this.context.turnCount,
      confidence
    });

    return output;
  }

  private handleAwaitOrder(input: string, extractedData?: any): ConversationOutput {
    if (!extractedData?.items?.length) {
      return this.createOutput(
        'What would you like to order today?',
        ConversationState.AWAIT_ORDER
      );
    }

    // Move to capture item
    this.context.currentItem = extractedData.items[0];
    this.context.state = ConversationState.CAPTURE_ITEM;
    return this.handleCaptureItem(input, extractedData);
  }

  private handleCaptureItem(input: string, extractedData?: any): ConversationOutput {
    const item = this.context.currentItem || extractedData?.items?.[0];

    if (!item) {
      this.context.state = ConversationState.AWAIT_ORDER;
      return this.createOutput('What would you like to order?');
    }

    // Check for required slots
    const requiredFields = this.getRequiredFields(item.name);
    const missingSlots = this.getMissingSlots(item, requiredFields);

    if (missingSlots.length > 0) {
      this.context.state = ConversationState.CAPTURE_REQUIRED;
      this.context.requiredSlots.clear();
      missingSlots.forEach(slot => {
        this.context.requiredSlots.set(slot.name, slot);
      });
      return this.askForRequiredSlot(missingSlots[0]);
    }

    // All slots filled, confirm item
    this.context.state = ConversationState.CONFIRM_ITEM;
    return this.confirmItem(item);
  }

  private handleCaptureRequired(input: string): ConversationOutput {
    // Process the answer for the required slot
    const pendingSlot = Array.from(this.context.requiredSlots.values())
      .find(s => !s.value);

    if (pendingSlot) {
      // Store the answer (with session memory)
      pendingSlot.value = input;
      this.context.sessionMemory.set(pendingSlot.name, input);

      // Check for more required slots
      const nextSlot = Array.from(this.context.requiredSlots.values())
        .find(s => !s.value);

      if (nextSlot) {
        return this.askForRequiredSlot(nextSlot);
      }
    }

    // All required slots filled, confirm item
    this.context.state = ConversationState.CONFIRM_ITEM;
    return this.confirmItem(this.context.currentItem);
  }

  private handleConfirmItem(input: string): ConversationOutput {
    // Implicit confirmation - just read back and continue
    const item = this.context.currentItem;
    this.context.items.push(item);
    this.context.state = ConversationState.ADD_MORE;

    const confirmation = this.generateItemConfirmation(item);
    return this.createOutput(
      `${confirmation}. Anything else?`,
      ConversationState.ADD_MORE,
      { confirmations: { item: confirmation } }
    );
  }

  private handleAddMore(input: string): ConversationOutput {
    const normalized = input.toLowerCase();

    if (normalized.includes('no') || normalized.includes('that\'s all')) {
      this.context.state = ConversationState.CHECKOUT_CONFIRM;
      return this.handleCheckoutConfirm(input);
    }

    // More items requested
    this.context.state = ConversationState.AWAIT_ORDER;
    this.context.currentItem = undefined;
    return this.createOutput('What else would you like?');
  }

  private handleCheckoutConfirm(input: string): ConversationOutput {
    // Generate full order summary
    const summary = this.generateOrderSummary();

    return this.createOutput(
      `${summary}. Ready to pay?`,
      ConversationState.CHECKOUT_CONFIRM,
      {
        confirmations: { order: true },
        actions: ['quoteTotal']
      }
    );
  }

  private handleClose(): ConversationOutput {
    return this.createOutput(
      'Thank you for your order!',
      ConversationState.CLOSE,
      { actions: ['placeOrder'] }
    );
  }

  private handleLowConfidence(input: string): ConversationOutput {
    // Binary clarifier as recommended
    return this.createOutput(
      `Did you say "${input}"?`,
      this.context.state,
      {
        request: {
          slot: 'confirmation',
          choices: ['yes', 'no']
        }
      }
    );
  }

  // Helper methods

  private getRequiredFields(itemName: string): string[] {
    if (!this.menuConfig?.required) return [];

    // Check for exact match or category match
    return this.menuConfig.required[itemName] || [];
  }

  private getMissingSlots(item: any, requiredFields: string[]): RequiredSlot[] {
    const missing: RequiredSlot[] = [];

    requiredFields.forEach(field => {
      if (!item[field]) {
        // Check session memory for defaults
        const sessionDefault = this.context.sessionMemory.get(field);
        const configDefault = this.menuConfig?.defaults?.[field];

        if (!sessionDefault && !configDefault) {
          missing.push({
            name: field,
            required: true,
            options: this.getFieldOptions(field)
          });
        } else {
          // Use default silently
          item[field] = sessionDefault || configDefault;
        }
      }
    });

    return missing;
  }

  private getFieldOptions(field: string): string[] {
    // Return available options for the field
    switch (field) {
      case 'bread':
        return ['white', 'wheat', 'sourdough'];
      case 'side':
        return ['fries', 'salad', 'soup'];
      case 'dressing':
        return ['ranch', 'italian', 'balsamic'];
      default:
        return [];
    }
  }

  private askForRequiredSlot(slot: RequiredSlot): ConversationOutput {
    // Progressive disclosure - max 2-3 options
    const options = slot.options?.slice(0, 3);
    const optionsText = options?.length
      ? options.join(', ') + '?'
      : `for your ${slot.name}?`;

    return this.createOutput(
      `Which ${optionsText}`,
      ConversationState.CAPTURE_REQUIRED,
      {
        request: {
          slot: slot.name,
          choices: options
        }
      }
    );
  }

  private generateItemConfirmation(item: any): string {
    // Keep under 12 words
    const mods = item.modifications?.join(', ') || '';
    const base = `${item.quantity || 1} ${item.name}`;
    return mods ? `${base} with ${mods}` : base;
  }

  private generateOrderSummary(): string {
    // Concise summary under word limit
    const itemCount = this.context.items.reduce((sum, item) =>
      sum + (item.quantity || 1), 0);

    return `${itemCount} item${itemCount > 1 ? 's' : ''}`;
  }

  private createOutput(
    speak: string,
    state: ConversationState = this.context.state,
    extras: Partial<ConversationOutput> = {}
  ): ConversationOutput {
    // Ensure speak text is within word limit
    const words = speak.split(' ');
    if (words.length > this.MAX_WORDS + 3) {
      speak = words.slice(0, this.MAX_WORDS).join(' ') + '...';
    }

    return {
      speak,
      state,
      ...extras
    };
  }

  // Public methods for external control

  public reset(): void {
    this.context = this.initializeContext();
  }

  public updateMenuConfig(config: MenuConfig): void {
    this.menuConfig = config;
  }

  public getContext(): ConversationContext {
    return { ...this.context };
  }

  public setState(state: ConversationState): void {
    this.context.state = state;
  }

  public getMetrics() {
    const duration = Date.now() - this.context.startTime;
    const turnsPerItem = this.context.items.length > 0
      ? this.context.turnCount / this.context.items.length
      : 0;

    return {
      turnCount: this.context.turnCount,
      itemCount: this.context.items.length,
      turnsPerItem,
      duration,
      averageConfidence: this.context.lastConfidence || 0
    };
  }
}