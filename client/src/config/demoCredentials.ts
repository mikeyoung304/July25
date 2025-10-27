/**
 * Demo Credentials Configuration
 * Maps workspace types to their corresponding demo user credentials
 * Used by WorkspaceAuthModal for pre-filling credentials in demo mode
 */

export type WorkspaceType = 'server' | 'kitchen' | 'kiosk' | 'online-order' | 'admin' | 'expo'

export interface DemoCredentials {
  email: string
  password: string
  role: string
}

/**
 * Demo credentials for each workspace
 * Only used when VITE_DEMO_PANEL=1
 */
export const DEMO_CREDENTIALS: Record<WorkspaceType, DemoCredentials | null> = {
  server: {
    email: 'server@restaurant.com',
    password: 'Demo123!',
    role: 'server'
  },
  kitchen: {
    email: 'kitchen@restaurant.com',
    password: 'Demo123!',
    role: 'kitchen'
  },
  expo: {
    email: 'expo@restaurant.com',
    password: 'Demo123!',
    role: 'expo'
  },
  admin: {
    email: 'manager@restaurant.com',
    password: 'Demo123!',
    role: 'manager'
  },
  // No demo credentials for public workspaces (they don't require auth)
  kiosk: null,
  'online-order': null
}

/**
 * Workspaces that require authentication
 */
export const PROTECTED_WORKSPACES: WorkspaceType[] = [
  'server',
  'kitchen',
  'expo',
  'admin'
]

/**
 * Workspaces that are publicly accessible without authentication
 */
export const PUBLIC_WORKSPACES: WorkspaceType[] = [
  'kiosk',
  'online-order'
]

/**
 * Get demo credentials for a specific workspace
 * Returns null if workspace doesn't have demo credentials or demo mode is disabled
 */
export function getDemoCredentials(workspace: WorkspaceType): DemoCredentials | null {
  // Only return credentials if demo panel is enabled
  if (import.meta.env.VITE_DEMO_PANEL !== '1') {
    return null
  }

  return DEMO_CREDENTIALS[workspace]
}

/**
 * Check if a workspace requires authentication
 */
export function isProtectedWorkspace(workspace: WorkspaceType): boolean {
  return PROTECTED_WORKSPACES.includes(workspace)
}

/**
 * Get the destination route for a workspace
 */
export function getWorkspaceRoute(workspace: WorkspaceType): string {
  switch (workspace) {
    case 'server':
      return '/server'
    case 'kitchen':
      return '/kitchen'
    case 'kiosk':
      return '/kiosk'
    case 'online-order':
      return '/order'
    case 'admin':
      return '/admin'
    case 'expo':
      return '/expo'
    default:
      return '/'
  }
}

/**
 * Get required roles for a workspace
 * Used for permission checking
 */
export function getWorkspaceRequiredRoles(workspace: WorkspaceType): string[] {
  switch (workspace) {
    case 'server':
      return ['owner', 'manager', 'server']
    case 'kitchen':
      return ['owner', 'manager', 'kitchen']
    case 'expo':
      return ['owner', 'manager', 'kitchen', 'expo']
    case 'admin':
      return ['owner', 'manager']
    case 'kiosk':
    case 'online-order':
      return [] // No roles required (public)
    default:
      return []
  }
}
