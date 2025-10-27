/**
 * Workspace Configuration - Single Source of Truth
 * Maps workspace types to routes, permissions, and demo credentials
 */

export type WorkspaceType = 'server' | 'kitchen' | 'kiosk' | 'online-order' | 'admin' | 'expo'

export interface WorkspaceConfig {
  route: string
  requiresAuth: boolean
  requiredRoles: string[]
  demoCredentials: {
    email: string
    password: string
  } | null
}

/**
 * Complete workspace configuration - single source of truth for all workspace metadata
 */
export const WORKSPACE_CONFIG: Record<WorkspaceType, WorkspaceConfig> = {
  server: {
    route: '/server',
    requiresAuth: true,
    requiredRoles: ['owner', 'manager', 'server'],
    demoCredentials: {
      email: 'server@restaurant.com',
      password: 'Demo123!'
    }
  },
  kitchen: {
    route: '/kitchen',
    requiresAuth: true,
    requiredRoles: ['owner', 'manager', 'kitchen'],
    demoCredentials: {
      email: 'kitchen@restaurant.com',
      password: 'Demo123!'
    }
  },
  expo: {
    route: '/expo',
    requiresAuth: true,
    requiredRoles: ['owner', 'manager', 'kitchen', 'expo'],
    demoCredentials: {
      email: 'expo@restaurant.com',
      password: 'Demo123!'
    }
  },
  admin: {
    route: '/admin',
    requiresAuth: true,
    requiredRoles: ['owner', 'manager'],
    demoCredentials: {
      email: 'manager@restaurant.com',
      password: 'Demo123!'
    }
  },
  kiosk: {
    route: '/kiosk',
    requiresAuth: false,
    requiredRoles: [],
    demoCredentials: null
  },
  'online-order': {
    route: '/order',
    requiresAuth: false,
    requiredRoles: [],
    demoCredentials: null
  }
}

/**
 * Get demo credentials for a workspace (only if demo panel is enabled)
 */
export function getDemoCredentials(workspace: WorkspaceType) {
  if (import.meta.env.VITE_DEMO_PANEL !== '1') {
    return null
  }
  return WORKSPACE_CONFIG[workspace].demoCredentials
}
