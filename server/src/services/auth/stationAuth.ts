import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/database';
import { logger } from '../../utils/logger';
import { BadRequest } from '../../middleware/errorHandler';

const stationLogger = logger.child({ module: 'station-auth' });

// Configuration
const STATION_TOKEN_SECRET = process.env['STATION_TOKEN_SECRET'] || process.env['KIOSK_JWT_SECRET'] || 'station-secret-change-in-production';
const STATION_TOKEN_EXPIRY_HOURS = 4;
const DEVICE_FINGERPRINT_SALT = process.env['DEVICE_FINGERPRINT_SALT'] || 'device-salt-change-in-production';

export type StationType = 'kitchen' | 'expo' | 'bar' | 'prep';

interface StationTokenPayload {
  sub: string; // station token ID
  type: 'station';
  station_type: StationType;
  station_name: string;
  restaurant_id: string;
  device_fingerprint: string;
  iat: number;
  exp: number;
}

interface CreateStationTokenParams {
  stationType: StationType;
  stationName: string;
  restaurantId: string;
  ipAddress: string;
  userAgent: string;
  createdBy: string;
}

interface ValidateStationTokenResult {
  isValid: boolean;
  stationType?: StationType;
  stationName?: string;
  restaurantId?: string;
  error?: string;
}

/**
 * Generate device fingerprint from IP and user agent
 */
