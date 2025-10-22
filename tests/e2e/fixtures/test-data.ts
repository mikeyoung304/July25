/**
 * Test Data for E2E Tests
 * Part of: Production Launch Preparation - Work Stream 1
 */

export const TEST_MENU_ITEMS = {
  burger: {
    name: 'Classic Burger',
    price: 12.99,
    category: 'Entrees',
  },
  fries: {
    name: 'French Fries',
    price: 4.99,
    category: 'Sides',
  },
  soda: {
    name: 'Soft Drink',
    price: 2.99,
    category: 'Beverages',
  },
} as const;

export const TEST_TABLES = {
  table1: {
    label: 'T1',
    id: 'test-table-001',
  },
  table2: {
    label: 'T2',
    id: 'test-table-002',
  },
} as const;

export const TEST_ORDERS = {
  simple: {
    items: [
      { ...TEST_MENU_ITEMS.burger, quantity: 1 },
      { ...TEST_MENU_ITEMS.fries, quantity: 1 },
    ],
    expectedTotal: 17.98, // Before tax
  },
  combo: {
    items: [
      { ...TEST_MENU_ITEMS.burger, quantity: 2 },
      { ...TEST_MENU_ITEMS.fries, quantity: 2 },
      { ...TEST_MENU_ITEMS.soda, quantity: 2 },
    ],
    expectedTotal: 39.96, // Before tax
  },
} as const;

export const TEST_PAYMENT = {
  cardNumber: '4111111111111111', // Test card (Square sandbox)
  cvv: '123',
  expiry: '12/25',
  zip: '12345',
} as const;

export const TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'; // Default from .env
