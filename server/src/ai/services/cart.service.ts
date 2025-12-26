/**
 * Cart Service
 *
 * Handles cart CRUD operations with write-through caching to Supabase.
 * Implements mutex locking to prevent race conditions from concurrent
 * AI function calls.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';
import { Mutex } from 'async-mutex';
import { logger } from '../../utils/logger';
import { DEFAULT_TAX_RATE, TAX_RATE_SOURCE } from '@rebuild/shared/constants/business';
import { sanitizePrice, validateCartTotals, getErrorMessage } from '@rebuild/shared';
import type { Cart, CartItem } from '../types/menu-tools.types';

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_KEY']!,
  { auth: { persistSession: false } }
);

// Cache for restaurant data including tax rates (5 minutes TTL)
const restaurantCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// In-memory cart storage (replace with Redis in production)
const cartStorage = new Map<string, Cart>();

// Session-level cart locks to prevent concurrent modifications
const cartLocks = new Map<string, Mutex>();

// Module-level interval reference for cleanup (prevents timer leak)
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Execute a cart operation with exclusive lock for the session
 * Prevents race conditions from concurrent AI function calls
 */
export async function withCartLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  if (!cartLocks.has(sessionId)) {
    cartLocks.set(sessionId, new Mutex());
  }
  const mutex = cartLocks.get(sessionId)!;
  return await mutex.runExclusive(fn);
}

/**
 * Get restaurant tax rate from database (with caching)
 */
export async function getRestaurantTaxRate(restaurantId: string): Promise<number> {
  const cacheKey = `tax_rate_${restaurantId}`;
  const cached = restaurantCache.get<number>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('tax_rate')
      .eq('id', restaurantId)
      .single();

    if (error || !data) {
      logger.warn('[MenuTools] Failed to fetch tax rate, using shared constant', {
        restaurantId,
        error,
        fallback: DEFAULT_TAX_RATE,
        source: TAX_RATE_SOURCE.FALLBACK
      });
      return DEFAULT_TAX_RATE;
    }

    const taxRate = data.tax_rate ?? DEFAULT_TAX_RATE;
    restaurantCache.set(cacheKey, taxRate);
    return taxRate;
  } catch (error) {
    logger.error('[MenuTools] Exception fetching tax rate', { restaurantId, error });
    logger.warn('[MenuTools] Using fallback tax rate', {
      fallback: DEFAULT_TAX_RATE,
      source: TAX_RATE_SOURCE.FALLBACK
    });
    return DEFAULT_TAX_RATE;
  }
}

/**
 * Get cart from Supabase (with write-through cache)
 */
