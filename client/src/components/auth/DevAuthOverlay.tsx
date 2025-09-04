import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth.hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ChefHat, Package, CreditCard, Settings } from 'lucide-react';
import { logger } from '@/services/logger';

interface DemoRole {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const demoRoles: DemoRole[] = [
  {
    id: 'manager',
    name: 'Manager',
    description: 'Full restaurant operations access',
    icon: <Settings className="h-5 w-5" />,
    color: '#2A4B5C'
  },
  {
    id: 'server', 
    name: 'Server',
    description: 'Order creation and payment processing',
    icon: <Users className="h-5 w-5" />,
    color: '#4ECDC4'
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'Kitchen display and order management',
    icon: <ChefHat className="h-5 w-5" />,
    color: '#FF6B35'
  },
  {
    id: 'expo',
    name: 'Expo',
    description: 'Order completion and expediting',
    icon: <Package className="h-5 w-5" />,
    color: '#F4A460'
  },
  {
    id: 'cashier',
    name: 'Cashier', 
    description: 'Payment processing only',
    icon: <CreditCard className="h-5 w-5" />,
    color: '#88B0A4'
  }
];

export function DevAuthOverlay() {
  const { loginAsDemo } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Only render in development with demo auth enabled
  if (import.meta.env.PROD || import.meta.env.VITE_DEMO_AUTH !== '1') {
    return null;
  }

  const handleRoleSelect = async (role: string) => {
    setIsLoading(true);
    setSelectedRole(role);
    
    try {
      await loginAsDemo(role);
      logger.info(`Demo login successful as ${role}`);
    } catch (error) {
      logger.error(`Demo login failed for ${role}:`, error);
      // Show error toast or message
    } finally {
      setIsLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 shadow-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            DEV MODE
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            FRIENDS & FAMILY
          </Badge>
        </div>
        <CardTitle className="text-2xl">Quick Demo Access</CardTitle>
        <CardDescription>
          Select a role to instantly log in with demo credentials (development only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {demoRoles.map((role) => (
            <Button
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              disabled={isLoading}
              variant="outline"
              className="h-auto flex flex-col items-center justify-center p-4 hover:shadow-md transition-all"
              style={{
                borderColor: role.color,
                backgroundColor: isLoading && selectedRole === role.id ? role.color + '20' : 'transparent'
              }}
            >
              <div 
                className="p-2 rounded-lg mb-2"
                style={{ backgroundColor: role.color + '20', color: role.color }}
              >
                {role.icon}
              </div>
              <span className="font-semibold">{role.name}</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                {role.description}
              </span>
              {isLoading && selectedRole === role.id && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 mt-2" 
                     style={{ borderColor: role.color }} />
              )}
            </Button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This demo mode is only available in development. 
            These are pre-seeded test accounts with limited data access.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}