"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsedOrderSchema = exports.ParsedOrderItem = void 0;
const zod_1 = require("zod");
exports.ParsedOrderItem = zod_1.z.object({
    menuItemId: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().min(1),
    modifications: zod_1.z.array(zod_1.z.string()).default([]),
    specialInstructions: zod_1.z.string().optional(),
});
exports.ParsedOrderSchema = zod_1.z.object({
    items: zod_1.z.array(exports.ParsedOrderItem).min(1),
    notes: zod_1.z.string().optional(),
});