export async function getCart(sessionId: string, restaurantId: string): Promise<Cart> {
  // Check cache first
  if (cartStorage.has(sessionId)) {
    return cartStorage.get(sessionId)!;
  }

  try {
    // Query Supabase for existing cart
    const { data, error } = await supabase
      .from('voice_order_carts')
      .select('*')
      .eq('session_id', sessionId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!error && data) {
      // Convert from database format to Cart interface
      const cart: Cart = {
        session_id: data.session_id,
        restaurant_id: data.restaurant_id,
        items: data.items as CartItem[],
        subtotal: parseFloat(data.subtotal),
        tax: parseFloat(data.tax),
        total: parseFloat(data.total),
        created_at: new Date(data.created_at).getTime(),
        updated_at: new Date(data.updated_at).getTime()
      };

      // Cache it
      cartStorage.set(sessionId, cart);
      return cart;
    }

    // No cart found or expired - create new one
    const newCart: Cart = {
      session_id: sessionId,
      restaurant_id: restaurantId,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // Cache it (will be persisted on first modification)
    cartStorage.set(sessionId, newCart);
    return newCart;
  } catch (error) {
    logger.error('[MenuTools] Failed to get cart from Supabase', {
      sessionId,
      restaurantId,
      error
    });

    // Fallback to in-memory only
    const fallbackCart: Cart = {
      session_id: sessionId,
      restaurant_id: restaurantId,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    cartStorage.set(sessionId, fallbackCart);
    return fallbackCart;
  }
}

/**
 * Save cart to Supabase (write-through)
 */
export async function saveCart(cart: Cart): Promise<void> {
  try {
    const { error } = await supabase
      .from('voice_order_carts')
      .upsert({
        session_id: cart.session_id,
        restaurant_id: cart.restaurant_id,
        items: cart.items,
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        updated_at: new Date(cart.updated_at).toISOString()
      }, {
        onConflict: 'session_id,restaurant_id'
      });

    if (error) {
      logger.error('[MenuTools] Failed to save cart to Supabase', {
        sessionId: cart.session_id,
        restaurantId: cart.restaurant_id,
        error
      });
      // Don't throw - continue with in-memory cache
    }

    // Update cache
    cartStorage.set(cart.session_id, cart);
  } catch (error) {
    logger.error('[MenuTools] Exception saving cart', {
      sessionId: cart.session_id,
      restaurantId: cart.restaurant_id,
      error
    });
    // Continue with in-memory cache only
  }
}

/**
 * Update cart totals
 * @param cart - Cart to update
 * @param taxRate - Tax rate as decimal (e.g., 0.0825 for 8.25%)
 *
 * ADR-013: Using shared DEFAULT_TAX_RATE constant
 *
 * Uses cents (integer) arithmetic to avoid floating-point rounding errors.
 * Only converted to dollars for storage.
 *
 * Validates all prices before calculation and validates results before storing
 * to prevent data corruption.
 */
export function updateCartTotals(cart: Cart, taxRate: number = DEFAULT_TAX_RATE): void {
  // Work in cents (integers) to avoid floating-point errors like 0.1 + 0.2 = 0.30000000000000004
  const subtotalCents = cart.items.reduce((sumCents, item) => {
    // Sanitize prices to prevent NaN/Infinity propagation
    const itemPrice = sanitizePrice(item.price);
    const itemPriceCents = Math.round(itemPrice * 100);
    const modifierPriceCents = Math.round(
      (item.modifiers || []).reduce((modSum, mod) => {
        const modPrice = sanitizePrice(mod.price);
        return modSum + modPrice;
      }, 0) * 100
    );
    const itemTotalCents = (itemPriceCents + modifierPriceCents) * item.quantity;
    return sumCents + itemTotalCents;
  }, 0);

  // Calculate tax in cents
  const taxCents = Math.round(subtotalCents * taxRate);

  // Calculate total in cents
  const totalCents = subtotalCents + taxCents;

  // Convert back to dollars for storage (consistent with Cart interface)
  const subtotal = subtotalCents / 100;
  const tax = taxCents / 100;
  const total = totalCents / 100;

  // Validate calculated totals before storing
  try {
    validateCartTotals(subtotal, tax, total);
  } catch (error) {
    logger.error('[updateCartTotals] Invalid cart totals calculated', {
      subtotal,
      tax,
      total,
      itemCount: cart.items.length,
      error: getErrorMessage(error)
    });
    // Fall back to zero values to prevent data corruption
    cart.subtotal = 0;
    cart.tax = 0;
    cart.total = 0;
    cart.updated_at = Date.now();
    return;
  }

  cart.subtotal = subtotal;
  cart.tax = tax;
  cart.total = total;
  cart.updated_at = Date.now();
}

/**
 * Clear expired carts from both cache and Supabase
 * Also cleans up associated mutex locks
 */
export async function cleanupExpiredCarts(): Promise<void> {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  // Clean up in-memory cache
  for (const [sessionId, cart] of cartStorage.entries()) {
    if (now - cart.updated_at > maxAge) {
      cartStorage.delete(sessionId);
      cartLocks.delete(sessionId);
      logger.info('[MenuTools] Expired cart and lock removed from cache', { sessionId });
    }
  }

  // Clean up Supabase using the cleanup function
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_voice_carts');

    if (error) {
      logger.error('[MenuTools] Failed to cleanup expired carts in Supabase', { error });
    } else {
      logger.info('[MenuTools] Cleaned up expired carts from Supabase', { deletedCount: data });
    }
  } catch (error) {
    logger.error('[MenuTools] Exception during Supabase cart cleanup', { error });
  }
}

/**
 * Start the cart cleanup interval
 * Call this when the server starts
 */
export function startCartCleanup(): void {
  if (cleanupInterval) {
    logger.warn('[MenuTools] Cleanup interval already running');
    return;
  }
  cleanupInterval = setInterval(() => {
    cleanupExpiredCarts().catch(error => {
      logger.error('[MenuTools] Cleanup interval error', { error });
    });
  }, 5 * 60 * 1000);
  logger.info('[MenuTools] Cart cleanup interval started');
}

/**
 * Stop the cart cleanup interval
 * Call this during graceful shutdown
 */
export function stopCartCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('[MenuTools] Cart cleanup interval stopped');
  }
}
