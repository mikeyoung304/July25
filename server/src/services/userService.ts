/**
 * User Management Service
 * Handles all user operations with proper Supabase integration
 * Production-ready with full RBAC support
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { BadRequest, Unauthorized, Forbidden } from '../middleware/errorHandler';
import { getConfig } from '../config/environment';

const config = getConfig();
const userLogger = logger.child({ service: 'user-management' });

// Types
export interface CreateUserParams {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  employeeId?: string;
  restaurantId: string;
  role: 'owner' | 'manager' | 'server' | 'cashier' | 'kitchen' | 'expo';
  pin?: string;
}

export interface UpdateUserParams {
  displayName?: string;
  phone?: string;
  employeeId?: string;
  email?: string;
}

export interface AssignRoleParams {
  userId: string;
  restaurantId: string;
  role: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  displayName?: string;
  phone?: string;
  employeeId?: string;
  role?: string;
  restaurantId?: string;
  hasPin?: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create a new user with complete setup
 * Creates: auth.users → user_profiles → user_restaurants → user_pins (if PIN provided)
 */
export async function createUser(params: CreateUserParams): Promise<UserWithRole> {
  const { email, password, displayName, phone, employeeId, restaurantId, role, pin } = params;

  try {
    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for restaurant staff
      user_metadata: {
        display_name: displayName,
        restaurant_id: restaurantId,
        role
      }
    });

    if (authError) {
      userLogger.error('Failed to create auth user:', authError);
      throw BadRequest(authError.message);
    }

    const userId = authData.user.id;

    // Step 2: Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        phone,
        employee_id: employeeId
      });

    if (profileError) {
      userLogger.error('Failed to create user profile:', profileError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId);
      throw BadRequest('Failed to create user profile');
    }

    // Step 3: Assign restaurant role
    const { error: roleError } = await supabase
      .from('user_restaurants')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        role,
        is_active: true
      });

    if (roleError) {
      userLogger.error('Failed to assign restaurant role:', roleError);
      // Rollback: delete auth user (cascade will delete profile)
      await supabase.auth.admin.deleteUser(userId);
      throw BadRequest('Failed to assign restaurant role');
    }

    // Step 4: Set PIN if provided
    if (pin) {
      const { error: pinError } = await createOrUpdateUserPin(userId, restaurantId, pin);
      if (pinError) {
        userLogger.warn('Failed to set initial PIN:', pinError);
        // Non-critical, don't rollback
      }
    }

    // Step 5: Log the user creation
    await logAuthEvent(userId, restaurantId, 'user_created', { 
      created_by: 'system', 
      role 
    });

    userLogger.info('User created successfully', {
      userId,
      email,
      role,
      restaurantId
    });

    return {
      id: userId,
      email,
      displayName,
      phone,
      employeeId,
      role,
      restaurantId,
      hasPin: !!pin,
      createdAt: authData.user.created_at
    };

  } catch (error) {
    userLogger.error('User creation failed:', error);
    throw error;
  }
}

/**
 * Get user by ID with role information
 */
export async function getUserById(userId: string, restaurantId?: string): Promise<UserWithRole | null> {
  try {
    // Get auth user
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authData.user) {
      return null;
    }

    // Get profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get restaurant role if restaurantId provided
    let role = null;
    if (restaurantId) {
      const { data: userRole } = await supabase
        .from('user_restaurants')
        .select('role')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .single();
      
      role = userRole?.role;
    }

    // Check if user has PIN
    const { data: pinData } = await supabase
      .from('user_pins')
      .select('id')
      .eq('user_id', userId)
      .single();

    return {
      id: authData.user.id,
      email: authData.user.email!,
      displayName: profile?.display_name,
      phone: profile?.phone,
      employeeId: profile?.employee_id,
      role,
      restaurantId,
      hasPin: !!pinData,
      createdAt: authData.user.created_at,
      updatedAt: profile?.updated_at
    };

  } catch (error) {
    userLogger.error('Failed to get user:', error);
    return null;
  }
}

/**
 * List all users for a restaurant (managers only)
 */
