import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './environment';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded from root directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Lazy initialize Supabase client to ensure environment variables are loaded
let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const config = getConfig();

    if (!config.supabase.url || !config.supabase.serviceKey) {
      throw new Error('Supabase configuration is missing. Please check your environment variables.');
    }

    _supabase = createClient(
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
  return _supabase;
}

// Export a getter for backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const client = getSupabaseClient();
    return Reflect.get(client, prop, receiver);
  }
});

// Test database connection
export async function initializeDatabase(): Promise<void> {
  try {
    // Simple query to test connection
    const { error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
      throw error;
    }

    logger.info('✅ Database connection established');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Helper function to get restaurant-scoped query
export function getRestaurantQuery(restaurantId: string) {
  return {
    eq: (column: string) => ({ [column]: restaurantId }),
  };
}