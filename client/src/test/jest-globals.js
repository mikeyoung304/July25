// Mock import.meta for Jest environment - runs before everything else
// Delete any existing import property
try {
  delete global.import;
} catch {
  // Ignore if it doesn't exist
}

// Set up import.meta mock
global.importMeta = {
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key', 
    VITE_API_BASE_URL: 'http://localhost:3001',
    VITE_USE_MOCK_DATA: 'true',
    DEV: false,
    MODE: 'test'
  }
};

// Make import.meta available globally
Object.defineProperty(global, 'import', {
  value: {
    meta: global.importMeta
  },
  writable: true,
  configurable: true
});