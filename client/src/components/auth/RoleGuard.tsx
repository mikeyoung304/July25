/**
 * Role Guard Component
 * Provides gentle role-based access suggestions without blocking access
 * 
 * IMPORTANT: This is NON-BREAKING - never blocks access, only provides guidance
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Users, ChefHat, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRole, UserRole } from '@/contexts/RoleContext'

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  suggestedRoles?: UserRole[]
  pageTitle?: string
}

const roleIcons = {
  server: Users,
  kitchen: ChefHat,
  admin: Settings,
  customer: null
}

const roleNames = {
  server: 'Server/Waitstaff',
  kitchen: 'Kitchen Staff', 
  admin: 'Manager/Admin',
  customer: 'Customer'
}

export function RoleGuard({ 
  children, 
  requiredRole, 
  suggestedRoles = [], 
  pageTitle 
}: RoleGuardProps) {
  const { currentRole, setRole, isRoleSelected } = useRole()
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [hasShownSuggestion, setHasShownSuggestion] = useState(false)

  // Calculate conditions before hooks
  const hasNoRequirements = !requiredRole && suggestedRoles.length === 0
  const hasRequiredRole = requiredRole && currentRole === requiredRole
  const hasSuggestedRole = suggestedRoles.length > 0 && currentRole && suggestedRoles.includes(currentRole)
  
  // Show gentle suggestion if role is not selected or doesn't match
  const shouldShowSuggestion = !hasShownSuggestion && !hasNoRequirements && !hasRequiredRole && !hasSuggestedRole && (
    !isRoleSelected || 
    (requiredRole && currentRole !== requiredRole) ||
    (suggestedRoles.length > 0 && currentRole && !suggestedRoles.includes(currentRole))
  )

  // Hooks must always be called before any early returns
  React.useEffect(() => {
    if (shouldShowSuggestion) {
      const timer = setTimeout(() => {
        setShowSuggestion(true)
      }, 1000) // Show suggestion after 1 second
      
      return () => clearTimeout(timer)
    }
  }, [shouldShowSuggestion])

  // Now we can have conditional returns after all hooks
  // If no role requirements, always show content
  if (hasNoRequirements) {
    return <>{children}</>
  }

  // If user has the required role, show content
  if (hasRequiredRole) {
    return <>{children}</>
  }

  // If user has one of the suggested roles, show content
  if (hasSuggestedRole) {
    return <>{children}</>
  }

  const handleRoleSelect = (role: UserRole) => {
    setRole(role)
    setShowSuggestion(false)
    setHasShownSuggestion(true)
  }

  const handleDismiss = () => {
    setShowSuggestion(false)
    setHasShownSuggestion(true)
  }

  const targetRole = requiredRole || suggestedRoles[0]
  const Icon = targetRole ? roleIcons[targetRole] : AlertCircle

  return (
    <>
      {/* Always show the content - never block access */}
      {children}
      
      {/* Show optional role suggestion overlay */}
      <AnimatePresence>
        {showSuggestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-4 right-4 z-40 max-w-sm"
          >
            <Card className="p-4 bg-white shadow-xl border-l-4 border-l-macon-orange">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {Icon && <Icon className="h-5 w-5 text-macon-orange mt-0.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-macon-navy mb-1">
                    {pageTitle ? `${pageTitle} Access` : 'Role Suggestion'}
                  </h4>
                  <p className="text-xs text-neutral-600 mb-3">
                    {requiredRole 
                      ? `This page is designed for ${roleNames[requiredRole]} users.`
                      : `This page works best for ${suggestedRoles.filter(r => r && roleNames[r]).map(r => roleNames[r!]).join(' or ')} users.`
                    }
                    {' '}Would you like to switch roles for a better experience?
                  </p>
                  <div className="flex items-center gap-2">
                    {targetRole && (
                      <Button
                        size="sm"
                        onClick={() => handleRoleSelect(targetRole)}
                        className="text-xs px-3 py-1 h-6 bg-macon-orange hover:bg-macon-orange/80"
                      >
                        Switch to {roleNames[targetRole]}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      className="text-xs px-2 py-1 h-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}