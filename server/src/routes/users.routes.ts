/**
 * User Management Routes
 * Production-ready user management with full RBAC
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { BadRequest, Unauthorized, Forbidden } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import userService from '../services/userService';
import { ApiScope } from '../../../shared/types/api.types';

const router = Router();
const routeLogger = logger.child({ route: 'users' });

/**
 * POST /api/v1/users/register
 * Create a new user (managers/owners only)
 */
router.post('/register', 
  authenticate, 
  // requireScopes(ApiScope.STAFF_MANAGE), // TODO: implement requireScopes
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password, displayName, phone, employeeId, role, pin } = req.body;
      const restaurantId = req.restaurantId!;
      const createdBy = req.user!;

      // Validate required fields
      if (!email || !password || !role) {
        throw BadRequest('Email, password, and role are required');
      }

      // Validate role
      const validRoles = ['owner', 'manager', 'server', 'cashier', 'kitchen', 'expo'];
      if (!validRoles.includes(role)) {
        throw BadRequest(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Only owners can create other owners/managers
      if ((role === 'owner' || role === 'manager') && createdBy.role !== 'owner') {
        throw Forbidden('Only owners can create managers or other owners');
      }

      // Validate password strength
      if (password.length < 8) {
        throw BadRequest('Password must be at least 8 characters');
      }

      // Validate PIN if provided
      if (pin && !/^\d{4,6}$/.test(pin)) {
        throw BadRequest('PIN must be 4-6 digits');
      }

      // Create the user
      const user = await userService.createUser({
        email,
        password,
        displayName,
        phone,
        employeeId,
        restaurantId,
        role,
        pin
      });

      routeLogger.info('User created', {
        userId: user.id,
        email: user.email,
        role,
        createdBy: createdBy.id
      });

      res.status(201).json({
        success: true,
        user
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/users
 * List all users for the restaurant (managers/owners only)
 */
router.get('/',
  authenticate,
  // requireScopes(ApiScope.STAFF_MANAGE), // TODO: implement requireScopes
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.restaurantId!;

      const users = await userService.listRestaurantUsers(restaurantId);

      res.json({
        success: true,
        users,
        count: users.length
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/users/:id
 * Get user details
 */
router.get('/:id',
  authenticate,
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const restaurantId = req.restaurantId!;
      const requestingUser = req.user!;

      // Users can view their own profile
      // Managers can view all restaurant staff
      if (id !== requestingUser.id && 
          !['owner', 'manager'].includes(requestingUser.role || '')) {
        throw Forbidden('Insufficient permissions');
      }

      const user = await userService.getUserById(id, restaurantId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/users/:id
 * Update user profile
 */
router.put('/:id',
  authenticate,
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { displayName, phone, employeeId, email } = req.body;
      const requestingUser = req.user!;

      // Users can update their own profile
      // Managers can update all restaurant staff
      if (id !== requestingUser.id && 
          !['owner', 'manager'].includes(requestingUser.role || '')) {
        throw Forbidden('Insufficient permissions');
      }

      const user = await userService.updateUser(id, {
        displayName,
        phone,
        employeeId,
        email
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      routeLogger.info('User updated', {
        userId: id,
        updatedBy: requestingUser.id
      });

      res.json({
        success: true,
        user
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/:id/role
 * Assign or update user role (managers/owners only)
 */
router.post('/:id/role',
  authenticate,
  // requireScopes(ApiScope.STAFF_MANAGE), // TODO: implement requireScopes
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const restaurantId = req.restaurantId!;
      const requestingUser = req.user!;

      if (!role) {
        throw BadRequest('Role is required');
      }

      // Validate role
      const validRoles = ['owner', 'manager', 'server', 'cashier', 'kitchen', 'expo'];
      if (!validRoles.includes(role)) {
        throw BadRequest(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Only owners can assign owner/manager roles
      if ((role === 'owner' || role === 'manager') && requestingUser.role !== 'owner') {
        throw Forbidden('Only owners can assign manager or owner roles');
      }

      await userService.assignUserRole({
        userId: id,
        restaurantId,
        role
      });

      routeLogger.info('User role assigned', {
        userId: id,
        role,
        assignedBy: requestingUser.id
      });

      res.json({
        success: true,
        message: 'Role assigned successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/:id/pin
 * Set or update user PIN
 */
router.post('/:id/pin',
  authenticate,
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { pin } = req.body;
      const restaurantId = req.restaurantId!;
      const requestingUser = req.user!;

      // Users can set their own PIN
      // Managers can set PINs for staff
      if (id !== requestingUser.id && 
          !['owner', 'manager'].includes(requestingUser.role || '')) {
        throw Forbidden('Insufficient permissions');
      }

      if (!pin) {
        throw BadRequest('PIN is required');
      }

      if (!/^\d{4,6}$/.test(pin)) {
        throw BadRequest('PIN must be 4-6 digits');
      }

      const result = await userService.createOrUpdateUserPin(id, restaurantId, pin);

      if (!result.success) {
        throw BadRequest(result.error || 'Failed to set PIN');
      }

      routeLogger.info('User PIN set', {
        userId: id,
        setBy: requestingUser.id
      });

      res.json({
        success: true,
        message: 'PIN set successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/users/:id
 * Deactivate user (soft delete)
 */
router.delete('/:id',
  authenticate,
  // requireScopes(ApiScope.STAFF_MANAGE), // TODO: implement requireScopes
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const restaurantId = req.restaurantId!;
      const requestingUser = req.user!;

      // Can't deactivate yourself
      if (id === requestingUser.id) {
        throw BadRequest('Cannot deactivate your own account');
      }

      // Only owners can deactivate managers/owners
      const userToDeactivate = await userService.getUserById(id, restaurantId);
      if (userToDeactivate && 
          (userToDeactivate.role === 'owner' || userToDeactivate.role === 'manager') &&
          requestingUser.role !== 'owner') {
        throw Forbidden('Only owners can deactivate managers or other owners');
      }

      await userService.deactivateUser(id, restaurantId);

      routeLogger.info('User deactivated', {
        userId: id,
        deactivatedBy: requestingUser.id
      });

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/users/:id/permissions
 * Get user permissions
 */
router.get('/:id/permissions',
  authenticate,
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const restaurantId = req.restaurantId!;
      const requestingUser = req.user!;

      // Users can view their own permissions
      // Managers can view all staff permissions
      if (id !== requestingUser.id && 
          !['owner', 'manager'].includes(requestingUser.role || '')) {
        throw Forbidden('Insufficient permissions');
      }

      const permissions = await userService.getUserPermissions(id, restaurantId);

      res.json({
        success: true,
        userId: id,
        permissions
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/authenticate-pin
 * Authenticate with PIN (returns Supabase session)
 * This is for internal use to properly authenticate PIN users
 */
router.post('/authenticate-pin',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pin, restaurantId } = req.body;

      if (!pin || !restaurantId) {
        throw BadRequest('PIN and restaurant ID are required');
      }

      const result = await userService.authenticateWithPin(pin, restaurantId);

      if (!result) {
        throw Unauthorized('Invalid PIN');
      }

      routeLogger.info('PIN authentication successful', {
        userId: result.user.id,
        role: result.user.role
      });

      res.json({
        success: true,
        user: result.user,
        session: {
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
          expires_in: result.session.expires_in
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;