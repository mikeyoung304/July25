import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';

const slugLogger = logger.child({ middleware: 'slug-resolver' });

// Cache for slug-to-UUID mappings (in-memory for performance)
const slugCache = new Map<string, { uuid: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Middleware to resolve restaurant slugs to UUIDs
 * Checks the x-restaurant-id header and converts slugs to UUIDs if needed
 */
export async function slugResolver(req: Request, _res: Response, next: NextFunction) {
  try {
    const restaurantIdOrSlug = req.headers['x-restaurant-id'] as string;

    if (!restaurantIdOrSlug) {
      return next();
    }

    // Check if it's already a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantIdOrSlug);

    if (isUUID) {
      // Already a UUID, no need to resolve
      return next();
    }

    // It's a slug, resolve it to UUID
    slugLogger.debug('Resolving slug to UUID', { slug: restaurantIdOrSlug });

    // Check cache first
    const cached = slugCache.get(restaurantIdOrSlug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      slugLogger.debug('Using cached slug resolution', { slug: restaurantIdOrSlug, uuid: cached.uuid });
      req.headers['x-restaurant-id'] = cached.uuid;
      return next();
    }

    // Query database for slug
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', restaurantIdOrSlug)
      .single();

    if (error || !restaurant) {
      slugLogger.warn('Slug not found', { slug: restaurantIdOrSlug, error: error?.message });
      // Don't throw error, let the route handler deal with invalid restaurant
      return next();
    }

    // Cache the resolution
    slugCache.set(restaurantIdOrSlug, { uuid: restaurant.id, timestamp: Date.now() });

    // Replace header with UUID
    req.headers['x-restaurant-id'] = restaurant.id;
    slugLogger.info('Resolved slug to UUID', { slug: restaurantIdOrSlug, uuid: restaurant.id });

    next();
  } catch (error) {
    slugLogger.error('Error in slug resolver', { error });
    // Don't block the request on slug resolution errors
    next();
  }
}
