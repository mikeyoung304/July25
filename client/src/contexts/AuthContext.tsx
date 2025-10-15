import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/core/supabase';
import { httpClient } from '@/services/http/httpClient';
import { logger } from '@/services/logger';

interface User {
  id: string;
  email?: string;
  displayName?: string;
  phone?: string;
  employeeId?: string;
  role?: string;
  scopes?: string[];
}

interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: number;
}

export interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  restaurantId: string | null;
  
  // Authentication methods
  login: (email: string, password: string, restaurantId: string) => Promise<void>;
  loginWithPin: (pin: string, restaurantId: string) => Promise<void>;
  loginAsStation: (stationType: string, stationName: string, restaurantId: string) => Promise<void>;
  loginAsDemo: (role: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  
  // Helpers
  hasRole: (role: string) => boolean;
  hasScope: (scope: string) => boolean;
  canAccess: (requiredRoles: string[], requiredScopes?: string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook moved to auth.hooks.ts for better Fast Refresh compatibility

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Initialize auth state from Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        logger.info('🔄 Initializing auth context...');

        // Check for existing Supabase session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();

        if (supabaseSession) {
          logger.info('✅ Found existing Supabase session');

          // Fetch user details from backend
          try {
            const response = await httpClient.get<{ user: User; restaurantId: string }>(
              '/api/v1/auth/me'
            );

            setUser(response.user);
            setRestaurantId(response.restaurantId);
            setSession({
              accessToken: supabaseSession.access_token,
              refreshToken: supabaseSession.refresh_token,
              expiresIn: supabaseSession.expires_in,
              expiresAt: supabaseSession.expires_at
            });

            logger.info('✅ User authenticated');
          } catch (error) {
            // Session invalid or backend unreachable, clear it
            logger.warn('Failed to fetch user details, clearing session', error);
            await supabase.auth.signOut();
          }
        } else {
          logger.info('No Supabase session found');

          // Check for PIN/station session in localStorage (fallback for kiosk/staff)
          const savedSession = localStorage.getItem('auth_session');
          if (savedSession) {
            try {
              const parsed = JSON.parse(savedSession);
              if (parsed.expiresAt && parsed.expiresAt > Date.now() / 1000) {
                // Session still valid, restore it
                setUser(parsed.user);
                setSession(parsed.session);
                setRestaurantId(parsed.restaurantId);
                logger.info('✅ Restored PIN/Station session');
              } else {
                // Session expired, clear it
                localStorage.removeItem('auth_session');
                logger.info('Cleared expired localStorage session');
              }
            } catch (error) {
              logger.error('Failed to parse saved session:', error);
              localStorage.removeItem('auth_session');
            }
          }
        }
      } catch (error) {
        logger.error('Failed to initialize auth:', error);
      } finally {
        logger.info('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Fetch user details when signed in
        try {
          const response = await httpClient.get<{ user: User; restaurantId: string }>(
            '/api/v1/auth/me'
          );
          setUser(response.user);
          setRestaurantId(response.restaurantId);
          setSession({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresIn: session.expires_in,
            expiresAt: session.expires_at
          });
        } catch (error) {
          logger.error('Failed to fetch user details:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setRestaurantId(null);
        localStorage.removeItem('auth_session');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresIn: session.expires_in,
          expiresAt: session.expires_at
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Email/password login (Pure Supabase Auth)
  const login = async (email: string, password: string, restaurantId: string) => {
    console.log('🔐 [AuthContext] login() START:', { email, restaurantId });
    setIsLoading(true);
    try {
      console.log('🔐 [AuthContext] Step A: Calling supabase.auth.signInWithPassword');
      const supabaseStart = Date.now();
      logger.info('🔐 Attempting Supabase login');

      // 1. Authenticate with Supabase directly
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      const supabaseDuration = Date.now() - supabaseStart;
      console.log(`🔐 [AuthContext] Step B: Supabase auth completed in ${supabaseDuration}ms`);

      if (authError || !authData.session) {
        console.error('🔐 [AuthContext] ERROR: Supabase authentication failed:', authError);
        logger.error('Supabase authentication failed:', authError);
        throw new Error(authError?.message || 'Login failed');
      }

      logger.info('✅ Supabase authentication successful');

      // 2. Fetch user profile and role from backend
      console.log('🔐 [AuthContext] Step C: Calling /api/v1/auth/me');
      const authMeStart = Date.now();

      // (httpClient will automatically use the Supabase session we just created)
      const response = await httpClient.get<{ user: User; restaurantId: string }>(
        '/api/v1/auth/me'
      );

      const authMeDuration = Date.now() - authMeStart;
      console.log(`🔐 [AuthContext] Step D: /auth/me completed in ${authMeDuration}ms`);

      // 3. Update React state
      console.log('🔐 [AuthContext] Step E: Setting user state');
      setUser(response.user);
      setRestaurantId(response.restaurantId);
      setSession({
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresIn: authData.session.expires_in,
        expiresAt: authData.session.expires_at
      });

      console.log('🔐 [AuthContext] Step F: login() COMPLETE');

      logger.info('✅ Login complete');

    } catch (error) {
      console.error('🔐 [AuthContext] ERROR in login():', error);
      logger.error('Login failed:', error);
      // Clean up on error
      await supabase.auth.signOut();
      throw error;
    } finally {
      console.log('🔐 [AuthContext] login() setting isLoading=false');
      setIsLoading(false);
    }
  };

  // PIN login
  const loginWithPin = async (pin: string, restaurantId: string) => {
    setIsLoading(true);
    try {
      const response = await httpClient.post<{
        user: User;
        token: string;
        expiresIn: number;
        restaurantId: string;
      }>('/api/v1/auth/pin-login', {
        pin,
        restaurantId
      });

      setUser(response.user);
      setRestaurantId(response.restaurantId);
      
      const expiresAt = Math.floor(Date.now() / 1000) + response.expiresIn;
      const sessionData = {
        accessToken: response.token,
        expiresIn: response.expiresIn,
        expiresAt
      };
      
      setSession(sessionData);
      
      // Save PIN session to localStorage
      localStorage.setItem('auth_session', JSON.stringify({
        user: response.user,
        session: sessionData,
        restaurantId: response.restaurantId
      }));

      logger.info('PIN login successful');
    } catch (error) {
      logger.error('PIN login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Station login
  const loginAsStation = async (stationType: string, stationName: string, restaurantId: string) => {
    setIsLoading(true);
    try {
      const response = await httpClient.post<{
        token: string;
        expiresAt: string;
        stationType: string;
        stationName: string;
        restaurantId: string;
      }>('/api/v1/auth/station-login', {
        stationType,
        stationName,
        restaurantId
      });

      const stationUser: User = {
        id: `station-${stationType}-${stationName}`,
        displayName: `${stationName} (${stationType})`,
        role: stationType,
        scopes: ['orders:read', 'orders:status']
      };

      setUser(stationUser);
      setRestaurantId(response.restaurantId);
      
      const expiresAt = Math.floor(new Date(response.expiresAt).getTime() / 1000);
      const sessionData = {
        accessToken: response.token,
        expiresAt
      };
      
      setSession(sessionData);
      
      // Save station session to localStorage
      localStorage.setItem('auth_session', JSON.stringify({
        user: stationUser,
        session: sessionData,
        restaurantId: response.restaurantId
      }));

      logger.info('Station login successful');
    } catch (error) {
      logger.error('Station login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login - requests a short-lived demo token from the server
  const loginAsDemo = async (role: string) => {
    // Only available when demo panel is explicitly enabled
    if (import.meta.env.VITE_DEMO_PANEL !== '1') {
      throw new Error('Demo login requires VITE_DEMO_PANEL=1');
    }

    setIsLoading(true);
    try {
      const defaultRestaurantId = '11111111-1111-1111-1111-111111111111';

      // Request demo session from server (no credentials in client)
      const response = await httpClient.post<{
        user: User;
        token: string;
        expiresIn: number;
        restaurantId: string;
      }>('/api/v1/auth/demo-session', {
        role,
        restaurantId: defaultRestaurantId
      });

      setUser(response.user);
      setRestaurantId(response.restaurantId);

      const expiresAt = Math.floor(Date.now() / 1000) + response.expiresIn;
      const sessionData = {
        accessToken: response.token,
        expiresIn: response.expiresIn,
        expiresAt
      };

      setSession(sessionData);

      // Save demo session to localStorage
      localStorage.setItem('auth_session', JSON.stringify({
        user: response.user,
        session: sessionData,
        restaurantId: response.restaurantId
      }));

      logger.info('Demo session started');
    } catch (error) {
      logger.error('Demo login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      // Call logout endpoint
      await httpClient.post('/api/v1/auth/logout');
      
      // Clear local state
      setUser(null);
      setSession(null);
      setRestaurantId(null);
      
      // Clear localStorage
      localStorage.removeItem('auth_session');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      logger.info('Logout successful');
    } catch (error) {
      logger.error('Logout failed:', error);
      // Clear state even if logout fails
      setUser(null);
      setSession(null);
      setRestaurantId(null);
      localStorage.removeItem('auth_session');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh session
  const refreshSession = async () => {
    if (!session?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await httpClient.post<{
        session: {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };
      }>('/api/v1/auth/refresh', {
        refreshToken: session.refreshToken
      });

      const expiresAt = Math.floor(Date.now() / 1000) + response.session.expires_in;
      
      setSession({
        accessToken: response.session.access_token,
        refreshToken: response.session.refresh_token,
        expiresIn: response.session.expires_in,
        expiresAt
      });

      logger.info('Session refreshed successfully');
    } catch (error) {
      logger.error('Session refresh failed:', error);
      throw error;
    }
  };

  // Set PIN for current user
  const setPin = async (pin: string) => {
    if (!user || !restaurantId) {
      throw new Error('Must be logged in to set PIN');
    }

    try {
      await httpClient.post('/api/v1/auth/set-pin', {
        pin,
        restaurantId
      });

      logger.info('PIN set successfully');
    } catch (error) {
      logger.error('Failed to set PIN:', error);
      throw error;
    }
  };

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  // Check if user has a specific scope
  const hasScope = (scope: string): boolean => {
    return user?.scopes?.includes(scope) || false;
  };

  // Check if user can access based on roles and scopes
  const canAccess = (requiredRoles: string[], requiredScopes?: string[]): boolean => {
    if (!user) {
      logger.warn('canAccess: No user object', { requiredRoles, requiredScopes });
      return false;
    }

    // Check role requirement
    const hasRequiredRole = requiredRoles.length === 0 ||
                           requiredRoles.includes(user.role || '');

    // Check scope requirement
    const hasRequiredScope = !requiredScopes ||
                            requiredScopes.length === 0 ||
                            requiredScopes.some(scope => hasScope(scope));

    // 🔍 DEBUG LOGGING (non-sensitive)
    logger.debug('canAccess check', {
      hasRequiredRole,
      hasRequiredScope,
      result: hasRequiredRole && hasRequiredScope
    });

    return hasRequiredRole && hasRequiredScope;
  };

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!session?.expiresAt || !session.refreshToken) return;

    // Refresh 5 minutes before expiry
    const refreshTime = (session.expiresAt - 300) * 1000 - Date.now();
    
    if (refreshTime <= 0) {
      // Token already expired or about to expire
      refreshSession().catch(error => {
        logger.error('Auto-refresh failed:', error);
        logout(); // Logout if refresh fails
      });
      return;
    }

    const timer = setTimeout(() => {
      refreshSession().catch(error => {
        logger.error('Auto-refresh failed:', error);
        logout(); // Logout if refresh fails
      });
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [session?.expiresAt, session?.refreshToken, refreshSession]);

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    restaurantId,
    login,
    loginWithPin,
    loginAsStation,
    loginAsDemo,
    logout,
    refreshSession,
    setPin,
    hasRole,
    hasScope,
    canAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}