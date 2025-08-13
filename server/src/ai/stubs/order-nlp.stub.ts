/**
 * Stub implementation of OrderNLP for development/testing
 */

import { OrderNLP, MenuItem, ParsedOrder } from '../core/order-nlp';

export class OrderNLPStub implements OrderNLP {
  async parse(request: { restaurantId: string; text: string }): Promise<any> {
    return {
      items: [],
      notes: `Stub parsed: "${request.text}" for restaurant ${request.restaurantId}`
    };
  }

  async parseOrder(_text: string, _menu: MenuItem[]): Promise<ParsedOrder> {
    // Stub implementation - returns mock parsed order
    return {
      items: [
        {
          itemId: '401',
          quantity: 1,
          modifiers: ['extra cheese'],
          specialInstructions: 'Well done'
        }
      ],
      customerName: 'Test Customer',
      notes: 'For pickup',
      confidence: 0.85
    };
  }

  generateOrderSummary(order: ParsedOrder, _menu: MenuItem[]): string {
    return `Order Summary: ${order.items.length} item(s) for ${order.customerName || 'Guest'}`;
  }
}