import { z } from 'zod';

export const OrderItem = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().max(200).optional(),
});

export const OrderPayload = z.object({
  tableNumber: z.number().int().nonnegative().optional(),
  customerName: z.string().min(1).max(100).optional(),
  type: z.enum(['dine_in','takeout','delivery']),
  items: z.array(OrderItem).min(1),
});
export type OrderPayloadT = z.infer<typeof OrderPayload>;
