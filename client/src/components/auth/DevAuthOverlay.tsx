import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth.hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, ChefHat, Package, CreditCard, Settings, ShoppingCart } from 'lucide-react';
import { logger } from '@/services/logger';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { WORKSPACE_CONFIG } from '@/config/demoCredentials';

interface DemoRole {
  id: string;
  name: string;
  icon: React.ReactNode;
  iconBg: string;
  workspaceType: 'server' | 'kitchen' | 'expo' | 'admin';
}

const demoRoles: DemoRole[] = [
  {
    id: 'manager',
    name: 'Manager',
    icon: <Settings className="h-6 w-6" />,
    iconBg: 'bg-gray-500/10 text-gray-600',
    workspaceType: 'admin'
  },
  {
    id: 'server',
    name: 'Server',
    icon: <Users className="h-6 w-6" />,
    iconBg: 'bg-blue-500/10 text-blue-600',
    workspaceType: 'server'
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: <ChefHat className="h-6 w-6" />,
    iconBg: 'bg-orange-500/10 text-orange-600',
    workspaceType: 'kitchen'
  },
  {
    id: 'expo',
    name: 'Expo',
    icon: <Package className="h-6 w-6" />,
    iconBg: 'bg-purple-500/10 text-purple-600',
    workspaceType: 'expo'
  }
];

export function DevAuthOverlay() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Default restaurant ID (from environment or hardcoded for dev)
  const restaurantId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || 'grow';

  // Only render when demo panel is explicitly enabled
  if (import.meta.env.VITE_DEMO_PANEL !== '1') {
    return null;
  }

  const handleRoleSelect = async (role: DemoRole) => {
    console.log('🎯 [DevAuth] Step 1: handleRoleSelect started for', role.name);
    setIsLoading(true);
    setSelectedRole(role.id);

    try {
      // Get workspace credentials for this role
      const workspace = WORKSPACE_CONFIG[role.workspaceType];
      if (!workspace.workspaceCredentials) {
        throw new Error(`No credentials configured for ${role.name}`);
      }

      console.log('🎯 [DevAuth] Step 2: Logging in with workspace credentials for', role.name);
      const loginStart = Date.now();

      // Login with real Supabase credentials (v6.0.15+)
      await login(
        workspace.workspaceCredentials.email,
        workspace.workspaceCredentials.password,
        restaurantId
      );

      const loginDuration = Date.now() - loginStart;
      console.log(`🎯 [DevAuth] Step 3: login() completed in ${loginDuration}ms`);

      logger.info(`✅ Workspace login completed for ${role.name}, session ready`);
      toast.success(`Logged in as ${role.name}`);

      // Navigate to staff home page (navigation hub)
      const destination = '/home';

      console.log('🎯 [DevAuth] Step 4: Waiting 100ms before navigation');
      // Small delay to ensure React state updates propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use React Router navigation
      console.log(`🎯 [DevAuth] Step 5: Navigating to ${destination}`);
      logger.info(`🚀 Navigating to ${destination}`);
      navigate(destination, { replace: true });

      console.log('🎯 [DevAuth] Step 6: Navigation called, handleRoleSelect complete');
    } catch (error) {
      console.error('🎯 [DevAuth] ERROR in handleRoleSelect:', error);
      logger.error(`Workspace login failed for ${role.name}:`, error);
      toast.error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('🎯 [DevAuth] Step 7: Cleaning up loading state');
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
            Select a workspace to login with real credentials
          </p>
          <div className="mt-2 inline-flex items-center gap-2 text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
            Dev Mode • Real Supabase Auth
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