/**
 * Order Natural Language Processing interface
 */

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  modifiers?: string[];
}

export interface ParsedOrder {
  items: Array<{
    itemId: string;
    quantity: number;
    modifiers?: string[];
    specialInstructions?: string;
  }>;
  customerName?: string;
  notes?: string;
  confidence: number;
}

export interface OrderNLP {
  parse(request: { restaurantId: string; text: string }): Promise<any>;
  parseOrder(text: string, menu: MenuItem[]): Promise<ParsedOrder>;
  generateOrderSummary(order: ParsedOrder, menu: MenuItem[]): string;
}