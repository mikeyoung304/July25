import { z } from "zod";
export declare const ParsedOrderItem: z.ZodObject<{
    menuItemId: z.ZodString;
    quantity: z.ZodNumber;
    modifications: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    specialInstructions: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    menuItemId: string;
    quantity: number;
    modifications: string[];
    specialInstructions?: string | undefined;
}, {
    menuItemId: string;
    quantity: number;
    modifications?: string[] | undefined;
    specialInstructions?: string | undefined;
}>;
export declare const ParsedOrderSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        menuItemId: z.ZodString;
        quantity: z.ZodNumber;
        modifications: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        specialInstructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        menuItemId: string;
        quantity: number;
        modifications: string[];
        specialInstructions?: string | undefined;
    }, {
        menuItemId: string;
        quantity: number;
        modifications?: string[] | undefined;
        specialInstructions?: string | undefined;
    }>, "many">;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        menuItemId: string;
        quantity: number;
        modifications: string[];
        specialInstructions?: string | undefined;
    }[];
    notes?: string | undefined;
}, {
    items: {
        menuItemId: string;
        quantity: number;
        modifications?: string[] | undefined;
        specialInstructions?: string | undefined;
    }[];
    notes?: string | undefined;
}>;
export type ParsedOrder = z.infer<typeof ParsedOrderSchema>;
//# sourceMappingURL=orders.d.ts.map