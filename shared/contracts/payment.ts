import { z } from 'zod';

export const PaymentPayload = z.object({
  orderId: z.string().min(1),
  token: z.string().min(1),
  amount: z.number().positive().optional(), // Client may send but server will recalculate
  idempotencyKey: z.string().min(10).optional(), // Server will generate if not provided
  verificationToken: z.string().optional()
});

export type PaymentPayloadT = z.infer<typeof PaymentPayload>;
