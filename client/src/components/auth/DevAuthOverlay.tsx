import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth.hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, ChefHat, Package, CreditCard, Settings, ShoppingCart } from 'lucide-react';
import { logger } from '@/services/logger';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface DemoRole {
  id: string;
  name: string;
  icon: React.ReactNode;
  email: string;
  password: string;
  pin?: string;
  iconBg: string;
}

const demoRoles: DemoRole[] = [
  {
    id: 'manager',
    name: 'Manager',
    icon: <Settings className="h-6 w-6" />,
    iconBg: 'bg-gray-500/10 text-gray-600',
    email: 'manager@restaurant.com',
    password: 'Demo123!',
    pin: '1234'
  },
  {
    id: 'server',
    name: 'Server',
    icon: <Users className="h-6 w-6" />,
    iconBg: 'bg-blue-500/10 text-blue-600',
    email: 'server@restaurant.com',
    password: 'Demo123!',
    pin: '5678'
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: <ChefHat className="h-6 w-6" />,
    iconBg: 'bg-orange-500/10 text-orange-600',
    email: 'kitchen@restaurant.com',
    password: 'Demo123!',
    pin: '9012'
  },
  {
    id: 'expo',
    name: 'Expo',
    icon: <Package className="h-6 w-6" />,
    iconBg: 'bg-purple-500/10 text-purple-600',
    email: 'expo@restaurant.com',
    password: 'Demo123!',
    pin: '3456'
  },
  {
    id: 'cashier',
    name: 'Cashier',
    icon: <CreditCard className="h-6 w-6" />,
    iconBg: 'bg-green-500/10 text-green-600',
    email: 'cashier@restaurant.com',
    password: 'Demo123!',
    pin: '7890'
  },
  {
    id: 'orders',
    name: 'Orders',
    icon: <ShoppingCart className="h-6 w-6" />,
    iconBg: 'bg-indigo-500/10 text-indigo-600',
    email: 'server@restaurant.com',
    password: 'Demo123!',
    pin: '5678'
  }
];

export function DevAuthOverlay() {
  const { login, loginWithPin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Only render when demo panel is explicitly enabled
  if (import.meta.env.VITE_DEMO_PANEL !== '1') {
    return null;
  }

  const handleRoleSelect = async (role: DemoRole) => {
    setIsLoading(true);
    setSelectedRole(role.id);
    const restaurantId = '11111111-1111-1111-1111-111111111111';

    try {
      await login(role.email, role.password, restaurantId);
      toast.success(`Logged in as ${role.name}`);
      logger.info(`Demo login successful as ${role.name}`);

      // Navigate to appropriate dashboard based on role
      const roleRoutes: Record<string, string> = {
        manager: '/',
        server: '/server',
        kitchen: '/kitchen',
        expo: '/expo',
        cashier: '/'
      };

      const destination = roleRoutes[role.id] || '/dashboard';
      window.location.href = destination; // Use location.href for full page reload to ensure state updates
    } catch (error) {
      logger.error(`Demo login failed for ${role.name}:`, error);
      toast.error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="mt-12 pb-8">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500">Quick Demo Access</span>
            </div>
          </div>
          <p className="text-gray-600 mt-4 text-sm">
            Select a role to instantly log in
          </p>
          <div className="mt-2 inline-flex items-center gap-2 text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
            Demo Mode • Password: Demo123!
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {demoRoles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Card
                className="h-full min-h-[120px] group cursor-pointer hover:shadow-lg transition-all duration-300 border-gray-200"
                onClick={() => handleRoleSelect(role)}
              >
                <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
                  <div className={`p-2 rounded-xl transition-transform duration-300 group-hover:scale-110 ${role.iconBg}`}>
                    {role.icon}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {role.name}
                  </h3>
                  {isLoading && selectedRole === role.id && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}