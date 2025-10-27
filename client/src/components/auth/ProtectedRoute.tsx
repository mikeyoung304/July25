import React, { ReactNode, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth.hooks';
import { logger } from '@/services/logger';
import { WorkspaceAuthModal } from './WorkspaceAuthModal';
import { WorkspaceType } from '@/config/demoCredentials';
import { env } from '@/utils/env';

export interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredScopes?: string[];
  fallbackPath?: string;
  requireAuth?: boolean;
}

/**
 * ProtectedRoute component for securing routes based on authentication and authorization
 * 
 * @param children - The components to render if authorized
 * @param requiredRoles - Array of roles that can access this route (OR logic)
 * @param requiredScopes - Array of scopes required to access this route (OR logic)
 * @param fallbackPath - Where to redirect if not authorized (default: /login)
 * @param requireAuth - Whether authentication is required (default: true)
 */
export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredScopes = [],
  fallbackPath = '/login',
  requireAuth = true
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, canAccess, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Check if workspace landing feature is enabled
  const workspaceLandingEnabled = env.VITE_WORKSPACE_LANDING_ENABLED === '1';

  // Map route paths to workspace types for modal
  const getWorkspaceFromPath = (path: string): WorkspaceType | null => {
    if (path.startsWith('/server')) return 'server';
    if (path.startsWith('/kitchen')) return 'kitchen';
    if (path.startsWith('/expo')) return 'expo';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/kiosk')) return 'kiosk';
    if (path.startsWith('/order')) return 'online-order';
    return null;
  };

  // Show loading state while checking auth
  if (isLoading) {
    logger.info('🔄 ProtectedRoute: Auth still loading...', { path: location.pathname });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    logger.warn('❌ ProtectedRoute: Not authenticated', {
      path: location.pathname,
      redirectTo: fallbackPath,
      hasUser: !!user,
      userRole: user?.role,
      workspaceLandingEnabled
    });

    // If workspace landing is enabled, show modal for deep links
    if (workspaceLandingEnabled) {
      const workspace = getWorkspaceFromPath(location.pathname);

      if (workspace && !showModal) {
        setShowModal(true);
      }

      if (workspace && showModal) {
        return (
          <WorkspaceAuthModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              navigate('/', { replace: true });
            }}
            onSuccess={() => {
              setShowModal(false);
              // Component will re-render with isAuthenticated=true
            }}
            workspace={workspace}
            intendedDestination={location.pathname}
          />
        );
      }
    }

    // Fallback: Save the attempted location for redirect after login
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check authorization (roles and scopes)
  if (requiredRoles.length > 0 || requiredScopes.length > 0) {
    const canAccessResult = canAccess(requiredRoles, requiredScopes);

    // 🔍 ENHANCED DEBUG LOGGING
    logger.info('🔐 ProtectedRoute: Authorization check', {
      path: location.pathname,
      isAuthenticated,
      hasUser: !!user,
      userRole: user?.role,
      userScopes: user?.scopes,
      requiredRoles,
      requiredScopes,
      canAccessResult
    });

    if (!canAccessResult) {
      logger.error('❌ ProtectedRoute: ACCESS DENIED', {
        path: location.pathname,
        userRole: user?.role,
        userScopes: user?.scopes,
        requiredRoles,
        requiredScopes,
        reason: !user?.role
          ? 'User has no role'
          : !requiredRoles.includes(user.role)
            ? `User role '${user.role}' not in required roles [${requiredRoles.join(', ')}]`
            : 'Scope check failed'
      });

      // Redirect to unauthorized page or home
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authorized, render children
  logger.info('✅ ProtectedRoute: Access granted', { path: location.pathname, userRole: user?.role });
  return <>{children}</>;
}

// HOC moved to withProtectedRoute.tsx for better Fast Refresh compatibility

/**
 * Role-specific route guards for common use cases
 */
export function ManagerRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['owner', 'manager']}>
      {children}
    </ProtectedRoute>
  );
}

export function ServerRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['owner', 'manager', 'server']}>
      {children}
    </ProtectedRoute>
  );
}

export function KitchenRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['owner', 'manager', 'kitchen', 'expo']}>
      {children}
    </ProtectedRoute>
  );
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['owner', 'manager']}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * Public route that doesn't require authentication
 */
export function PublicRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requireAuth={false}>
      {children}
    </ProtectedRoute>
  );
}