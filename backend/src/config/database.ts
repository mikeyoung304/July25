import { createClient } from '@supabase/supabase-js';
import { getConfig } from './environment';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = getConfig();

// Create Supabase client with service role key for backend operations
export const supabase = createClient(
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