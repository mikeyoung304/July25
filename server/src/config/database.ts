import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './environment';
import { logger } from '../utils/logger';

let _supabaseClient: SupabaseClient | null = null;

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

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
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
