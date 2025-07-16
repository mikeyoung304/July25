// Mock import.meta for Jest
module.exports = {
  env: {
    VITE_API_BASE_URL: 'http://localhost:3001',
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    DEV: true,
    MODE: 'test',
    PROD: false,
    SSR: false
  }
};