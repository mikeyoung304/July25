import React from 'react';
import { ProtectedRoute, type ProtectedRouteProps } from './ProtectedRoute';

/**
 * HOC version of ProtectedRoute for wrapping components
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}