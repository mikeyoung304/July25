import OpenAI from "openai";
import { z } from "zod";
import { OrderNLP } from "../../core/order-nlp";
import { OrderMatchingService } from "../../../services/OrderMatchingService";
import { withTimeout, retry } from "./utils";

// Match the types from OrderMatchingService
type DraftItem = { name: string; quantity: number; modifications?: string[]; specialInstructions?: string };
type DraftOrder = { items: DraftItem[]; notes?: string };

const DraftSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().min(1),
    modifications: z.array(z.string()).optional(),
    specialInstructions: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
});

export class OpenAIOrderNLP implements OrderNLP {
  constructor(private client: OpenAI, private match: OrderMatchingService) {}

  async parse({ restaurantId, text }: { restaurantId: string; text: string }) {
    const sys = { role: "system" as const, content:
      "Extract a restaurant order as JSON: items[] (name, quantity, modifications[], specialInstructions), optional notes. No prices or IDs." };

    const call = async () => {
      const r = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [sys, { role: "user", content: text }],
      });
      const content = r.choices[0]?.message?.content ?? "{}";
      
      // Parse and fix the draft to ensure it matches the schema
      const parsed = JSON.parse(content);
      const draft: DraftOrder = {
        items: (parsed.items || []).map((item: any) => {
          const draftItem: DraftItem = {
            name: item.name || '',
            quantity: item.quantity || 1
          };
          if (item.modifications) draftItem.modifications = item.modifications;
          if (item.specialInstructions) draftItem.specialInstructions = item.specialInstructions;
          return draftItem;
        })
      };
      if (parsed.notes) draft.notes = parsed.notes;
      
      const validated = DraftSchema.parse(draft);
      const candidates = await this.match.findMenuMatches(restaurantId, validated as DraftOrder);
      return this.match.toCanonicalIds(restaurantId, candidates);
    };

    try { return await withTimeout(retry(call, 1), 15_000); }
    catch { return { items: [], notes: `unparsed: ${text}` }; }
  }

  // Legacy OrderNLP interface methods
  async parseOrder(text: string, _menu: any[]): Promise<any> {
    // This is a simplified version for backward compatibility
    // It doesn't use the matching service but provides similar structure
    const sys = { role: "system" as const, content:
      "Extract a restaurant order as JSON: items[] (itemId, quantity, modifiers[], specialInstructions), customerName, notes, confidence." };

    try {
      const r = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [sys, { role: "user", content: text }],
      });
      const content = r.choices[0]?.message?.content ?? "{}";
      return JSON.parse(content);
    } catch {
      return {
        items: [],
        customerName: "",
        notes: `unparsed: ${text}`,
        confidence: 0
      };
    }
  }

  generateOrderSummary(order: any, menu: any[]): string {
    if (!order?.items?.length) return "No items in order";
    
    const itemNames = order.items.map((item: any) => {
      const menuItem = menu.find(m => m.id === item.itemId);
      const name = menuItem?.name || `Item ${item.itemId}`;
      return `${item.quantity}x ${name}`;
    });
    
    return `Order: ${itemNames.join(', ')}${order.notes ? ` (${order.notes})` : ''}`;
  }
}