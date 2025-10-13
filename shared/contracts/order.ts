import { z } from 'zod';

// Order item schema - matches OrdersService.OrderItem interface
// Accepts snake_case fields per ADR-001 (full snake_case convention)
export const OrderItem = z.object({
  id: z.string().optional(), // Menu item UUID or external ID
  item_id: z.string().optional(), // Alternative field name
  menu_item_id: z.string().optional(), // Legacy field name
  name: z.string().min(1), // Item name
  quantity: z.number().int().positive(), // Quantity ordered
  price: z.number().nonnegative(), // Item price
  modifiers: z.array(z.any()).optional(), // Item modifiers/customizations
  modifications: z.array(z.any()).optional(), // Alternative field name
  notes: z.string().max(500).optional(), // Order notes
  special_instructions: z.string().max(500).optional(), // Alternative field name
  specialInstructions: z.string().max(500).optional(), // camelCase variant
});

// Order payload schema - matches OrdersService.CreateOrderRequest interface
// Expanded to match all types and fields the service layer accepts
export const OrderPayload = z.object({
  // Order type - all valid types from service layer type mapping
  type: z.enum([
    'online', 'kiosk', 'voice', 'drive-thru',
    'dine-in', 'dine_in', 'takeout', 'delivery', 'pickup'
  ]).optional(),

  // Order items (required, min 1)
  items: z.array(OrderItem).min(1),

  // Customer information (all optional)
  customer_name: z.string().min(1).max(100).optional(),
  customerName: z.string().min(1).max(100).optional(), // camelCase variant
  customer_email: z.string().email().optional(),
  customerEmail: z.string().email().optional(), // camelCase variant
  customer_phone: z.string().optional(),
  customerPhone: z.string().optional(), // camelCase variant

  // Table/location info
  table_number: z.union([z.string(), z.number()]).optional(),
  tableNumber: z.union([z.string(), z.number()]).optional(), // camelCase variant

  // Order notes
  notes: z.string().max(1000).optional(),

  // Pricing (all optional - server calculates if not provided)
  subtotal: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  tip: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative().optional(), // camelCase variant

  // Flexible metadata
  metadata: z.record(z.any()).optional(),
});

export type OrderPayloadT = z.infer<typeof OrderPayload>;
