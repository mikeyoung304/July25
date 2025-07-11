import dotenv from 'dotenv';
import path from 'path';
import { vi } from 'vitest';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests

// Mock console for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  // Keep error for debugging
  error: console.error,
};