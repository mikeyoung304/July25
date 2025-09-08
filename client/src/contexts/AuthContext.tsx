import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/core/supabase';
import { httpClient } from '@/services/http/httpClient';
import { logger } from '@/services/logger';
import { setAuthContextSession } from '@/services/auth';

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

        // Check for existing Supabase session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (supabaseSession) {
          // Validate the session is still valid with our backend
          try {
            const response = await httpClient.get<{ user: User; restaurantId: string }>(
              '/api/v1/auth/me'
            );
            
            setUser(response.user);
            setRestaurantId(response.restaurantId);
            
            // Set session and immediately sync to bridge
            const sessionData = {
              accessToken: supabaseSession.access_token,
              refreshToken: supabaseSession.refresh_token,
              expiresIn: supabaseSession.expires_in,
              expiresAt: supabaseSession.expires_at
            };
            setSession(sessionData);
            
            // CRITICAL: Immediately sync to auth bridge for voice/WebSocket
            setAuthContextSession(sessionData);
            logger.info('[AuthContext] Restored Supabase session and synced to bridge');
          } catch (error) {
            // Session invalid, clear it
            logger.error('Supabase session invalid, clearing...', error);
            await supabase.auth.signOut();
            // Don't set any state, let the user log in
          }
        } else {
          // Check for PIN/station session in localStorage
          const savedSession = localStorage.getItem('auth_session');
          if (savedSession) {
            try {
              const parsed = JSON.parse(savedSession);
              if (parsed.expiresAt && parsed.expiresAt > Date.now() / 1000) {
                // Session still valid, restore it
                setUser(parsed.user);
                setSession(parsed.session);
                setRestaurantId(parsed.restaurantId);
                
                // CRITICAL: Immediately sync to auth bridge for voice/WebSocket
                setAuthContextSession(parsed.session);
                logger.info('[AuthContext] Restored localStorage session and synced to bridge');
              } else {
                // Session expired, clear it
                localStorage.removeItem('auth_session');
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
          
          const sessionData = {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresIn: session.expires_in,
            expiresAt: session.expires_at
          };
          setSession(sessionData);
          
          // CRITICAL: Immediately sync to auth bridge
          setAuthContextSession(sessionData);
          logger.info('[AuthContext] Auth state change: SIGNED_IN - synced to bridge');
        } catch (error) {
          logger.error('Failed to fetch user details:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setRestaurantId(null);
        localStorage.removeItem('auth_session');
        
        // CRITICAL: Clear auth bridge on signout
        setAuthContextSession(null);
        logger.info('[AuthContext] Auth state change: SIGNED_OUT - cleared bridge');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        const sessionData = {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresIn: session.expires_in,
          expiresAt: session.expires_at
        };
        setSession(sessionData);
        
        // CRITICAL: Immediately sync refreshed token to auth bridge
        setAuthContextSession(sessionData);
        logger.info('[AuthContext] Auth state change: TOKEN_REFRESHED - synced to bridge');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Email/password login
  const login = async (email: string, password: string, restaurantId: string) => {
    setIsLoading(true);
    try {
      const response = await httpClient.post<{
        user: User;
        session: {
          access_token: string;
          refresh_token?: string;
          expires_in?: number;
        };
        restaurantId: string;
      }>('/api/v1/auth/login', {
        email,
        password,
        restaurantId
      });

      setUser(response.user);
      setRestaurantId(response.restaurantId);
      
      if (response.session) {
        const expiresAt = response.session.expires_in 
          ? Math.floor(Date.now() / 1000) + response.session.expires_in
          : undefined;
        
        const sessionData = {
          accessToken: response.session.access_token,
          refreshToken: response.session.refresh_token,
          expiresIn: response.session.expires_in,
          expiresAt
        };
        
        setSession(sessionData);
        
        // CRITICAL: Immediately sync to auth bridge for voice/WebSocket
        setAuthContextSession(sessionData);
        logger.info('[AuthContext] Login successful - synced to bridge', { 
          email, 
          role: response.user.role,
          tokenPreview: sessionData.accessToken?.substring(0, 10) + '...'
        });
      }
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    } finally {
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
      
      // CRITICAL: Immediately sync to auth bridge for voice/WebSocket
      setAuthContextSession(sessionData);
      
      // Save PIN session to localStorage
      localStorage.setItem('auth_session', JSON.stringify({
        user: response.user,
        session: sessionData,
        restaurantId: response.restaurantId
      }));

      logger.info('[AuthContext] PIN login successful - synced to bridge', { 
        role: response.user.role,
        tokenPreview: sessionData.accessToken?.substring(0, 10) + '...'
      });
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
      
      // CRITICAL: Immediately sync to auth bridge for voice/WebSocket
      setAuthContextSession(sessionData);
      
      // Save station session to localStorage
      localStorage.setItem('auth_session', JSON.stringify({
        user: stationUser,
        session: sessionData,
        restaurantId: response.restaurantId
      }));

      logger.info('[AuthContext] Station login successful - synced to bridge', { 
        stationType, 
        stationName,
        tokenPreview: sessionData.accessToken?.substring(0, 10) + '...'
      });
    } catch (error) {
      logger.error('Station login failed:', error);
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
      
      // CRITICAL: Clear auth bridge on logout
      setAuthContextSession(null);
      
      // Clear localStorage
      localStorage.removeItem('auth_session');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      logger.info('[AuthContext] Logout successful - bridge cleared');
    } catch (error) {
      logger.error('Logout failed:', error);
      // Clear state even if logout fails
      setUser(null);
      setSession(null);
      setRestaurantId(null);
      setAuthContextSession(null);
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
    if (!user) return false;
    
    // Check role requirement
    const hasRequiredRole = requiredRoles.length === 0 || 
                           requiredRoles.includes(user.role || '');
    
    // Check scope requirement
    const hasRequiredScope = !requiredScopes || 
                            requiredScopes.length === 0 ||
                            requiredScopes.some(scope => hasScope(scope));
    
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

  // Sync session with auth service bridge for non-React services (voice, WebSocket)
  useEffect(() => {
    setAuthContextSession(session);
    logger.info('[AuthContext] Session synced to auth bridge:', session ? 'present' : 'cleared');
    
    // Trigger WebSocket reconnection when authentication changes
    if (session) {
      // Session established - reconnect WebSocket with authentication
      import('@/services/websocket/ConnectionManager').then(({ connectionManager }) => {
        logger.info('[AuthContext] Triggering WebSocket reconnection with new auth');
        // Force disconnect to clear old connection
        connectionManager.forceDisconnect();
        // Reconnect with new authentication
        setTimeout(() => {
          connectionManager.connect().catch(error => {
            logger.error('[AuthContext] Failed to reconnect WebSocket:', error);
          });
        }, 100); // Small delay to ensure clean disconnect
      });
    }
  }, [session]);

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    restaurantId,
    login,
    loginWithPin,
    loginAsStation,
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