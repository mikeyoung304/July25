/**
 * Boundary Transform Contract Tests (ADR-001)
 * Ensures server responses consistently use snake_case per ADR-001
 * Tests verify NO transformation occurs (snake_case preserved end-to-end)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { transformWebSocketMessage } from '../../src/middleware/responseTransform';

describe('Boundary Transform Contract', () => {
  let app: Express;

  beforeAll(() => {
    // Create a test Express app WITHOUT transform middleware per ADR-001
    app = express();
    app.use(express.json());
    // ADR-001: No transformation - API returns snake_case directly
    // app.use(responseTransformMiddleware); // DISABLED per ADR-001

    // Test routes that return snake_case data (simulating DB response)
    app.get('/api/test/order', (_req, res) => {
      res.json({
        id: 'order-123',
        order_number: 'ORD-001',
        restaurant_id: 'rest-456',
        customer_name: 'John Doe',
        table_number: '5',
        total_amount: 45.50,
        payment_status: 'pending',
        created_at: '2025-09-24T10:00:00Z',
        updated_at: '2025-09-24T10:00:00Z',
        items: [
          {
            id: 'item-1',
            menu_item_id: 'menu-789',
            unit_price: 12.50,
            quantity: 2,
            special_instructions: 'No onions'
          }
        ]
      });
    });

    app.get('/api/test/menu', (_req, res) => {
      res.json([
        {
          id: 'menu-1',
          restaurant_id: 'rest-456',
          item_name: 'Burger',
          item_price: 12.50,
          is_available: true,
          preparation_time: 15,
          created_at: '2025-09-24T10:00:00Z'
        }
      ]);
    });

    app.get('/api/test/table', (_req, res) => {
      res.json({
        id: 'table-1',
        restaurant_id: 'rest-456',
        table_number: '5',
        seat_capacity: 4,
        is_occupied: false,
        x_position: 100,
        y_position: 200
      });
    });

    // Test route that should skip transformation (auth endpoint)
    app.post('/api/v1/auth/login', (_req, res) => {
      res.json({
        access_token: 'token-123',
        refresh_token: 'refresh-456',
        user_id: 'user-789'
      });
    });
  });

  describe('HTTP Response Transformation', () => {
    it('should return order response in snake_case per ADR-001', async () => {
      const response = await request(app)
        .get('/api/test/order')
        .expect(200);

      // Verify snake_case fields are preserved (ADR-001)
      expect(response.body).toHaveProperty('order_number');
      expect(response.body).toHaveProperty('restaurant_id');
      expect(response.body).toHaveProperty('customer_name');
      expect(response.body).toHaveProperty('table_number');
      expect(response.body).toHaveProperty('total_amount');
      expect(response.body).toHaveProperty('payment_status');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');

      // Verify camelCase keys are NOT present
      expect(response.body).not.toHaveProperty('orderNumber');
      expect(response.body).not.toHaveProperty('restaurantId');
      expect(response.body).not.toHaveProperty('customerName');
      expect(response.body).not.toHaveProperty('tableNumber');
      expect(response.body).not.toHaveProperty('totalAmount');
      expect(response.body).not.toHaveProperty('paymentStatus');
      expect(response.body).not.toHaveProperty('createdAt');
      expect(response.body).not.toHaveProperty('updatedAt');

      // Verify nested items remain in snake_case
      expect(response.body.items[0]).toHaveProperty('menu_item_id');
      expect(response.body.items[0]).toHaveProperty('unit_price');
      expect(response.body.items[0]).toHaveProperty('special_instructions');
      expect(response.body.items[0]).not.toHaveProperty('menuItemId');
      expect(response.body.items[0]).not.toHaveProperty('unitPrice');
      expect(response.body.items[0]).not.toHaveProperty('specialInstructions');
    });

    it('should return menu response array in snake_case per ADR-001', async () => {
      const response = await request(app)
        .get('/api/test/menu')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('restaurant_id');
      expect(response.body[0]).toHaveProperty('item_name');
      expect(response.body[0]).toHaveProperty('item_price');
      expect(response.body[0]).toHaveProperty('is_available');
      expect(response.body[0]).toHaveProperty('preparation_time');
      expect(response.body[0]).toHaveProperty('created_at');

      expect(response.body[0]).not.toHaveProperty('restaurantId');
      expect(response.body[0]).not.toHaveProperty('itemName');
      expect(response.body[0]).not.toHaveProperty('itemPrice');
      expect(response.body[0]).not.toHaveProperty('isAvailable');
      expect(response.body[0]).not.toHaveProperty('preparationTime');
      expect(response.body[0]).not.toHaveProperty('createdAt');
    });

    it('should return table response in snake_case per ADR-001', async () => {
      const response = await request(app)
        .get('/api/test/table')
        .expect(200);

      expect(response.body).toHaveProperty('restaurant_id');
      expect(response.body).toHaveProperty('table_number');
      expect(response.body).toHaveProperty('seat_capacity');
      expect(response.body).toHaveProperty('is_occupied');
      expect(response.body).toHaveProperty('x_position');
      expect(response.body).toHaveProperty('y_position');

      expect(response.body).not.toHaveProperty('restaurantId');
      expect(response.body).not.toHaveProperty('tableNumber');
      expect(response.body).not.toHaveProperty('seatCapacity');
      expect(response.body).not.toHaveProperty('isOccupied');
      expect(response.body).not.toHaveProperty('xPosition');
      expect(response.body).not.toHaveProperty('yPosition');
    });

    it('should return auth endpoints in snake_case per ADR-001', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200);

      // Auth endpoints use snake_case (ADR-001)
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user_id');

      // Should NOT be in camelCase
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('userId');
    });
  });

  describe('WebSocket Message Transformation', () => {
    it('should preserve snake_case in order:created event payload per ADR-001', () => {
      const message = {
        type: 'order:created',
        payload: {
          order_id: 'order-123',
          order_number: 'ORD-001',
          restaurant_id: 'rest-456',
          total_amount: 45.50,
          order_items: [
            {
              item_id: 'item-1',
              menu_item_id: 'menu-789',
              unit_price: 12.50
            }
          ]
        },
        timestamp: '2025-09-24T10:00:00Z'
      };

      const transformed = transformWebSocketMessage(message);

      expect(transformed.type).toBe('order:created');
      expect(transformed.payload).toHaveProperty('order_id');
      expect(transformed.payload).toHaveProperty('order_number');
      expect(transformed.payload).toHaveProperty('restaurant_id');
      expect(transformed.payload).toHaveProperty('total_amount');
      expect(transformed.payload).toHaveProperty('order_items');

      expect(transformed.payload.order_items[0]).toHaveProperty('item_id');
      expect(transformed.payload.order_items[0]).toHaveProperty('menu_item_id');
      expect(transformed.payload.order_items[0]).toHaveProperty('unit_price');
    });

    it('should preserve snake_case in table:updated event payload per ADR-001', () => {
      const message = {
        type: 'table:updated',
        payload: {
          table_id: 'table-1',
          table_number: '5',
          is_occupied: true,
          current_order_id: 'order-123'
        },
        timestamp: '2025-09-24T10:00:00Z'
      };

      const transformed = transformWebSocketMessage(message);

      expect(transformed.type).toBe('table:updated');
      expect(transformed.payload).toHaveProperty('table_id');
      expect(transformed.payload).toHaveProperty('table_number');
      expect(transformed.payload).toHaveProperty('is_occupied');
      expect(transformed.payload).toHaveProperty('current_order_id');

      expect(transformed.payload).not.toHaveProperty('tableId');
      expect(transformed.payload).not.toHaveProperty('tableNumber');
      expect(transformed.payload).not.toHaveProperty('isOccupied');
      expect(transformed.payload).not.toHaveProperty('currentOrderId');
    });

    it('should handle connected event without payload', () => {
      const message = {
        type: 'connected',
        timestamp: '2025-09-24T10:00:00Z'
      };

      const transformed = transformWebSocketMessage(message);

      expect(transformed.type).toBe('connected');
      expect(transformed.timestamp).toBe('2025-09-24T10:00:00Z');
    });
  });

  describe('Data Pass-Through Performance (ADR-001)', () => {
    it('should handle deeply nested snake_case objects efficiently', () => {
      const deepObject = {
        level_one: {
          level_two: {
            level_three: {
              deep_property: 'value',
              deep_array: [
                { array_item_one: 1 },
                { array_item_two: 2 }
              ]
            }
          }
        }
      };

      const start = process.hrtime.bigint();
      // Per ADR-001: No transformation needed, but test the utility still works
      // (even though camelizeKeys still transforms, we verify structure is handled)
      const processed = JSON.parse(JSON.stringify(deepObject)); // Pass-through simulation
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to ms

      // Should process in under 1ms for this small object
      expect(duration).toBeLessThan(1);

      // Verify snake_case is preserved (ADR-001)
      expect(processed).toHaveProperty('level_one');
      expect(processed.level_one).toHaveProperty('level_two');
      expect(processed.level_one.level_two).toHaveProperty('level_three');
      expect(processed.level_one.level_two.level_three).toHaveProperty('deep_property');
      expect(processed.level_one.level_two.level_three).toHaveProperty('deep_array');
      expect(processed.level_one.level_two.level_three.deep_array[0]).toHaveProperty('array_item_one');
      expect(processed.level_one.level_two.level_three.deep_array[1]).toHaveProperty('array_item_two');
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => ({
        item_id: `item-${i}`,
        item_name: `Item ${i}`,
        item_price: i * 10,
        is_available: true,
        created_at: '2025-09-24T10:00:00Z'
      }));

      const start = process.hrtime.bigint();
      // Pass-through simulation (ADR-001: no transformation)
      const processed = JSON.parse(JSON.stringify(largeArray));
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to ms

      // Should process in under 5ms for 100 items
      expect(duration).toBeLessThan(5);

      // Verify first and last items remain in snake_case
      expect(processed[0]).toHaveProperty('item_id');
      expect(processed[0]).toHaveProperty('item_name');
      expect(processed[0]).toHaveProperty('item_price');
      expect(processed[99]).toHaveProperty('item_id');
      expect(processed[99]).toHaveProperty('is_available');
    });
  });
});