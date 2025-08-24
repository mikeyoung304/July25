/**
 * Role Context for Restaurant Staff Management
 * Provides optional role-based access without breaking existing functionality
 * 
 * IMPORTANT: This is NON-BREAKING - all routes remain accessible without role selection
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react'

export type UserRole = 'server' | 'kitchen' | 'admin' | 'customer' | null

export interface RoleContextType {
  currentRole: UserRole
  setRole: (role: UserRole) => void
  hasRole: (role: UserRole) => boolean
  isRoleSelected: boolean
}

export const RoleContext = createContext<RoleContextType | undefined>(undefined)

interface RoleProviderProps {
  children: ReactNode
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [currentRole, setCurrentRole] = useState<UserRole>(null)

  // Load role from localStorage on mount (for persistence across sessions)
  useEffect(() => {
    const savedRole = localStorage.getItem('restaurant-user-role') as UserRole
    if (savedRole && ['server', 'kitchen', 'admin', 'customer'].includes(savedRole)) {
      setCurrentRole(savedRole)
    }
  }, [])

  const setRole = (role: UserRole) => {
    setCurrentRole(role)
    if (role) {
      localStorage.setItem('restaurant-user-role', role)
    } else {
      localStorage.removeItem('restaurant-user-role')
    }
  }

  const hasRole = (role: UserRole): boolean => {
    return currentRole === role
  }

  const isRoleSelected = currentRole !== null

  const value: RoleContextType = {
    currentRole,
    setRole,
    hasRole,
    isRoleSelected
  }

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}

// Hook is now in separate file: /hooks/useRole.ts