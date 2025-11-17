import { z } from 'zod';
export declare const PaymentPayload: z.ZodObject<{
    order_id: z.ZodString;
    token: z.ZodString;
    amount: z.ZodOptional<z.ZodNumber>;
    idempotency_key: z.ZodOptional<z.ZodString>;
    verification_token: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    token: string;
    order_id: string;
    amount?: number | undefined;
    idempotency_key?: string | undefined;
    verification_token?: string | undefined;
}, {
    token: string;
    order_id: string;
    amount?: number | undefined;
    idempotency_key?: string | undefined;
    verification_token?: string | undefined;
}>;
export type PaymentPayloadT = z.infer<typeof PaymentPayload>;
export declare const CashPaymentPayload: z.ZodObject<{
    order_id: z.ZodString;
    amount_received: z.ZodNumber;
    table_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    order_id: string;
    amount_received: number;
    table_id?: string | undefined;
}, {
    order_id: string;
    amount_received: number;
    table_id?: string | undefined;
}>;
export type CashPaymentPayloadT = z.infer<typeof CashPaymentPayload>;
//# sourceMappingURL=payment.d.ts.map