import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './environment';
import { logger } from '../utils/logger';

let _supabaseClient: SupabaseClient | null = null;
let _supabaseAuthClient: SupabaseClient | null = null;

// Service role client for database operations (bypasses RLS)
function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    const config = getConfig();
    _supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      }
    );
  }
  return _supabaseClient;
}

// Anon client for authentication operations
function getSupabaseAuthClient(): SupabaseClient {
  if (!_supabaseAuthClient) {
    const config = getConfig();
    _supabaseAuthClient = createClient(
      config.supabase.url,
      config.supabase.anonKey,  // Use ANON key for auth
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _supabaseAuthClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Export auth client for authentication operations
export const supabaseAuth = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAuthClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export async function initializeDatabase(): Promise<void> {
  try {
    const { error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    logger.info('✅ Database connection established');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

export function getRestaurantQuery(restaurantId: string) {
  return {
    eq: (column: string) => ({ [column]: restaurantId }),
  };
}
