import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth.hooks';
import { 
  User, 
  LogOut, 
  ChevronDown, 
  UserCircle, 
  UserCheck,
  Clock,
  Shield
} from 'lucide-react';
import { logger } from '@/services/logger';

interface UserMenuProps {
  className?: string;
  position?: 'header' | 'nav' | 'floating';
  showDetails?: boolean;
}

export function UserMenu({
  className = '',
  position: _position = 'header',
  showDetails = true
}: UserMenuProps) {
  const { user, logout, isAuthenticated, restaurantId } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    if (!showLogoutConfirm) {
      setShowLogoutConfirm(true);
      return;
    }

    try {
      logger.info('User initiated logout', { userId: user.id, role: user.role });
      await logout();
      navigate('/login');
    } catch (error) {
      logger.error('Logout failed', error);
      // Still navigate to login even if logout fails
      navigate('/login');
    }
  };

  const handleSwitchUser = () => {
    // For quick switching without full logout
    setIsOpen(false);
    navigate('/pin-login');
  };

  // Format display name and role
  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const roleDisplay = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  // Role-based color coding
  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'owner':
      case 'manager':
        return 'text-purple-600 bg-purple-50';
      case 'server':
        return 'text-blue-600 bg-blue-50';
      case 'kitchen':
      case 'expo':
        return 'text-green-600 bg-green-50';
      case 'cashier':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* User Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2">
          <UserCircle className="w-8 h-8 text-gray-600" />
          {showDetails && (
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">{displayName}</div>
              <div className={`text-xs font-medium ${getRoleColor(user.role).split(' ')[0]}`}>
                {roleDisplay}
              </div>
            </div>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${getRoleColor(user.role).split(' ')[1]}`}>
                <User className={`w-6 h-6 ${getRoleColor(user.role).split(' ')[0]}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                <p className={`text-xs font-medium ${getRoleColor(user.role).split(' ')[0]}`}>
                  {roleDisplay}
                </p>
                {user.email && (
                  <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                )}
              </div>
            </div>
            {user.employeeId && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                <span>ID: {user.employeeId}</span>
              </div>
            )}
          </div>

          {/* Session Info */}
          <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>Session active</span>
            </div>
            {restaurantId && (
              <div className="mt-1 text-xs text-gray-400">
                Restaurant: {restaurantId.slice(0, 8)}...
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="py-1">
            {/* Switch User - For shared devices */}
            <button
              onClick={handleSwitchUser}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              Switch User
              <span className="text-xs text-gray-400 ml-auto">Quick PIN</span>
            </button>

            {/* Logout Button */}
            {!showLogoutConfirm ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <div className="px-4 py-2">
                <p className="text-xs text-gray-600 mb-2">Are you sure you want to sign out?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                  >
                    Yes, Sign Out
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone logout button for simpler use cases
export function LogoutButton({ className = '' }: { className?: string }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      logger.error('Logout failed', error);
      navigate('/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors ${className}`}
      aria-label="Sign out"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  );
}