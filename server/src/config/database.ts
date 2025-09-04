import { createClient } from '@supabase/supabase-js';
import { getConfig } from './environment';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded from root directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

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

// Admin client for system operations (bypasses RLS)
export const supabaseAdmin = createClient(
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

/**
 * Create a user-scoped Supabase client that respects RLS
 * Use this for operations that should be scoped to the authenticated user
 * @param accessToken - The user's Supabase access token
 */
export function createUserClient(accessToken: string) {
  return createClient(
    config.supabase.url,
    config.supabase.anonKey, // Use anon key for user clients
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

/**
 * Middleware to attach user-scoped client to request
 * Use after authentication middleware
 */
export function attachUserClient(req: any, _res: any, next: any) {
  // If user has a Supabase token, create a user-scoped client
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    req.userSupabase = createUserClient(token);
  } else {
    // Fallback to admin client for system operations
    req.userSupabase = supabaseAdmin;
  }
  next();
}

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