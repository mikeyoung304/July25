/**
 * Auto-hoisted logger mock for vitest
 *
 * This mock is automatically used by vitest when tests mock '@/services/logger'
 * because it's placed in the __mocks__ directory adjacent to the real module.
 *
 * IMPORTANT: All implementation files MUST import logger using the path alias:
 *   import { logger } from '@/services/logger'
 *
 * NOT relative paths like:
 *   import { logger } from '../../../services/logger'
 *
 * Using consistent path aliases ensures vitest resolves the mock correctly.
 */
import { vi } from 'vitest'

// Create mock logger with all methods as spies
export const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  getRecentLogs: vi.fn(() => []),
  clearLogs: vi.fn(),
}

// Export Logger class mock for tests that need to instantiate it
export class Logger {
  debug = vi.fn()
  info = vi.fn()
  warn = vi.fn()
  error = vi.fn()
  child = vi.fn(() => new Logger())
  getRecentLogs = vi.fn(() => [])
  clearLogs = vi.fn()
}
