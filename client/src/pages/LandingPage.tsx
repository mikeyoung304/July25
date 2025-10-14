import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, LogIn, Users, ChefHat, Package, CreditCard, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/auth.hooks'
import { toast } from 'react-hot-toast'
import { logger } from '@/services/logger'

interface DemoRole {
  id: string
  name: string
  icon: React.ReactNode
  email: string
  password: string
  iconBg: string
}

const demoRoles: DemoRole[] = [
  {
    id: 'manager',
    name: 'Manager',
    icon: <Settings className="h-5 w-5" />,
    iconBg: 'bg-gray-500/10 text-gray-600',
    email: 'manager@restaurant.com',
    password: 'Demo123!'
  },
  {
    id: 'server',
    name: 'Server',
    icon: <Users className="h-5 w-5" />,
    iconBg: 'bg-blue-500/10 text-blue-600',
    email: 'server@restaurant.com',
    password: 'Demo123!'
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: <ChefHat className="h-5 w-5" />,
    iconBg: 'bg-orange-500/10 text-orange-600',
    email: 'kitchen@restaurant.com',
    password: 'Demo123!'
  },
  {
    id: 'expo',
    name: 'Expo',
    icon: <Package className="h-5 w-5" />,
    iconBg: 'bg-purple-500/10 text-purple-600',
    email: 'expo@restaurant.com',
    password: 'Demo123!'
  },
  {
    id: 'cashier',
    name: 'Cashier',
    icon: <CreditCard className="h-5 w-5" />,
    iconBg: 'bg-green-500/10 text-green-600',
    email: 'cashier@restaurant.com',
    password: 'Demo123!'
  }
]

export function LandingPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null)

  // Check if demo panel is enabled
  const showDemoPanel = import.meta.env.VITE_DEMO_PANEL === '1'

  const handleDemoLogin = async (role: DemoRole) => {
    setIsLoading(true)
    setSelectedRole(role.id)
    const restaurantId = '11111111-1111-1111-1111-111111111111'

    try {
      await login(role.email, role.password, restaurantId)
      logger.info(`✅ Demo login completed for ${role.name}`)
      toast.success(`Logged in as ${role.name}`)

      // Navigate to staff home page
      await new Promise(resolve => setTimeout(resolve, 100))
      navigate('/home', { replace: true })
    } catch (error) {
      logger.error(`Demo login failed for ${role.name}:`, error)
      toast.error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
      setSelectedRole(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Logo and Title */}
      <motion.div
        className="text-center pt-8 pb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src="/transparent.png"
          alt="MACON AI SOLUTIONS"
          className="h-16 md:h-20 w-auto mx-auto mb-4 object-contain"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Restaurant OS
        </h1>
        <p className="text-gray-600 mt-2 text-base md:text-lg">Welcome to the future of restaurant management</p>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-12">
        {/* Customer Ordering Section */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 md:p-12 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                  <ShoppingCart className="h-10 w-10" />
                  <h2 className="text-3xl md:text-4xl font-bold">Order Online</h2>
                </div>
                <p className="text-blue-100 text-lg md:text-xl mb-6">
                  Browse our menu and place your order for pickup or delivery
                </p>
                <Link
                  to="/order"
                  className="inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  data-testid="start-order-button"
                >
                  <ShoppingCart className="h-6 w-6" />
                  Start Your Order
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-6xl">🍕</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Staff Login Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border border-gray-200">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <LogIn className="h-8 w-8 text-gray-700" />
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Staff Access</h2>
              </div>
              <p className="text-gray-600">Login to access your workspace</p>
            </div>

            {/* Demo Login Buttons (Dev Mode Only) */}
            {showDemoPanel && (
              <div className="mb-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Quick Demo Access</span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full mb-4 mx-auto">
                  Demo Mode • Password: Demo123!
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {demoRoles.map((role, index) => (
                    <motion.button
                      key={role.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
                      onClick={() => handleDemoLogin(role)}
                      disabled={isLoading}
                      className="relative group bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-2 rounded-lg transition-transform duration-300 group-hover:scale-110 ${role.iconBg}`}>
                          {role.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{role.name}</span>
                      </div>
                      {isLoading && selectedRole === role.id && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or</span>
                  </div>
                </div>
              </div>
            )}

            {/* Full Login Link */}
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200"
              >
                <LogIn className="h-5 w-5" />
                {showDemoPanel ? 'Email/Password Login' : 'Staff Login'}
              </Link>
            </div>

            {/* Additional Login Options */}
            <div className="mt-6 text-center text-sm text-gray-600">
              <div className="flex justify-center gap-4">
                <Link to="/pin-login" className="hover:text-blue-600 transition-colors">
                  PIN Login
                </Link>
                <span className="text-gray-400">•</span>
                <Link to="/station-login" className="hover:text-blue-600 transition-colors">
                  Station Login
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 text-sm text-gray-500">
        <p>&copy; 2025 MACON AI Solutions. All rights reserved.</p>
      </div>
    </div>
  )
}
