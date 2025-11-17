/**
 * Runtime Type Validation for API Boundaries
 * Provides Zod schemas and validation utilities for enterprise-grade type safety
 *
 * ENTERPRISE FEATURES:
 * - Runtime type validation
 * - Structured error reporting
 * - Input sanitization
 * - Type coercion with validation
 * - Security-focused validation
 */
import { z } from 'zod';
export declare class ValidationError extends Error {
    readonly field?: string | undefined;
    readonly code?: string | undefined;
    readonly details?: Record<string, string[]> | undefined;
    constructor(message: string, field?: string | undefined, code?: string | undefined, details?: Record<string, string[]> | undefined);
}
export declare const CommonSchemas: {
    readonly uuid: z.ZodString;
    readonly email: z.ZodString;
    readonly phone: z.ZodOptional<z.ZodString>;
    readonly url: z.ZodOptional<z.ZodString>;
    readonly restaurantId: z.ZodString;
    readonly tableNumber: z.ZodString | z.ZodOptional<z.ZodString>;
    readonly orderNumber: z.ZodString | z.ZodOptional<z.ZodString>;
    readonly price: z.ZodEffects<z.ZodNumber, number, number>;
    readonly quantity: z.ZodNumber;
    readonly percentage: z.ZodNumber;
    readonly dateString: z.ZodString;
    readonly futureDate: z.ZodEffects<z.ZodString, string, string>;
    readonly coordinate: z.ZodNumber;
    readonly zIndex: z.ZodNumber;
    readonly orderStatus: z.ZodEnum<["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]>;
    readonly orderType: z.ZodEnum<["dine-in", "takeout", "delivery"]>;
    readonly paymentStatus: z.ZodEnum<["pending", "processing", "completed", "failed", "refunded"]>;
    readonly tableStatus: z.ZodEnum<["available", "occupied", "reserved", "cleaning"]>;
    readonly tableShape: z.ZodEnum<["rectangle", "square", "round", "circle", "chip_monkey"]>;
    readonly safeHtml: z.ZodEffects<z.ZodString, string, string>;
    readonly pageNumber: z.ZodDefault<z.ZodNumber>;
    readonly pageSize: z.ZodDefault<z.ZodNumber>;
    readonly sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
};
export declare const OrderSchemas: any;
export declare const TableSchemas: any;
export declare const ApiSchemas: {
    readonly apiResponse: <T extends z.ZodType<any, z.ZodTypeDef, any>>(dataSchema: T) => z.ZodObject<{
        success: z.ZodBoolean;
        data: z.ZodOptional<T>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodEnum<["VALIDATION_ERROR", "NOT_FOUND", "SERVER_ERROR", "UNAUTHORIZED", "FORBIDDEN", "CONFLICT", "RATE_LIMITED"]>;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
        success: z.ZodBoolean;
        data: z.ZodOptional<T>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodEnum<["VALIDATION_ERROR", "NOT_FOUND", "SERVER_ERROR", "UNAUTHORIZED", "FORBIDDEN", "CONFLICT", "RATE_LIMITED"]>;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }>>;
    }>, any> extends infer T_1 ? { [k in keyof T_1]: z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
        success: z.ZodBoolean;
        data: z.ZodOptional<T>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodEnum<["VALIDATION_ERROR", "NOT_FOUND", "SERVER_ERROR", "UNAUTHORIZED", "FORBIDDEN", "CONFLICT", "RATE_LIMITED"]>;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }>>;
    }>, any>[k]; } : never, z.baseObjectInputType<{
        success: z.ZodBoolean;
        data: z.ZodOptional<T>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodEnum<["VALIDATION_ERROR", "NOT_FOUND", "SERVER_ERROR", "UNAUTHORIZED", "FORBIDDEN", "CONFLICT", "RATE_LIMITED"]>;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }>>;
    }> extends infer T_2 ? { [k_1 in keyof T_2]: z.baseObjectInputType<{
        success: z.ZodBoolean;
        data: z.ZodOptional<T>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodEnum<["VALIDATION_ERROR", "NOT_FOUND", "SERVER_ERROR", "UNAUTHORIZED", "FORBIDDEN", "CONFLICT", "RATE_LIMITED"]>;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }, {
            code: "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED";
            message: string;
            details?: Record<string, string[]> | undefined;
        }>>;
    }>[k_1]; } : never>;
    readonly paginatedResponse: <T_3 extends z.ZodType<any, z.ZodTypeDef, any>>(dataSchema: T_3) => z.ZodObject<{
        data: z.ZodArray<T_3, "many">;
        total: z.ZodNumber;
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        total_pages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        data: T_3["_output"][];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    }, {
        data: T_3["_input"][];
        total: number;
        total_pages: number;
        page?: number | undefined;
        limit?: number | undefined;
    }>;
    readonly paginationParams: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sort_by: z.ZodOptional<z.ZodString>;
        sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sort_order: "asc" | "desc";
        sort_by?: string | undefined;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
        sort_by?: string | undefined;
        sort_order?: "asc" | "desc" | undefined;
    }>;
};
export declare class TypeValidator {
    /**
     * Safely parse and validate data against a schema
     */
    static safeParse<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): {
        success: true;
        data: T;
    } | {
        success: false;
        error: ValidationError;
    };
    /**
     * Parse and validate data, throwing on error
     */
    static parse<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T;
    /**
     * Create a validation middleware for Express routes
     */
    static createMiddleware<T>(schema: z.ZodSchema<T>, target?: 'body' | 'params' | 'query'): (req: any, res: any, next: any) => any;
}
export declare const Schemas: any;
export type InferSchemaType<T extends z.ZodType> = z.infer<T>;
export type ValidatedOrder = InferSchemaType<typeof OrderSchemas.order>;
export type ValidatedOrderItem = InferSchemaType<typeof OrderSchemas.orderItem>;
export type ValidatedTable = InferSchemaType<typeof TableSchemas.table>;
export type ValidatedCreateOrderRequest = InferSchemaType<typeof OrderSchemas.createOrderRequest>;
export type ValidatedCreateTableRequest = InferSchemaType<typeof TableSchemas.createTableRequest>;
//# sourceMappingURL=validation.d.ts.map