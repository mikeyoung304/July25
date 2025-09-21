import bcrypt from 'bcryptjs';
import { supabase } from '../../config/database';
import { logger } from '../../utils/logger';
import { BadRequest } from '../../middleware/errorHandler';

const pinLogger = logger.child({ module: 'pin-auth' });

// Configuration
const PIN_PEPPER = process.env['PIN_PEPPER'] || 'default-pepper-change-in-production';
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const PIN_LENGTH_MIN = 4;
const PIN_LENGTH_MAX = 6;

interface PinValidationResult {
  isValid: boolean;
  userId?: string;
  userEmail?: string;
  role?: string;
  restaurantId?: string;
  error?: string;
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
    // Check if PIN already exists
    const { data: existing } = await supabase
      .from('user_pins')
      .select('id')
      .eq('user_id', userId)
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
        .eq('user_id', userId);
      
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
        await supabase
          .from('user_pins')
          .update({
            attempts: 0,
            locked_until: null,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', record.id);
        
        // Get user's role for this restaurant
        const { data: userRole } = await supabase
          .from('user_restaurants')
          .select('role')
          .eq('user_id', record.user_id)
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .single();
        
        // Log successful PIN authentication
        await logAuthEvent(record.user_id, restaurantId, 'pin_success');
        
        pinLogger.info('PIN validation successful', {
          userId: record.user_id,
          restaurantId,
          role: userRole?.role
        });
        
        return {
          isValid: true,
          userId: record.user_id,
          userEmail: (record as any).users?.[0]?.email,
          role: userRole?.role,
          restaurantId
        };
      } else {
        // Increment failed attempts
        const newAttempts = (record.attempts || 0) + 1;
        const updates: Record<string, unknown> = {
          attempts: newAttempts,
          last_attempt_at: new Date().toISOString()
        };
        
        // Lock account if max attempts reached
        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          const lockUntil = new Date();
          lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
          updates.locked_until = lockUntil.toISOString();
          
          pinLogger.warn('Account locked due to failed PIN attempts', {
            userId: record.user_id,
            attempts: newAttempts,
            lockedUntil: lockUntil
          });
          
          await logAuthEvent(record.user_id, restaurantId, 'pin_locked');
        }
        
        await supabase
          .from('user_pins')
          .update(updates)
          .eq('id', record.id);
        
        await logAuthEvent(record.user_id, restaurantId, 'pin_failed');
      }
    }
    
    // No matching PIN found
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
 * Reset PIN attempts for a user
 */
export async function resetPinAttempts(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_pins')
      .update({
        attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) {
      pinLogger.error('Failed to reset PIN attempts:', error);
      throw error;
    }
    
    pinLogger.info('PIN attempts reset', { userId });
  } catch (error) {
    pinLogger.error('Error resetting PIN attempts:', error);
    throw error;
  }
}

/**
 * Check if a user's PIN is locked
 */
export async function isPinLocked(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_pins')
      .select('locked_until')
      .eq('user_id', userId)
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
 */
async function logAuthEvent(
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
    pinLogger.error('Failed to log auth event:', error);
    // Don't throw - logging failure shouldn't break auth flow
  }
}

/**
 * Generate a random PIN for initial setup
 */
export function generateRandomPin(length: number = 4): string {
  if (length < PIN_LENGTH_MIN || length > PIN_LENGTH_MAX) {
    length = PIN_LENGTH_MIN;
  }
  
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  
  // Ensure it's not too simple
  if (/^(\d)\1+$/.test(pin) || pin === '1234' || pin === '0000') {
    return generateRandomPin(length); // Recursively generate a new one
  }
  
  return pin;
}