import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth.hooks';
import { Button } from '@/components/ui/button';
import { logger } from '@/services/logger';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  logger.info('[UnauthorizedPage] Access denied page rendered', {
    user: user?.email,
    role: user?.role,
    isAuthenticated
  });

  const handleGoHome = () => {
    navigate('/');
  };

  const handleLoginDifferentAccount = async () => {
    await logout();
    navigate('/login');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Access Denied
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              You don't have permission to access this page.
            </p>

            {user && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <p className="text-sm text-gray-700">
                  Current role: <span className="font-semibold">{user.role || 'None'}</span>
                </p>
                {user.email && (
                  <p className="text-xs text-gray-500 mt-1">
                    Logged in as: {user.email}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleGoHome}
                variant="primary"
                className="w-full"
              >
                Go to Home
              </Button>

              <Button
                onClick={handleGoBack}
                variant="secondary"
                className="w-full"
              >
                Go Back
              </Button>

              {isAuthenticated && (
                <Button
                  onClick={handleLoginDifferentAccount}
                  variant="outline"
                  className="w-full"
                >
                  Login with Different Account
                </Button>
              )}
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>If you believe you should have access to this page,</p>
              <p>please contact your manager or system administrator.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;