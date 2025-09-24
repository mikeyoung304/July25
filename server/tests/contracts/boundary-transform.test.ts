/**
 * Boundary Transform Contract Tests
 * Ensures server responses are consistently transformed to camelCase
 * Part of the contracts alignment initiative
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { responseTransformMiddleware, transformWebSocketMessage } from '../../src/middleware/responseTransform';
import { camelizeKeys } from '../../src/utils/case';

describe('Boundary Transform Contract', () => {
  let app: Express;

  beforeAll(() => {
    // Create a test Express app with transform middleware
    app = express();
    app.use(express.json());
    app.use(responseTransformMiddleware);

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
    it('should transform order response from snake_case to camelCase', async () => {
      const response = await request(app)
        .get('/api/test/order')
        .expect(200);

      // Verify camelCase transformation
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body).toHaveProperty('restaurantId');
      expect(response.body).toHaveProperty('customerName');
      expect(response.body).toHaveProperty('tableNumber');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('paymentStatus');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify snake_case keys are removed
      expect(response.body).not.toHaveProperty('order_number');
      expect(response.body).not.toHaveProperty('restaurant_id');
      expect(response.body).not.toHaveProperty('customer_name');
      expect(response.body).not.toHaveProperty('table_number');
      expect(response.body).not.toHaveProperty('total_amount');
      expect(response.body).not.toHaveProperty('payment_status');
      expect(response.body).not.toHaveProperty('created_at');
      expect(response.body).not.toHaveProperty('updated_at');

      // Verify nested items transformation
      expect(response.body.items[0]).toHaveProperty('menuItemId');
      expect(response.body.items[0]).toHaveProperty('unitPrice');
      expect(response.body.items[0]).toHaveProperty('specialInstructions');
      expect(response.body.items[0]).not.toHaveProperty('menu_item_id');
      expect(response.body.items[0]).not.toHaveProperty('unit_price');
      expect(response.body.items[0]).not.toHaveProperty('special_instructions');
    });

    it('should transform menu response array from snake_case to camelCase', async () => {
      const response = await request(app)
        .get('/api/test/menu')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('restaurantId');
      expect(response.body[0]).toHaveProperty('itemName');
      expect(response.body[0]).toHaveProperty('itemPrice');
      expect(response.body[0]).toHaveProperty('isAvailable');
      expect(response.body[0]).toHaveProperty('preparationTime');
      expect(response.body[0]).toHaveProperty('createdAt');

      expect(response.body[0]).not.toHaveProperty('restaurant_id');
      expect(response.body[0]).not.toHaveProperty('item_name');
      expect(response.body[0]).not.toHaveProperty('item_price');
      expect(response.body[0]).not.toHaveProperty('is_available');
      expect(response.body[0]).not.toHaveProperty('preparation_time');
      expect(response.body[0]).not.toHaveProperty('created_at');
    });

    it('should transform table response from snake_case to camelCase', async () => {
      const response = await request(app)
        .get('/api/test/table')
        .expect(200);

      expect(response.body).toHaveProperty('restaurantId');
      expect(response.body).toHaveProperty('tableNumber');
      expect(response.body).toHaveProperty('seatCapacity');
      expect(response.body).toHaveProperty('isOccupied');
      expect(response.body).toHaveProperty('xPosition');
      expect(response.body).toHaveProperty('yPosition');

      expect(response.body).not.toHaveProperty('restaurant_id');
      expect(response.body).not.toHaveProperty('table_number');
      expect(response.body).not.toHaveProperty('seat_capacity');
      expect(response.body).not.toHaveProperty('is_occupied');
      expect(response.body).not.toHaveProperty('x_position');
      expect(response.body).not.toHaveProperty('y_position');
    });

    it('should skip transformation for auth endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200);

      // Auth endpoints keep snake_case for compatibility
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user_id');

      // Should NOT be transformed
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('userId');
    });
  });

  describe('WebSocket Message Transformation', () => {
    it('should transform order:created event payload', () => {
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
      expect(transformed.payload).toHaveProperty('orderId');
      expect(transformed.payload).toHaveProperty('orderNumber');
      expect(transformed.payload).toHaveProperty('restaurantId');
      expect(transformed.payload).toHaveProperty('totalAmount');
      expect(transformed.payload).toHaveProperty('orderItems');

      expect(transformed.payload.orderItems[0]).toHaveProperty('itemId');
      expect(transformed.payload.orderItems[0]).toHaveProperty('menuItemId');
      expect(transformed.payload.orderItems[0]).toHaveProperty('unitPrice');
    });

    it('should transform table:updated event payload', () => {
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
      expect(transformed.payload).toHaveProperty('tableId');
      expect(transformed.payload).toHaveProperty('tableNumber');
      expect(transformed.payload).toHaveProperty('isOccupied');
      expect(transformed.payload).toHaveProperty('currentOrderId');

      expect(transformed.payload).not.toHaveProperty('table_id');
      expect(transformed.payload).not.toHaveProperty('table_number');
      expect(transformed.payload).not.toHaveProperty('is_occupied');
      expect(transformed.payload).not.toHaveProperty('current_order_id');
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

  describe('Transform Utility Performance', () => {
    it('should transform deeply nested objects efficiently', () => {
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
      const transformed = camelizeKeys(deepObject);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to ms

      // Should transform in under 1ms for this small object
      expect(duration).toBeLessThan(1);

      // Verify transformation
      expect(transformed).toHaveProperty('levelOne');
      expect(transformed.levelOne).toHaveProperty('levelTwo');
      expect(transformed.levelOne.levelTwo).toHaveProperty('levelThree');
      expect(transformed.levelOne.levelTwo.levelThree).toHaveProperty('deepProperty');
      expect(transformed.levelOne.levelTwo.levelThree).toHaveProperty('deepArray');
      expect(transformed.levelOne.levelTwo.levelThree.deepArray[0]).toHaveProperty('arrayItemOne');
      expect(transformed.levelOne.levelTwo.levelThree.deepArray[1]).toHaveProperty('arrayItemTwo');
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
      const transformed = camelizeKeys(largeArray);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to ms

      // Should transform in under 5ms for 100 items
      expect(duration).toBeLessThan(5);

      // Verify first and last items
      expect(transformed[0]).toHaveProperty('itemId');
      expect(transformed[0]).toHaveProperty('itemName');
      expect(transformed[0]).toHaveProperty('itemPrice');
      expect(transformed[99]).toHaveProperty('itemId');
      expect(transformed[99]).toHaveProperty('isAvailable');
    });
  });
});