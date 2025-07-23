import { config as load } from 'dotenv';
import path from 'path';

// load .env.test if present, otherwise fall back to repo root .env
const envPath = path.resolve(__dirname, '../.env.test');
load({ path: envPath });

process.env.NODE_ENV = 'test';

// Safe fallbacks so code doesn't throw in tests
process.env.OPENAI_API_KEY ||= 'test-dummy';
process.env.VITE_OPENAI_API_KEY ||= 'test-dummy';

process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-service';
process.env.SUPABASE_ANON_KEY ||= 'test-anon';

// helper for websocket tests
export const mockReq = () => ({ headers: { 'x-forwarded-for': '127.0.0.1' } });