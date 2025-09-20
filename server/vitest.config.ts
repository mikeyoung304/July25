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
    
    // CRITICAL: Memory-conscious test pooling for server tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // Sequential execution, less memory
        maxForks: 1,
      }
    },
    
    // Memory-conscious settings for server tests
    testTimeout: 15000,
    hookTimeout: 15000,
    teardownTimeout: 10000,
    
    // Enhanced isolation
    isolate: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});