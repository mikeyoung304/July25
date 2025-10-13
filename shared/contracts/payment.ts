import { z } from 'zod';

// ADR-001: Full snake_case convention across all layers
export const PaymentPayload = z.object({
  order_id: z.string().min(1),
  token: z.string().min(1),
  amount: z.number().positive().optional(), // Client may send but server will recalculate
  idempotency_key: z.string().min(10).optional(), // Server will generate if not provided
  verification_token: z.string().optional()
});

export type PaymentPayloadT = z.infer<typeof PaymentPayload>;
