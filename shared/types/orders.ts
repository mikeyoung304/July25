import { z } from "zod";

export const ParsedOrderItem = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  modifications: z.array(z.string()).default([]),
  specialInstructions: z.string().optional(),
});

export const ParsedOrderSchema = z.object({
  items: z.array(ParsedOrderItem).min(1),
  notes: z.string().optional(),
});

export type ParsedOrder = z.infer<typeof ParsedOrderSchema>;