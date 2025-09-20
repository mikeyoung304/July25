import { z } from 'zod';
export const PaymentPayload = z.object({
  orderId: z.string().min(1),
  method: z.enum(['card','terminal']),
  idempotencyKey: z.string().min(10),
});
export type PaymentPayloadT = z.infer<typeof PaymentPayload>;
