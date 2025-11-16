/**
 * Workspace Configuration - Single Source of Truth
 * Maps workspace types to routes, permissions, and REAL user credentials
 *
 * IMPORTANT: These are REAL Supabase user accounts, not fake demo sessions.
 * They work exactly like production customer accounts.
 *
 * Auto-fill is enabled when VITE_DEMO_PANEL=1 for development convenience.
 * In production (VITE_DEMO_PANEL=0), auto-fill is disabled.
 */

export type WorkspaceType = 'server' | 'kitchen' | 'kiosk' | 'online-order' | 'admin' | 'expo'

export interface WorkspaceConfig {
  route: string
  requiresAuth: boolean
  requiredRoles: string[]
  workspaceCredentials: {
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
    workspaceCredentials: {
      email: 'server@restaurant.com',
      password: 'Demo123!' // Aligned with database seed script
    }
  },
  kitchen: {
    route: '/kitchen',
    requiresAuth: true,
    requiredRoles: ['owner', 'manager', 'kitchen'],
    workspaceCredentials: {
      email: 'kitchen@restaurant.com',
      password: 'Demo123!' // Aligned with database seed script
    }
  },
  expo: {
    route: '/expo',
    requiresAuth: true,
    requiredRoles: ['owner', 'manager', 'kitchen', 'expo'],
    workspaceCredentials: {
      email: 'expo@restaurant.com',
      password: 'Demo123!' // Aligned with database seed script
    }
  },
  admin: {
    route: '/admin',
    requiresAuth: true,
    requiredRoles: ['owner', 'manager'],
    workspaceCredentials: {
      email: 'manager@restaurant.com',
      password: 'Demo123!' // Aligned with database seed script
    }
  },
  kiosk: {
    route: '/kiosk',
    requiresAuth: false,
    requiredRoles: [],
    workspaceCredentials: null
  },
  'online-order': {
    route: '/order',
    requiresAuth: false,
    requiredRoles: [],
    workspaceCredentials: null
  }
}

/**
 * Get workspace credentials for auto-fill (only if demo panel is enabled)
 *
 * IMPORTANT: These are REAL user credentials, not fake demo tokens.
 * When VITE_DEMO_PANEL=1, credentials are auto-filled for development convenience.
 * When VITE_DEMO_PANEL=0 (production), this returns null and users must enter credentials manually.
 */
export function getWorkspaceCredentials(workspace: WorkspaceType) {
  if (import.meta.env.VITE_DEMO_PANEL !== '1') {
    return null
  }
  return WORKSPACE_CONFIG[workspace].workspaceCredentials
}

// Backward compatibility alias (DEPRECATED: Use getWorkspaceCredentials instead)
export const getDemoCredentials = getWorkspaceCredentials
