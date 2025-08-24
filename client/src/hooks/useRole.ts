/**
 * Hook for consuming the Role Context
 * Separated to satisfy react-refresh/only-export-components
 */

import { useContext } from 'react'
import { RoleContext, RoleContextType } from '@/contexts/RoleContext'

export function useRole(): RoleContextType {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}