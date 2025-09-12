import { z } from 'zod';

/**
 * Order item modifier schema (camelCase)
 */
const ModifierSchema = z.object({
  name: z.string().min(1),
  price: z.number().optional().default(0)
});

/**
 * Order item schema (camelCase)
 */
const OrderItemSchema = z.object({
  id: z.string().min(1), // Menu item ID
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  modifiers: z.array(ModifierSchema).optional().default([]),
  notes: z.string().optional()
});

/**
 * Create order DTO schema (camelCase only)
 * This is the contract for POST /api/v1/orders
 */
export const CreateOrderDTOSchema = z.object({
  // Required fields
  items: z.array(OrderItemSchema).min(1, 'Order must contain at least one item'),
  subtotal: z.number().positive(),
  tax: z.number().nonnegative(),
  total: z.number().positive(),
  
  // Optional fields
  type: z.enum(['dine-in', 'takeout', 'delivery', 'pickup', 'kiosk', 'voice']).optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  tableNumber: z.string().optional(),
  notes: z.string().optional(),
  tip: z.number().nonnegative().optional().default(0),
  
  // Legacy field mapping (will be transformed)
  total_amount: z.number().optional() // Map to 'total' if present
});

/**
 * Transform legacy snake_case fields to camelCase
 * This handles backward compatibility during migration
 */
export function transformLegacyOrderPayload(payload: any): any {
  const transformed = { ...payload };
  
  // Map snake_case to camelCase
  const fieldMappings: Record<string, string> = {
    customer_name: 'customerName',
    customer_email: 'customerEmail',
    customer_phone: 'customerPhone',
    table_number: 'tableNumber',
    order_type: 'type',
    total_amount: 'total',
    menu_item_id: 'id',
    special_instructions: 'notes'
  };
  
  // Transform top-level fields
  Object.keys(fieldMappings).forEach(snakeKey => {
    if (snakeKey in transformed) {
      const camelKey = fieldMappings[snakeKey];
      transformed[camelKey] = transformed[snakeKey];
      delete transformed[snakeKey];
    }
  });
  
  // Transform items array
  if (transformed.items && Array.isArray(transformed.items)) {
    transformed.items = transformed.items.map((item: any) => {
      const transformedItem = { ...item };
      
      // Map item-level snake_case fields
      if ('menu_item_id' in transformedItem) {
        transformedItem.id = transformedItem.menu_item_id;
        delete transformedItem.menu_item_id;
      }
      
      if ('special_instructions' in transformedItem) {
        transformedItem.notes = transformedItem.special_instructions;
        delete transformedItem.special_instructions;
      }
      
      // Ensure modifiers are objects, not strings
      if (transformedItem.modifiers && Array.isArray(transformedItem.modifiers)) {
        transformedItem.modifiers = transformedItem.modifiers.map((mod: any) =>
          typeof mod === 'string' ? { name: mod, price: 0 } : mod
        );
      }
      
      // Handle modifications field (legacy)
      if (transformedItem.modifications && !transformedItem.modifiers) {
        transformedItem.modifiers = transformedItem.modifications.map((mod: any) =>
          typeof mod === 'string' ? { name: mod, price: 0 } : mod
        );
        delete transformedItem.modifications;
      }
      
      return transformedItem;
    });
  }
  
  return transformed;
}

/**
 * Validate and parse create order DTO
 * Returns parsed data or throws validation error
 */
export function validateCreateOrderDTO(data: unknown): z.infer<typeof CreateOrderDTOSchema> {
  // First transform any legacy fields
  const transformed = transformLegacyOrderPayload(data);
  
  // Then validate against schema
  return CreateOrderDTOSchema.parse(transformed);
}

/**
 * Update order status DTO schema
 */
export const UpdateOrderStatusDTOSchema = z.object({
  status: z.enum(['new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
  notes: z.string().optional()
});

/**
 * Type exports for use in services
 */
export type CreateOrderDTO = z.infer<typeof CreateOrderDTOSchema>;
export type OrderItemDTO = z.infer<typeof OrderItemSchema>;
export type ModifierDTO = z.infer<typeof ModifierSchema>;
export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusDTOSchema>;