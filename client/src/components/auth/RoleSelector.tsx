/**
 * Role Selector Component
 * Provides a friendly interface for users to select their role
 * 
 * IMPORTANT: This is optional and non-blocking - users can bypass role selection
 */

import { motion } from 'framer-motion'
import { Users, ChefHat, Settings, ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRole, UserRole } from '@/contexts/RoleContext'
import { cn } from '@/utils'

interface RoleSelectorProps {
  onClose?: () => void
  showCloseButton?: boolean
}

const roleConfig = {
  server: {
    title: 'Server/Waitstaff',
    description: 'Take orders, manage tables, assist customers',
    icon: Users,
    color: 'bg-macon-navy',
    hoverColor: 'hover:bg-macon-navy/80'
  },
  kitchen: {
    title: 'Kitchen Staff',
    description: 'View orders, update cooking status, manage prep',
    icon: ChefHat,
    color: 'bg-macon-teal',
    hoverColor: 'hover:bg-macon-teal/80'
  },
  admin: {
    title: 'Manager/Admin',
    description: 'System settings, analytics, staff management',
    icon: Settings,
    color: 'bg-macon-orange',
    hoverColor: 'hover:bg-macon-orange/80'
  },
  customer: {
    title: 'Customer',
    description: 'Place orders, view menu, checkout',
    icon: ShoppingCart,
    color: 'bg-neutral-600',
    hoverColor: 'hover:bg-neutral-500'
  }
}

export function RoleSelector({ onClose, showCloseButton = true }: RoleSelectorProps) {
  const { setRole } = useRole()

  const handleRoleSelect = (role: UserRole) => {
    setRole(role)
    onClose?.()
  }

  const handleSkip = () => {
    // Allow users to continue without selecting a role
    onClose?.()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8 bg-white shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-macon-navy mb-2">
                Select Your Role
              </h2>
              <p className="text-neutral-600">
                Choose your role to customize your experience (optional)
              </p>
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {(Object.entries(roleConfig) as [UserRole, typeof roleConfig.server][]).map(([role, config]) => {
              const Icon = config.icon
              
              return (
                <motion.button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={cn(
                    "p-6 rounded-xl text-white text-left transition-all duration-200 transform hover:scale-105",
                    config.color,
                    config.hoverColor
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <Icon className="h-8 w-8 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {config.title}
                      </h3>
                      <p className="text-sm opacity-90">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="px-6"
            >
              Continue Without Role Selection
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-neutral-500">
              You can change your role anytime from the navigation menu
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}