export async function listRestaurantUsers(restaurantId: string): Promise<UserWithRole[]> {
  try {
    // Get all user-restaurant associations
    const { data: userRoles, error } = await supabase
      .from('user_restaurants')
      .select(`
        user_id,
        role,
        is_active,
        user_profiles!inner (
          display_name,
          phone,
          employee_id
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (error) {
      userLogger.error('Failed to list restaurant users:', error);
      throw error;
    }

    // Get auth details for each user
    const users: UserWithRole[] = [];
    
    for (const userRole of userRoles || []) {
      const { data: authData } = await supabase.auth.admin.getUserById(userRole.user_id);
      
      if (authData?.user) {
        // Check for PIN
        const { data: pinData } = await supabase
          .from('user_pins')
          .select('id')
          .eq('user_id', userRole.user_id)
          .single();

        users.push({
          id: userRole.user_id,
          email: authData.user.email!,
          displayName: (userRole as any).user_profiles?.display_name,
          phone: (userRole as any).user_profiles?.phone,
          employeeId: (userRole as any).user_profiles?.employee_id,
          role: userRole.role,
          restaurantId,
          hasPin: !!pinData,
          createdAt: authData.user.created_at
        });
      }
    }

    return users;

  } catch (error) {
    userLogger.error('Failed to list users:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUser(userId: string, updates: UpdateUserParams): Promise<UserWithRole | null> {
  try {
    // Update email if changed
    if (updates.email) {
      const { error: emailError } = await supabase.auth.admin.updateUserById(userId, {
        email: updates.email
      });
      
      if (emailError) {
        throw BadRequest('Failed to update email');
      }
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        display_name: updates.displayName,
        phone: updates.phone,
        employee_id: updates.employeeId
      })
      .eq('user_id', userId);

    if (profileError) {
      throw BadRequest('Failed to update profile');
    }

    return getUserById(userId);

  } catch (error) {
    userLogger.error('Failed to update user:', error);
    throw error;
  }
}

/**
 * Assign or update user role for a restaurant
 */
export async function assignUserRole(params: AssignRoleParams): Promise<void> {
  const { userId, restaurantId, role } = params;

  try {
    // Check if association exists
    const { data: existing } = await supabase
      .from('user_restaurants')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (existing) {
      // Update existing role
      const { error } = await supabase
        .from('user_restaurants')
        .update({ role, is_active: true })
        .eq('id', existing.id);
      
      if (error) throw error;
    } else {
      // Create new association
      const { error } = await supabase
        .from('user_restaurants')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          role,
          is_active: true
        });
      
      if (error) throw error;
    }

    await logAuthEvent(userId, restaurantId, 'role_assigned', { role });

    userLogger.info('User role assigned', { userId, restaurantId, role });

  } catch (error) {
    userLogger.error('Failed to assign role:', error);
    throw error;
  }
}

/**
 * Create or update user PIN
 */
export async function createOrUpdateUserPin(
  userId: string, 
  restaurantId: string, 
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      return { success: false, error: 'PIN must be 4-6 digits' };
    }

    // Generate salt and hash
    const salt = bcrypt.genSaltSync(10);
    const pinHash = bcrypt.hashSync(pin + config.restaurant.defaultId, salt);

    // Check if PIN exists
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
          salt,
          restaurant_id: restaurantId,
          attempts: 0,
          locked_until: null
        })
        .eq('id', existing.id);
      
      if (error) throw error;
    } else {
      // Create new PIN
      const { error } = await supabase
        .from('user_pins')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          pin_hash: pinHash,
          salt,
          attempts: 0
        });
      
      if (error) throw error;
    }

    await logAuthEvent(userId, restaurantId, 'pin_set');

    return { success: true };

  } catch (error) {
    userLogger.error('Failed to set PIN:', error);
    return { success: false, error: 'Failed to set PIN' };
  }
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(userId: string, restaurantId: string): Promise<void> {
  try {
    // Deactivate restaurant association
    const { error: roleError } = await supabase
      .from('user_restaurants')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    if (roleError) throw roleError;

    // Optionally disable auth account
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: '876000h' // 100 years
    });

    if (authError) {
      userLogger.warn('Failed to disable auth account:', authError);
    }

    await logAuthEvent(userId, restaurantId, 'user_deactivated');

    userLogger.info('User deactivated', { userId, restaurantId });

  } catch (error) {
    userLogger.error('Failed to deactivate user:', error);
    throw error;
  }
}

/**
 * Authenticate user with PIN and return Supabase session
 */
export async function authenticateWithPin(
  pin: string, 
  restaurantId: string
): Promise<{ user: UserWithRole; session: any } | null> {
  try {
    // Find all users with PINs for this restaurant
    const { data: pinRecords } = await supabase
      .from('user_pins')
      .select('user_id, pin_hash, salt')
      .eq('restaurant_id', restaurantId);

    if (!pinRecords || pinRecords.length === 0) {
      return null;
    }

    // Try to match PIN
    for (const record of pinRecords) {
      const pinWithPepper = pin + config.restaurant.defaultId;
      const isMatch = bcrypt.compareSync(pinWithPepper, record.pin_hash);
      
      if (isMatch) {
        // Get user details
        const user = await getUserById(record.user_id, restaurantId);
        
        if (!user) continue;

        // Get user's email to sign in with Supabase
        const { data: authUser } = await supabase.auth.admin.getUserById(record.user_id);
        
        if (!authUser?.user?.email) continue;

        // Generate a temporary password for PIN authentication
        // This is a workaround since Supabase doesn't support PIN auth directly
        // In production, consider using a service account or custom JWT
        const tempPassword = `PIN_${pin}_${Date.now()}`;
        
        // Update user's password temporarily
        await supabase.auth.admin.updateUserById(record.user_id, {
          password: tempPassword
        });

        // Sign in with the temporary password
        const { data: sessionData, error } = await supabase.auth.signInWithPassword({
          email: authUser.user.email,
          password: tempPassword
        });

        if (error || !sessionData.session) {
          userLogger.error('Failed to create session for PIN user:', error);
          continue;
        }

        // Log successful PIN authentication
        await logAuthEvent(record.user_id, restaurantId, 'pin_success');

        return {
          user,
          session: sessionData.session
        };
      }
    }

    return null;

  } catch (error) {
    userLogger.error('PIN authentication failed:', error);
    return null;
  }
}

/**
 * Get user permissions based on role
 */
export async function getUserPermissions(userId: string, restaurantId: string): Promise<string[]> {
  try {
    // Get user's role
    const { data: userRole } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (!userRole) {
      return [];
    }

    // Get role permissions
    const { data: permissions } = await supabase
      .from('role_scopes')
      .select('scope_name')
      .eq('role', userRole.role);

    return permissions?.map(p => p.scope_name) || [];

  } catch (error) {
    userLogger.error('Failed to get user permissions:', error);
    return [];
  }
}

/**
 * Log authentication event
 */
async function logAuthEvent(
  userId: string,
  restaurantId: string,
  eventType: string,
  metadata?: Record<string, any>
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
    userLogger.error('Failed to log auth event:', error);
    // Don't throw - logging failure shouldn't break auth flow
  }
}

export default {
  createUser,
  getUserById,
  listRestaurantUsers,
  updateUser,
  assignUserRole,
  createOrUpdateUserPin,
  deactivateUser,
  authenticateWithPin,
  getUserPermissions
};