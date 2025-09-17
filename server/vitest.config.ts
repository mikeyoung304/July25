import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/bootstrap.ts'],
    watch: false,
    reporters: 'dot',
    globals: true,  // Enable global test functions
    
    // CRITICAL: Memory-conscious test pooling for server tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // Sequential execution, less memory
        maxForks: 1,
      }
    },
    
    // Memory-conscious settings for server tests - increased for complex tests
    testTimeout: 120000,  // Increased from 30s to 2 minutes
    hookTimeout: 60000,   // Increased from 30s to 1 minute
    teardownTimeout: 10000,
    
    // Enhanced isolation
    isolate: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Coverage configuration
    coverage: {
      enabled: process.env.VITEST_COVERAGE !== 'false',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      provider: 'v8',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.*',
        'dist/',
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60
      }
    },
  },
});