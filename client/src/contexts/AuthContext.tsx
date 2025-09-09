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
        logger.info('[AuthContext] Starting auth initialization');

        // Check for existing Supabase session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (supabaseSession) {
          logger.info('[AuthContext] Found Supabase session, checking for cached user data');
          
          // First check if we have cached user data with custom role
          const cachedUserData = localStorage.getItem('auth_user_data');
          if (cachedUserData) {
            try {
              const parsed = JSON.parse(cachedUserData);
              // Use cached data if it's less than 1 hour old
              if (parsed.timestamp && (Date.now() - parsed.timestamp) < 3600000) {
                setUser(parsed.user);
                setRestaurantId(parsed.restaurantId);
                logger.info('[AuthContext] ✅ Restored user data from cache', {
                  role: parsed.user.role,
                  email: parsed.user.email,
                  restaurantId: parsed.restaurantId
                });
              } else {
                logger.info('[AuthContext] Cached data expired, will fetch fresh data');
              }
            } catch (error) {
              logger.error('[AuthContext] Failed to parse cached user data:', error);
              localStorage.removeItem('auth_user_data');
            }
          } else {
            logger.info('[AuthContext] No cached user data found');
          }
          
          // If no cached data, validate the session with our backend
          const needsFreshData = !user;
          if (needsFreshData) {
            logger.info('[AuthContext] Need to fetch fresh user data from /me endpoint');
            try {
              // Try to get restaurant ID from cached data or use default
              let restaurantIdForRequest = restaurantId;
              const cachedData = localStorage.getItem('auth_user_data');
              if (cachedData) {
                try {
                  const parsed = JSON.parse(cachedData);
                  restaurantIdForRequest = parsed.restaurantId;
                  logger.info('[AuthContext] Using restaurant ID from cache:', restaurantIdForRequest);
                } catch (e) {
                  logger.warn('[AuthContext] Failed to parse cached data for restaurant ID');
                }
              }
              
              // If still no restaurant ID, use default
              if (!restaurantIdForRequest) {
                restaurantIdForRequest = '11111111-1111-1111-1111-111111111111';
                logger.info('[AuthContext] Using default restaurant ID:', restaurantIdForRequest);
              }
              
              // Set the restaurant ID in httpClient before making the request
              const { setCurrentRestaurantId } = await import('@/services/http/httpClient');
              setCurrentRestaurantId(restaurantIdForRequest);
              logger.info('[AuthContext] Set restaurant ID in httpClient:', restaurantIdForRequest);
              
              const response = await httpClient.get<{ user: User; restaurantId: string }>(
                '/api/v1/auth/me'
              );
              
              setUser(response.user);
              setRestaurantId(response.restaurantId);
              
              // Cache the user data for future use
              localStorage.setItem('auth_user_data', JSON.stringify({
                user: response.user,
                restaurantId: response.restaurantId,
                timestamp: Date.now()
              }));
              
              logger.info('[AuthContext] ✅ Fetched and cached user from /me endpoint', {
                role: response.user.role,
                email: response.user.email,
                restaurantId: response.restaurantId
              });
            } catch (error) {
              // Session invalid, clear it
              logger.error('[AuthContext] Failed to fetch user data, clearing session:', error);
              await supabase.auth.signOut();
              localStorage.removeItem('auth_user_data');
              // Don't set any state, let the user log in
            }
          }
          
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
      logger.info('[AuthContext] Auth state change event:', event);
      
      if (event === 'SIGNED_IN' && session) {
        logger.info('[AuthContext] Processing SIGNED_IN event');
        
        // Check if we already have user data cached from login
        const cachedUserData = localStorage.getItem('auth_user_data');
        if (cachedUserData) {
          try {
            const parsed = JSON.parse(cachedUserData);
            // If cache is fresh (less than 5 seconds old), use it instead of fetching
            if (parsed.timestamp && (Date.now() - parsed.timestamp) < 5000) {
              logger.info('[AuthContext] Using fresh cached data from recent login', {
                role: parsed.user.role,
                email: parsed.user.email,
                restaurantId: parsed.restaurantId
              });
              
              setUser(parsed.user);
              setRestaurantId(parsed.restaurantId);
              
              const sessionData = {
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                expiresIn: session.expires_in,
                expiresAt: session.expires_at
              };
              setSession(sessionData);
              
              // CRITICAL: Immediately sync to auth bridge
              setAuthContextSession(sessionData);
              
              return; // Skip fetching /me since we have fresh data
            }
          } catch (e) {
            logger.warn('[AuthContext] Failed to parse cached data in auth state change');
          }
        }
        
        // Fetch user details when signed in
        try {
          // Try to get restaurant ID from cached data
          let restaurantIdForRequest = '11111111-1111-1111-1111-111111111111'; // Default
          const cachedData = localStorage.getItem('auth_user_data');
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              if (parsed.restaurantId) {
                restaurantIdForRequest = parsed.restaurantId;
                logger.info('[AuthContext] Using cached restaurant ID for /me:', restaurantIdForRequest);
              }
            } catch (e) {
              logger.warn('[AuthContext] Failed to get restaurant ID from cache');
            }
          }
          
          // Set the restaurant ID in httpClient before making the request
          const { setCurrentRestaurantId } = await import('@/services/http/httpClient');
          setCurrentRestaurantId(restaurantIdForRequest);
          
          logger.info('[AuthContext] Fetching user data from /me with restaurant ID:', restaurantIdForRequest);
          const response = await httpClient.get<{ user: User; restaurantId: string }>(
            '/api/v1/auth/me'
          );
          
          setUser(response.user);
          setRestaurantId(response.restaurantId);
          
          // Cache the user data with custom role for future use
          localStorage.setItem('auth_user_data', JSON.stringify({
            user: response.user,
            restaurantId: response.restaurantId,
            timestamp: Date.now()
          }));
          
          const sessionData = {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresIn: session.expires_in,
            expiresAt: session.expires_at
          };
          setSession(sessionData);
          
          // CRITICAL: Immediately sync to auth bridge
          setAuthContextSession(sessionData);
          logger.info('[AuthContext] ✅ Auth state change: SIGNED_IN - fetched and cached user', {
            role: response.user.role,
            email: response.user.email,
            restaurantId: response.restaurantId
          });
        } catch (error) {
          logger.error('[AuthContext] Failed to fetch user details on SIGNED_IN:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        logger.info('[AuthContext] Processing SIGNED_OUT event');
        setUser(null);
        setSession(null);
        setRestaurantId(null);
        localStorage.removeItem('auth_session');
        localStorage.removeItem('auth_user_data');
        
        // CRITICAL: Clear auth bridge on signout
        setAuthContextSession(null);
        logger.info('[AuthContext] Auth state change: SIGNED_OUT - cleared all data');
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
  }, []); // Empty deps is intentional - we only want to set up the listener once

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
        
        // Store user data with custom role in localStorage for session restoration
        // This ensures the custom role persists across page refreshes
        localStorage.setItem('auth_user_data', JSON.stringify({
          user: response.user,
          restaurantId: response.restaurantId,
          timestamp: Date.now()
        }));
        
        // Also set Supabase session for consistency (so getAuthToken fallback works)
        if (response.session.access_token && response.session.refresh_token) {
          try {
            await supabase.auth.setSession({
              access_token: response.session.access_token,
              refresh_token: response.session.refresh_token
            });
            logger.info('[AuthContext] Supabase session synchronized');
          } catch (error) {
            logger.warn('[AuthContext] Failed to sync Supabase session:', error);
            // Non-critical, continue anyway
          }
        }
        
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
      localStorage.removeItem('auth_user_data');
      
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
      localStorage.removeItem('auth_user_data');
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

  // Role hierarchy definition - higher roles inherit permissions from lower roles
  const ROLE_HIERARCHY: Record<string, number> = {
    owner: 100,     // Full system access
    manager: 80,    // Restaurant operations
    server: 60,     // Order and payment management
    cashier: 50,    // Payment processing only
    kitchen: 40,    // Kitchen display access
    expo: 30,       // Expo display access
    customer: 10,   // Self-service only
  };

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  // Check if user's role is at least as high as required role
  const hasRoleOrHigher = (requiredRole: string): boolean => {
    if (!user?.role) return false;
    
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 999;
    
    return userLevel >= requiredLevel;
  };

  // Check if user has a specific scope
  const hasScope = (scope: string): boolean => {
    return user?.scopes?.includes(scope) || false;
  };

  // Check if user can access based on roles and scopes
  const canAccess = (requiredRoles: string[], requiredScopes?: string[]): boolean => {
    if (!user) return false;
    
    // Check role requirement - user needs to have at least one of the required roles (or higher)
    const hasRequiredRole = requiredRoles.length === 0 || 
                           requiredRoles.some(role => hasRoleOrHigher(role));
    
    // Check scope requirement
    const hasRequiredScope = !requiredScopes || 
                            requiredScopes.length === 0 ||
                            requiredScopes.some(scope => hasScope(scope));
    
    logger.info('[AuthContext] Access check:', {
      userRole: user.role,
      requiredRoles,
      hasRequiredRole,
      requiredScopes,
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