function generateDeviceFingerprint(ipAddress: string, userAgent: string): string {
  const data = `${ipAddress}:${userAgent}:${DEVICE_FINGERPRINT_SALT}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Unused - left for potential future use
// function _generateSecureToken(): string {
//   return crypto.randomBytes(32).toString('hex');
// }

/**
 * Create a new station token
 */
export async function createStationToken(
  params: CreateStationTokenParams
): Promise<{ token: string; expiresAt: Date }> {
  const { stationType, stationName, restaurantId, ipAddress, userAgent, createdBy } = params;
  
  try {
    // Validate station type
    const validStationTypes: StationType[] = ['kitchen', 'expo', 'bar', 'prep'];
    if (!validStationTypes.includes(stationType)) {
      throw BadRequest('Invalid station type');
    }
    
    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(ipAddress, userAgent);
    
    // Generate token ID
    const tokenId = crypto.randomBytes(16).toString('hex');
    
    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + STATION_TOKEN_EXPIRY_HOURS);
    
    // Create JWT payload
    const payload: StationTokenPayload = {
      sub: tokenId,
      type: 'station',
      station_type: stationType,
      station_name: stationName,
      restaurant_id: restaurantId,
      device_fingerprint: deviceFingerprint,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };
    
    // Sign the token
    const token = jwt.sign(payload, STATION_TOKEN_SECRET, { algorithm: 'HS256' });
    
    // Hash the token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Store token in database
    const { error } = await supabase
      .from('station_tokens')
      .insert({
        token_hash: tokenHash,
        station_type: stationType,
        station_name: stationName,
        restaurant_id: restaurantId,
        device_fingerprint: deviceFingerprint,
        expires_at: expiresAt.toISOString(),
        created_by: createdBy
      });
    
    if (error) {
      stationLogger.error('Failed to store station token:', error);
      throw error;
    }
    
    // Log station login event
    await logAuthEvent(createdBy, restaurantId, 'station_login', {
      station_type: stationType,
      station_name: stationName,
      device_fingerprint: deviceFingerprint
    });
    
    stationLogger.info('Station token created', {
      stationType,
      stationName,
      restaurantId,
      expiresAt
    });
    
    return { token, expiresAt };
  } catch (error) {
    stationLogger.error('Error creating station token:', error);
    throw error;
  }
}

/**
 * Validate a station token
 */
export async function validateStationToken(
  token: string,
  ipAddress: string,
  userAgent: string
): Promise<ValidateStationTokenResult> {
  try {
    // Verify JWT signature
    let decoded: StationTokenPayload;
    try {
      decoded = jwt.verify(token, STATION_TOKEN_SECRET) as StationTokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          isValid: false,
          error: 'Token expired'
        };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return {
          isValid: false,
          error: 'Invalid token'
        };
      }
      throw error;
    }
    
    // Verify token type
    if (decoded.type !== 'station') {
      return {
        isValid: false,
        error: 'Invalid token type'
      };
    }
    
    // Generate current device fingerprint
    const currentFingerprint = generateDeviceFingerprint(ipAddress, userAgent);
    
    // Hash the token for database lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Check token in database
    const { data: storedToken, error } = await supabase
      .from('station_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('revoked', false)
      .single();
    
    if (error || !storedToken) {
      stationLogger.warn('Station token not found or revoked', {
        tokenHash: tokenHash.substring(0, 8) + '...'
      });
      return {
        isValid: false,
        error: 'Token not found or revoked'
      };
    }
    
    // Check expiry
    if (new Date(storedToken.expires_at) < new Date()) {
      return {
        isValid: false,
        error: 'Token expired'
      };
    }
    
    // Verify device fingerprint
    if (storedToken.device_fingerprint !== currentFingerprint) {
      stationLogger.warn('Device fingerprint mismatch', {
        expected: storedToken.device_fingerprint.substring(0, 8) + '...',
        actual: currentFingerprint.substring(0, 8) + '...'
      });
      return {
        isValid: false,
        error: 'Device mismatch'
      };
    }
    
    // Update last activity
    await supabase
      .from('station_tokens')
      .update({
        last_activity_at: new Date().toISOString()
      })
      .eq('id', storedToken.id);
    
    return {
      isValid: true,
      stationType: decoded.station_type,
      stationName: decoded.station_name,
      restaurantId: decoded.restaurant_id
    };
    
  } catch (error) {
    stationLogger.error('Station token validation error:', error);
    return {
      isValid: false,
      error: 'Validation failed'
    };
  }
}

/**
 * Revoke a station token
 */
export async function revokeStationToken(
  tokenId: string,
  revokedBy: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('station_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy
      })
      .eq('id', tokenId);
    
    if (error) {
      stationLogger.error('Failed to revoke station token:', error);
      throw error;
    }
    
    stationLogger.info('Station token revoked', {
      tokenId,
      revokedBy
    });
  } catch (error) {
    stationLogger.error('Error revoking station token:', error);
    throw error;
  }
}

/**
 * Revoke all station tokens for a restaurant
 */
export async function revokeAllStationTokens(
  restaurantId: string,
  revokedBy: string
): Promise<number> {
  try {
    // Get all active tokens for the restaurant
    const { data: tokens, error: fetchError } = await supabase
      .from('station_tokens')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('revoked', false);
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!tokens || tokens.length === 0) {
      return 0;
    }
    
    // Revoke all tokens
    const { error } = await supabase
      .from('station_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy
      })
      .eq('restaurant_id', restaurantId)
      .eq('revoked', false);
    
    if (error) {
      stationLogger.error('Failed to revoke station tokens:', error);
      throw error;
    }
    
    stationLogger.info('All station tokens revoked for restaurant', {
      restaurantId,
      count: tokens.length,
      revokedBy
    });
    
    return tokens.length;
  } catch (error) {
    stationLogger.error('Error revoking all station tokens:', error);
    throw error;
  }
}

/**
 * Get active station tokens for a restaurant
 */
export async function getActiveStationTokens(restaurantId: string) {
  try {
    const { data, error } = await supabase
      .from('station_tokens')
      .select('id, station_type, station_name, last_activity_at, expires_at, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('revoked', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      stationLogger.error('Failed to get active station tokens:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    stationLogger.error('Error getting active station tokens:', error);
    throw error;
  }
}

/**
 * Clean up expired station tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const { data: expiredTokens, error: fetchError } = await supabase
      .from('station_tokens')
      .select('id')
      .lt('expires_at', new Date().toISOString())
      .eq('revoked', false);
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!expiredTokens || expiredTokens.length === 0) {
      return 0;
    }
    
    // Mark as revoked (don't delete for audit trail)
    const { error } = await supabase
      .from('station_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString()
      })
      .lt('expires_at', new Date().toISOString())
      .eq('revoked', false);
    
    if (error) {
      stationLogger.error('Failed to cleanup expired tokens:', error);
      throw error;
    }
    
    stationLogger.info('Expired station tokens cleaned up', {
      count: expiredTokens.length
    });
    
    return expiredTokens.length;
  } catch (error) {
    stationLogger.error('Error cleaning up expired tokens:', error);
    throw error;
  }
}

/**
 * Log authentication event
 */
async function logAuthEvent(
  userId: string,
  restaurantId: string,
  eventType: string,
  metadata?: any
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
    stationLogger.error('Failed to log auth event:', error);
    // Don't throw - logging failure shouldn't break auth flow
  }
}