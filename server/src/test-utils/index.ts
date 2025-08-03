import { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';
// import type { Database } from '../types/supabase'; // Type not currently used

// Mock request object
export const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  const req = {
    body: {},
    query: {},
    params: {},
    headers: {},
    get: vi.fn((name: string) => req.headers[name.toLowerCase()]),
    ...overrides,
  } as unknown as Request;
  
  return req;
};

// Mock response object
export const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  res.locals = {};
  
  return res;
};

// Mock next function
export const createMockNext = (): NextFunction => {
  return vi.fn(() => {}) as unknown as NextFunction;
};

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
    limit: mockLimit,
  }));
  
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  };
  
  return {
    from: mockFrom,
    auth: mockAuth,
    // Expose mocks for assertions
    mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
      limit: mockLimit,
    },
  };
};

// Mock WebSocket
export const createMockWebSocket = () => {
  return {
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    emit: vi.fn(),
    ping: vi.fn(),
    terminate: vi.fn(),
    readyState: 1, // OPEN
  };
};

// Test data factories
export const testData = {
  order: (overrides = {}) => ({
    id: 'test-order-id',
    restaurant_id: 'test-restaurant-id',
    order_number: 'ORD-001',
    type: 'dine-in',
    status: 'pending',
    customer_name: 'Test Customer',
    items: [
      {
        id: 'item-1',
        menu_item_id: 'menu-1',
        name: 'Test Item',
        quantity: 1,
        price: 10.00,
        modifiers: [],
      },
    ],
    subtotal: 10.00,
    tax: 0.80,
    total: 10.80,
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),
  
  menuItem: (overrides = {}) => ({
    id: 'test-menu-item-id',
    restaurant_id: 'test-restaurant-id',
    category_id: 'test-category-id',
    name: 'Test Menu Item',
    description: 'A test menu item',
    price: 10.00,
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),
  
  table: (overrides = {}) => ({
    id: 'test-table-id',
    restaurant_id: 'test-restaurant-id',
    table_number: '5',
    capacity: 4,
    status: 'available',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),
};

// Environment setup for tests
export const setupTestEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.DEFAULT_RESTAURANT_ID = 'test-restaurant-id';
};

// Cleanup function
export const cleanupTestEnv = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};