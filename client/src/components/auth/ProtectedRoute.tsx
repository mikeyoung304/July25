import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth.hooks';
import { logger } from '@/services/logger';

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
  const { isAuthenticated, isLoading, canAccess } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    logger.info('Access denied: Not authenticated', {
      path: location.pathname,
      redirectTo: fallbackPath
    });
    
    // Save the attempted location for redirect after login
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check authorization (roles and scopes)
  if (requiredRoles.length > 0 || requiredScopes.length > 0) {
    if (!canAccess(requiredRoles, requiredScopes)) {
      logger.warn('Access denied: Insufficient permissions', {
        path: location.pathname,
        requiredRoles,
        requiredScopes
      });
      
      // Redirect to unauthorized page or home
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authorized, render children
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
    <ProtectedRoute requiredRoles={['owner']}>
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