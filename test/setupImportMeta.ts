// Polyfill for import.meta in Jest
if (typeof globalThis.import === 'undefined') {
   
  // @ts-ignore
  globalThis.import = {
    meta: {
      env: {
        VITE_SUPABASE_URL: 'https://test.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-key',
        VITE_API_BASE_URL: 'http://localhost:3001',
        VITE_USE_MOCK_DATA: 'true',
        DEV: false,
        MODE: 'test'
      }
    }
  };
}