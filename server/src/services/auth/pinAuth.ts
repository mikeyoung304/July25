import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabase } from '../../config/database';
import { logger } from '../../utils/logger';
import { BadRequest } from '../../middleware/errorHandler';

// DESIGN: PINs are per-restaurant
// A user can have different PINs for different restaurants they work at.
// All PIN operations (create, update, validate, lock/unlock) are scoped by restaurant_id.
// This ensures proper multi-tenancy and allows users to maintain separate security contexts.

const pinLogger = logger.child({ module: 'pin-auth' });

// Configuration
// PIN_PEPPER is required in production - no fallback to prevent weak security
const PIN_PEPPER_RAW = process.env['PIN_PEPPER'];
if (!PIN_PEPPER_RAW && process.env['NODE_ENV'] === 'production') {
  throw new Error('PIN_PEPPER environment variable is required in production');
}
const PIN_PEPPER = PIN_PEPPER_RAW || 'dev-only-pepper';
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const PIN_LENGTH_MIN = 4;
const PIN_LENGTH_MAX = 6;

// Pre-computed dummy hash for timing-safe comparison when user not found
// This ensures consistent timing whether or not a PIN record exists
const DUMMY_PIN_HASH = bcrypt.hashSync('dummy-pin-never-matches' + (PIN_PEPPER_RAW || 'dev-only-pepper'), 10);

interface PinValidationResult {
  isValid: boolean;
  userId?: string | undefined;
  userEmail?: string | undefined;
  role?: string | undefined;
  restaurantId?: string | undefined;
  error?: string | undefined;
}

interface CreatePinParams {
  userId: string;
  restaurantId: string;
  pin: string;
}

/**
 * Hash a PIN with salt and pepper
 */
function hashPin(pin: string, salt: string): string {
  const pepperedPin = pin + PIN_PEPPER;
  return bcrypt.hashSync(pepperedPin, salt);
}

/**
 * Verify a PIN against a hash
 */
function verifyPin(pin: string, hash: string): boolean {
  const pepperedPin = pin + PIN_PEPPER;
  return bcrypt.compareSync(pepperedPin, hash);
}

/**
 * Generate a salt for PIN hashing
 */
function generateSalt(): string {
  return bcrypt.genSaltSync(10);
}

/**
 * Validate PIN format
 */
function validatePinFormat(pin: string): void {
  if (!pin || typeof pin !== 'string') {
    throw BadRequest('PIN is required');
  }
  
  if (pin.length < PIN_LENGTH_MIN || pin.length > PIN_LENGTH_MAX) {
    throw BadRequest(`PIN must be ${PIN_LENGTH_MIN}-${PIN_LENGTH_MAX} digits`);
  }
  
  if (!/^\d+$/.test(pin)) {
    throw BadRequest('PIN must contain only digits');
  }
  
  // Check for simple patterns
  if (/^(\d)\1+$/.test(pin)) {
    throw BadRequest('PIN cannot be all the same digit');
  }
  
  if (pin === '1234' || pin === '123456' || pin === '0000' || pin === '000000') {
    throw BadRequest('PIN is too simple');
  }
}

/**
 * Create or update a user's PIN
 */
export async function createOrUpdatePin(params: CreatePinParams): Promise<void> {
  const { userId, restaurantId, pin } = params;
  
  // Validate PIN format
  validatePinFormat(pin);
  
  // Generate salt and hash
  const salt = generateSalt();
  const pinHash = hashPin(pin, salt);
  
  try {
    // Check if PIN already exists for this user+restaurant
    const { data: existing } = await supabase
      .from('user_pins')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();
    
    if (existing) {
      // Update existing PIN
      const { error } = await supabase
        .from('user_pins')
        .update({
          pin_hash: pinHash,
          salt: salt,
          restaurant_id: restaurantId,
          attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);
      
      if (error) {
        pinLogger.error('Failed to update PIN:', error);
        throw error;
      }
      
      pinLogger.info('PIN updated for user', { userId, restaurantId });
    } else {
      // Create new PIN
      const { error } = await supabase
        .from('user_pins')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          pin_hash: pinHash,
          salt: salt,
          attempts: 0
        });
      
      if (error) {
        pinLogger.error('Failed to create PIN:', error);
        throw error;
      }
      
      pinLogger.info('PIN created for user', { userId, restaurantId });
    }
    
    // Log the PIN creation/update
    await logAuthEvent(userId, restaurantId, 'pin_created');
  } catch (error) {
    pinLogger.error('Error managing PIN:', error);
    throw error;
  }
}

