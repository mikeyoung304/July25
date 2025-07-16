// import.meta polyfill for Jest - must be loaded before any code that uses import.meta
global.import = {
  meta: {
    env: {
      VITE_API_BASE_URL: 'http://localhost:3001',
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-key',
      DEV: true,
      MODE: 'test',
      PROD: false,
      SSR: false
    }
  }
};