import jwt from 'jsonwebtoken';
import { supabase } from '../../config/database';
import { logger } from '../../utils/logger';
import { getConfig } from '../../config/environment';
import { ROLE_SCOPES } from '../../middleware/rbac';
import { Unauthorized } from '../../middleware/errorHandler';

const config = getConfig();
const authLogger = logger.child({ service: 'AuthenticationService' });

// Cache for user roles to avoid repeated database queries
// Using Map for simple in-memory cache (replace with Redis in production)
const roleCache = new Map<string, { role: string; scopes: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Canonical database roles only
export type DatabaseRole = 'owner' | 'manager' | 'server' | 'cashier' | 'kitchen' | 'expo' | 'customer';

// Token types we support
export type TokenType = 'supabase' | 'station' | 'pin' | 'kiosk';

// Normalized user representation - single source of truth
export interface NormalizedUser {
  id: string;
  email?: string;
  role: DatabaseRole;
  scopes: string[];
  restaurantId?: string;
  tokenType: TokenType;
}

// Legacy interface for backward compatibility (will be removed)
export interface AuthUser {
  id: string;
  email?: string;
  role: string;
  scopes: string[];
  restaurant_id?: string;
  auth_method?: string;
}

export interface TokenPayload {
  sub: string;
  email?: string;
  role?: string;
  scope?: string[];
  restaurant_id?: string;
  auth_method?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

/**
 * Unified Authentication Service
 * Single source of truth for all authentication and authorization operations
 */
export class AuthenticationService {
  private readonly jwtSecret: string;
  private readonly supabaseJwtSecret: string;

  constructor() {
    this.jwtSecret = config.jwtSecret || process.env.KIOSK_JWT_SECRET || '';
    this.supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET || '';
    
    if (!this.jwtSecret && !this.supabaseJwtSecret) {
      throw new Error('No JWT secrets configured');
    }
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string, restaurantId?: string): void {
    const cacheKey = this.getCacheKey(userId, restaurantId);
    roleCache.delete(cacheKey);
    authLogger.debug('Cleared cache for user', { userId, restaurantId });
  }

  /**
   * Clear entire cache (useful for testing or forced refresh)
   */
  clearAllCache(): void {
    roleCache.clear();
    authLogger.info('Cleared all authentication cache');
  }

  /**
   * Normalize a role string to canonical database role
   * Handles legacy role names and translations
   */
  private normalizeRole(role: string | undefined): DatabaseRole {
    const roleMap: Record<string, DatabaseRole> = {
      // Canonical roles (no change)
      'owner': 'owner',
      'manager': 'manager',
      'server': 'server',
      'cashier': 'cashier',
      'kitchen': 'kitchen',
      'expo': 'expo',
      'customer': 'customer',
      
      // Legacy translations
      'admin': 'owner',
      'super_admin': 'owner',
      'user': 'customer',
      'kiosk_demo': 'customer',
      'kiosk': 'customer',
      'authenticated': 'customer', // Default for unresolved Supabase roles
    };
    
    return roleMap[role || 'customer'] || 'customer';
  }

  /**
   * Determine token type from decoded payload
   */
  private getTokenType(decoded: TokenPayload): TokenType {
    if (decoded.iss?.includes('supabase')) {
      return 'supabase';
    }
    if (decoded.auth_method === 'pin') {
      return 'pin';
    }
    if (decoded.auth_method === 'station') {
      return 'station';
    }
    if (decoded.sub?.startsWith('customer:') || decoded.sub?.startsWith('demo:') || decoded.sub?.startsWith('kiosk:')) {
      return 'kiosk';
    }
    // Default to kiosk for unknown types
    return 'kiosk';
  }

  /**
   * Validate and decode a JWT token
   * Returns a normalized user representation
   * This is the single source of truth for authentication
   */
  async validateToken(token: string, restaurantId?: string): Promise<NormalizedUser> {
    if (!token || !token.startsWith('Bearer ')) {
      throw Unauthorized('No token provided');
    }

    const tokenString = token.substring(7);
    
    // Reject test tokens in production
    if (tokenString === 'test-token' && config.nodeEnv === 'production') {
      throw Unauthorized('Test tokens are not allowed in production');
    }

    // Decode and verify token
    const decoded = await this.verifyJWT(tokenString);
    const tokenType = this.getTokenType(decoded);
    
    // For write operations, restaurant context is mandatory
    if (!restaurantId && !decoded.restaurant_id) {
      authLogger.warn('No restaurant context provided', {
        userId: decoded.sub,
        tokenType
      });
      // For read-only operations this might be okay, but for writes it's not
      // The middleware should enforce this based on the operation
    }

    const effectiveRestaurantId = decoded.restaurant_id || restaurantId;
    
    // Build normalized user
    const normalizedUser: NormalizedUser = {
      id: decoded.sub,
      email: decoded.email,
      role: this.normalizeRole(decoded.role),
      scopes: decoded.scope || [],
      restaurantId: effectiveRestaurantId,
      tokenType
    };

    // Special handling for Supabase tokens with 'authenticated' role
    // We need to look up the actual business role from the database
    if (tokenType === 'supabase' && decoded.role === 'authenticated' && effectiveRestaurantId) {
      const actualRole = await this.getUserRestaurantRole(normalizedUser.id, effectiveRestaurantId);
      if (actualRole) {
        normalizedUser.role = this.normalizeRole(actualRole.role);
        normalizedUser.scopes = actualRole.scopes;
        authLogger.debug('Resolved Supabase user role from database', {
          userId: normalizedUser.id,
          role: normalizedUser.role,
          restaurantId: effectiveRestaurantId
        });
      } else {
        // User has no role in this restaurant - default to customer
        authLogger.info('User has no specific role in restaurant, defaulting to customer', {
          userId: normalizedUser.id,
          restaurantId: effectiveRestaurantId
        });
        normalizedUser.role = 'customer';
        normalizedUser.scopes = ROLE_SCOPES['customer'] || [];
      }
    }

    // Ensure scopes are set based on the normalized role
    if (normalizedUser.scopes.length === 0) {
      normalizedUser.scopes = ROLE_SCOPES[normalizedUser.role] || [];
    }

    authLogger.debug('Token validated and normalized', {
      userId: normalizedUser.id,
      role: normalizedUser.role,
      tokenType: normalizedUser.tokenType,
      restaurantId: normalizedUser.restaurantId,
      scopeCount: normalizedUser.scopes.length
    });

    return normalizedUser;
  }

  /**
   * Legacy method for backward compatibility
   * Will be removed after migration
   */
  async validateTokenLegacy(token: string, restaurantId?: string): Promise<AuthUser> {
    const normalized = await this.validateToken(token, restaurantId);
    return {
      id: normalized.id,
      email: normalized.email,
      role: normalized.role,
      scopes: normalized.scopes,
      restaurant_id: normalized.restaurantId,
      auth_method: normalized.tokenType
    };
  }

  /**
   * Verify JWT token with appropriate secret
   */
  private async verifyJWT(token: string): Promise<TokenPayload> {
    try {
      // First decode to check issuer
      const decoded = jwt.decode(token, { complete: true }) as any;
      
      if (!decoded) {
        throw new Error('Unable to decode token');
      }

      // Determine which secret to use based on issuer
      const isSupabaseToken = decoded.payload.iss?.includes('supabase');
      const secret = isSupabaseToken ? this.supabaseJwtSecret : this.jwtSecret;

      // Verify with appropriate secret
      const verified = jwt.verify(token, secret, {
        algorithms: isSupabaseToken ? ['HS256', 'RS256'] : ['HS256']
      }) as TokenPayload;

      return verified;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw Unauthorized('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw Unauthorized('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Get user's role for a specific restaurant with caching
   */
  async getUserRestaurantRole(
    userId: string,
    restaurantId: string
  ): Promise<{ role: string; scopes: string[] } | null> {
    const cacheKey = this.getCacheKey(userId, restaurantId);
    
    // Check cache first
    const cached = roleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      authLogger.debug('Using cached role', { userId, restaurantId, role: cached.role });
      return { role: cached.role, scopes: cached.scopes };
    }

    try {
      // Query database for user's role in this restaurant
      const { data, error } = await supabase
        .from('user_restaurants')
        .select('role')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        authLogger.debug('No role found for user in restaurant', {
          userId,
          restaurantId,
          error: error?.message
        });
        return null;
      }

      // Get scopes for this role
      const scopes = ROLE_SCOPES[data.role] || [];
      
      // Cache the result
      roleCache.set(cacheKey, {
        role: data.role,
        scopes,
        timestamp: Date.now()
      });

      authLogger.debug('Fetched and cached user role', {
        userId,
        restaurantId,
        role: data.role
      });

      return { role: data.role, scopes };
    } catch (error) {
      authLogger.error('Failed to get user restaurant role:', error);
      return null;
    }
  }

  /**
   * Check if user has required role(s)
   * Now works with normalized roles only
   */
  hasRole(user: NormalizedUser | AuthUser, allowedRoles: string[]): boolean {
    const userRole = typeof user.role === 'string' ? user.role : user.role;
    
    // Owner has all permissions
    if (userRole === 'owner') {
      return true;
    }
    
    // Normalize allowed roles for comparison
    const normalizedAllowedRoles = allowedRoles.map(r => this.normalizeRole(r));
    const normalizedUserRole = this.normalizeRole(userRole);
    
    return normalizedAllowedRoles.includes(normalizedUserRole);
  }

  /**
   * Check if user has required scope(s)
   */
  hasScope(user: NormalizedUser | AuthUser, requiredScopes: string[]): boolean {
    const userRole = typeof user.role === 'string' ? user.role : user.role;
    
    // Owner has all scopes
    if (this.normalizeRole(userRole) === 'owner') {
      return true;
    }
    
    return requiredScopes.some(scope => user.scopes.includes(scope));
  }

  /**
   * Enrich a token with restaurant-specific role and scopes
   * Used when creating new tokens or refreshing existing ones
   */
  async enrichTokenWithRole(
    userId: string,
    restaurantId: string,
    baseToken: TokenPayload
  ): Promise<TokenPayload> {
    const roleData = await this.getUserRestaurantRole(userId, restaurantId);
    
    if (!roleData) {
      throw Unauthorized('No access to this restaurant');
    }

    return {
      ...baseToken,
      role: roleData.role,
      scope: roleData.scopes,
      restaurant_id: restaurantId
    };
  }

  /**
   * Generate cache key for user/restaurant combination
   */
  private getCacheKey(userId: string, restaurantId?: string): string {
    return restaurantId ? `${userId}:${restaurantId}` : userId;
  }

  /**
   * Refresh user permissions (invalidates cache)
   */
  async refreshUserPermissions(userId: string, restaurantId?: string): Promise<void> {
    this.clearUserCache(userId, restaurantId);
    
    // Pre-fetch to warm cache if restaurant specified
    if (restaurantId) {
      await this.getUserRestaurantRole(userId, restaurantId);
    }
  }

  /**
   * Log authentication event for audit trail
   */
  async logAuthEvent(
    userId: string,
    restaurantId: string,
    eventType: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase
        .from('auth_logs')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          event_type: eventType,
          metadata: metadata || {}
        });
    } catch (error) {
      // Log but don't throw - audit failure shouldn't break auth
      authLogger.error('Failed to log auth event:', error);
    }
  }
}

// Export singleton instance
export const authService = new AuthenticationService();