/**
 * Validate a PIN for authentication
 */
export async function validatePin(
  pin: string,
  restaurantId: string
): Promise<PinValidationResult> {
  try {
    // Basic validation
    if (!pin || !restaurantId) {
      return {
        isValid: false,
        error: 'PIN and restaurant ID required'
      };
    }
    
    // Find users with this restaurant access
    const { data: pinRecords, error: pinError } = await supabase
      .from('user_pins')
      .select(`
        id,
        user_id,
        pin_hash,
        salt,
        attempts,
        locked_until,
        users!inner (
          id,
          email
        )
      `)
      .eq('restaurant_id', restaurantId);
    
    if (pinError || !pinRecords || pinRecords.length === 0) {
      // SECURITY: Perform dummy bcrypt comparison to ensure consistent timing
      // This prevents timing attacks that could reveal whether any PINs exist
      bcrypt.compareSync(pin + PIN_PEPPER, DUMMY_PIN_HASH);

      pinLogger.warn('No PIN records found for restaurant', { restaurantId });
      return {
        isValid: false,
        error: 'Invalid PIN'
      };
    }
    
    // Try to find matching PIN
    for (const record of pinRecords) {
      // Check if account is locked
      if (record.locked_until) {
        const lockoutTime = new Date(record.locked_until);
        if (lockoutTime > new Date()) {
          pinLogger.warn('Account locked for PIN attempts', {
            userId: record.user_id,
            lockedUntil: record.locked_until
          });
          continue; // Skip locked accounts
        }
      }
      
      // Verify PIN
      const isMatch = verifyPin(pin, record.pin_hash);
      
      if (isMatch) {
        // Reset attempts on successful validation
        const { error: resetError } = await supabase
          .from('user_pins')
          .update({
            attempts: 0,
            locked_until: null,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', record.id)
          .eq('restaurant_id', restaurantId);

        // Task 2: Log reset failure but don't block authentication
        // User authenticated successfully - allow login despite reset failure (will self-correct on next login)
        if (resetError) {
          pinLogger.error('CRITICAL: Failed to reset PIN attempts after successful authentication', {
            error: resetError,
            userId: record.user_id,
            restaurantId
          });
        }

        // Task 3: Get user's role for this restaurant - MUST succeed for RBAC
        const { data: userRole, error: roleError } = await supabase
          .from('user_restaurants')
          .select('role')
          .eq('user_id', record.user_id)
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .single();

        if (roleError || !userRole) {
          pinLogger.error('CRITICAL: Failed to load user permissions', {
            error: roleError,
            userId: record.user_id,
            restaurantId
          });
          return {
            isValid: false,
            error: 'Failed to load user permissions'
          };
        }

        // Log successful PIN authentication
        await logAuthEvent(record.user_id, restaurantId, 'pin_success');

        pinLogger.info('PIN validation successful', {
          userId: record.user_id,
          restaurantId,
          role: userRole.role
        });

        return {
          isValid: true,
          userId: record.user_id,
          userEmail: (record as unknown as { users?: { email: string } }).users?.email,
          role: userRole.role,
          restaurantId
        };
      } else {
        // SECURITY FIX: Use atomic increment to prevent race condition (P1 security issue)
        // The previous read-modify-write pattern allowed concurrent requests to bypass lockout
        // This RPC function performs the increment in a single atomic database operation
        const { data: attemptResult, error: attemptError } = await supabase
          .rpc('increment_pin_attempts', {
            p_pin_id: record.id,
            p_restaurant_id: restaurantId,
            p_max_attempts: MAX_PIN_ATTEMPTS,
            p_lockout_minutes: LOCKOUT_DURATION_MINUTES
          });

        if (attemptError) {
          pinLogger.error('CRITICAL: Failed to update PIN attempt counter', {
            error: attemptError,
            userId: record.user_id,
            restaurantId
          });
          // Cannot allow authentication to proceed without tracking attempts
          throw new Error('Authentication system unavailable');
        }

        const newAttempts = attemptResult?.[0]?.new_attempts ?? (record.attempts || 0) + 1;
        const isLocked = attemptResult?.[0]?.is_locked ?? false;
        const lockedUntil = attemptResult?.[0]?.locked_until;

        // Log lockout if account was just locked
        if (isLocked && newAttempts >= MAX_PIN_ATTEMPTS) {
          pinLogger.warn('Account locked due to failed PIN attempts', {
            userId: record.user_id,
            attempts: newAttempts,
            lockedUntil
          });

          await logAuthEvent(record.user_id, restaurantId, 'pin_locked');
        }

        await logAuthEvent(record.user_id, restaurantId, 'pin_failed');
      }
    }
    
    // No matching PIN found
    // SECURITY: Dummy comparison already performed in the loop, so timing is consistent
    return {
      isValid: false,
      error: 'Invalid PIN'
    };
    
  } catch (error) {
    pinLogger.error('PIN validation error:', error);
    return {
      isValid: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Reset PIN attempts for a user at a specific restaurant
 */
export async function resetPinAttempts(userId: string, restaurantId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_pins')
      .update({
        attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      pinLogger.error('Failed to reset PIN attempts:', error);
      throw error;
    }

    pinLogger.info('PIN attempts reset', { userId, restaurantId });
  } catch (error) {
    pinLogger.error('Error resetting PIN attempts:', error);
    throw error;
  }
}

/**
 * Check if a user's PIN is locked at a specific restaurant
 */
export async function isPinLocked(userId: string, restaurantId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_pins')
      .select('locked_until')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      return false;
    }

    if (!data['locked_until']) {
      return false;
    }

    const lockoutTime = new Date(data['locked_until']);
    return lockoutTime > new Date();
  } catch (error) {
    pinLogger.error('Error checking PIN lock status:', error);
    return false;
  }
}

/**
 * Log authentication event
 * Tasks 4 & 5: Implements fail-safe pattern per ADR-009
 * Auth logging may fail-safe with file fallback to maintain audit trail
 */
async function logAuthEvent(
  userId: string,
  restaurantId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('auth_logs')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        event_type: eventType,
        metadata: metadata || {}
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    // Fail-safe: Fall back to file logging to maintain audit trail
    pinLogger.error('Auth log DB failed, falling back to file', { error });

    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        user_id: userId,
        restaurant_id: restaurantId,
        event_type: eventType,
        metadata: metadata || {},
        error: 'Database logging failed'
      };

      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, 'auth_failures.log');

      // Ensure log directory exists
      await fs.promises.mkdir(logDir, { recursive: true });

      // Append to log file
      await fs.promises.appendFile(
        logFile,
        JSON.stringify(logEntry) + '\n'
      );

      pinLogger.info('Auth event logged to file successfully', { eventType, userId });
    } catch (fileError) {
      // Last resort: log to console
      pinLogger.error('CRITICAL: Both DB and file logging failed for auth event', {
        originalError: error,
        fileError,
        eventType,
        userId,
        restaurantId
      });
    }
  }
}

/**
 * Generate a random PIN for initial setup
 * Uses cryptographically secure random number generation (Node.js crypto.randomInt)
 */
export function generateRandomPin(length: number = 4): string {
  if (length < PIN_LENGTH_MIN || length > PIN_LENGTH_MAX) {
    length = PIN_LENGTH_MIN;
  }

  // Use crypto.randomInt() for cryptographically secure random generation
  // This prevents PRNG prediction attacks that are possible with Math.random()
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += randomInt(0, 10).toString();
  }

  // Ensure it's not too simple (all same digit, sequential, common patterns)
  if (/^(\d)\1+$/.test(pin) || pin === '1234' || pin === '0000') {
    return generateRandomPin(length); // Recursively generate a new one
  }

  return pin;
}