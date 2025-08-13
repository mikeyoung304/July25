import { z } from "zod";

// Wire (server) shape — define minimally here or import shared if available
const WireItem = z.object({
  menu_item_id: z.string(),
  quantity: z.number().int(),
  modifications: z.array(z.string()).optional(),
  special_instructions: z.string().optional(),
});
export const WireOrder = z.object({ items: z.array(WireItem) });
export type WireOrder = z.infer<typeof WireOrder>;

// UI (client) shape
export type ClientItem = {
  menuItemId: string;
  quantity: number;
  modifications?: string[];
  specialInstructions?: string;
};
export type ClientOrder = { items: ClientItem[] };

export function toClientOrder(w: unknown): ClientOrder {
  const parsed = WireOrder.parse(w);
  return {
    items: parsed.items.map(i => ({
      menuItemId: i.menu_item_id,
      quantity: i.quantity,
      modifications: i.modifications ?? [],
      specialInstructions: i.special_instructions,
    })),
  };
}

export function toWireOrder(c: ClientOrder): WireOrder {
  return {
    items: c.items.map(i => ({
      menu_item_id: i.menuItemId,
      quantity: i.quantity,
      modifications: i.modifications,
      special_instructions: i.specialInstructions,
    })),
  } as WireOrder;
}

// Additional normalizers for common patterns
export function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
      result[camelKey] = snakeToCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export function camelToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
      result[snakeKey] = camelToSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}