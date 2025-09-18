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
    globals: true,
    setupFiles: ['tests/bootstrap.ts'],
    watch: false,
    reporters: 'dot',
    
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
  },
});
