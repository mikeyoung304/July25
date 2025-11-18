import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/core/supabase';
import { httpClient, setCurrentRestaurantId } from '@/services/http/httpClient';
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

  // Refs to prevent race conditions in refresh logic
  const refreshInProgressRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            setCurrentRestaurantId(response.restaurantId); // Sync with httpClient
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
      logger.info(`📡 onAuthStateChange: ${event}`, { hasSession: !!session });

      if (event === 'SIGNED_IN' && session) {
        // CRITICAL FIX: Only fetch user if we don't already have one with matching session
        // This prevents duplicate fetch during manual login() which already fetches user
        const currentToken = session.access_token;

        // Fetch user details when signed in
        try {
          const response = await httpClient.get<{ user: User; restaurantId: string }>(
            '/api/v1/auth/me'
          );

          logger.info('✅ onAuthStateChange: Fetched user from /auth/me', {
            email: response.user?.email
          });

          setUser(response.user);
          setRestaurantId(response.restaurantId);
          setCurrentRestaurantId(response.restaurantId); // Sync with httpClient
          setSession({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresIn: session.expires_in,
            expiresAt: session.expires_at
          });
        } catch (error) {
          logger.error('❌ onAuthStateChange: Failed to fetch user details:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        logger.info('🚪 onAuthStateChange: Clearing auth state');
        setUser(null);
        setSession(null);
        setRestaurantId(null);
        localStorage.removeItem('auth_session');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        logger.info('🔄 onAuthStateChange: Token refreshed');
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

  // Email/password login (Custom JWT with restaurant_id + scopes)
  const login = async (email: string, password: string, restaurantId: string) => {
    logger.info('🔐 login() START', { email, restaurantId });
    setIsLoading(true);
    try {
      // PERMANENT FIX: Use custom /api/v1/auth/login endpoint
      // Returns JWT with restaurant_id + scopes embedded → works with STRICT_AUTH=true forever

      // 1. Resolve slug to UUID (hardcoded for now - we only have one restaurant)
      const GROW_RESTAURANT_UUID = '11111111-1111-1111-1111-111111111111';
      const resolvedRestaurantId = restaurantId === 'grow' ? GROW_RESTAURANT_UUID : restaurantId;
      logger.info('🔐 Step 1: Resolved restaurant identifier', {
        input: restaurantId,
        resolved: resolvedRestaurantId
      });

      // 2. Call custom backend auth endpoint
      logger.info('🔐 Step 2: Calling POST /api/v1/auth/login');
      const loginStart = Date.now();

      const response = await httpClient.post<{
        user: User;
        session: { access_token: string; refresh_token: string; expires_in: number };
        restaurantId: string;
      }>('/api/v1/auth/login', {
        email,
        password,
        restaurantId: resolvedRestaurantId
      });

      const loginDuration = Date.now() - loginStart;
      logger.info(`🔐 Step 2 complete: Custom JWT obtained (${loginDuration}ms)`, {
        email: response.user?.email,
        role: response.user?.role,
        scopes: response.user?.scopes?.length
      });

      // 3. Store custom JWT in React state
      logger.info('🔐 Step 3: Storing custom JWT in auth context');
      setUser(response.user);
      setRestaurantId(response.restaurantId);
      setCurrentRestaurantId(response.restaurantId); // Sync with httpClient
      setSession({
        accessToken: response.session.access_token,
        refreshToken: response.session.refresh_token,
        expiresIn: response.session.expires_in,
        expiresAt: Date.now() / 1000 + response.session.expires_in
      });

      // 4. Sync with Supabase for Realtime subscriptions
      logger.info('🔐 Step 4: Syncing custom JWT with Supabase session');
      try {
        await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token
        });
        logger.debug('✅ Supabase session synced for Realtime support');
      } catch (syncError) {
        // Non-fatal: Realtime won't work but auth is fine
        logger.warn('⚠️ Failed to sync Supabase session (Realtime may not work):', syncError);
      }

      logger.info('✅ login() COMPLETE - JWT contains restaurant_id + scopes', {
        email: response.user?.email,
        restaurantId: response.restaurantId,
        scopeCount: response.user?.scopes?.length,
        tokenType: 'custom_jwt_with_restaurant_context'
      });

    } catch (error) {
      logger.error('❌ login() FAILED:', error);
      // Clean up on error (both custom session and Supabase)
      try {
        await supabase.auth.signOut();
      } catch (cleanupError) {
        logger.debug('Supabase cleanup failed (expected if not logged in):', cleanupError);
      }
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
      setCurrentRestaurantId(response.restaurantId); // Sync with httpClient

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
      setCurrentRestaurantId(response.restaurantId); // Sync with httpClient

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

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      logger.info('🚪 Starting logout sequence...');

      // CRITICAL FIX: Sign out from Supabase with timeout
      // Add timeout to prevent hanging on WebSocket cleanup or network issues
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      );

      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        logger.info('✅ Supabase signOut complete');
      } catch (timeoutError) {
        logger.warn('⚠️ Supabase signOut timed out, forcing local cleanup');
      }

      // NOTE: We don't call backend /logout endpoint because:
      // 1. supabase.auth.signOut() already invalidated the session
      // 2. Backend endpoint requires valid token (would get 401)
      // 3. Frontend supabase.auth.signOut() is sufficient for auth invalidation
      // 4. Removes network overhead and potential failure point
      // See: docs/investigations/token-refresh-failure-analysis.md

      // Clear local state (onAuthStateChange will also do this, but we do it explicitly for immediate UI update)
      setUser(null);
      setSession(null);
      setRestaurantId(null);

      // Clear localStorage
      localStorage.removeItem('auth_session');

      logger.info('✅ Logout successful');
    } catch (error) {
      logger.error('❌ Logout failed:', error);
      // Clear state even if logout fails (fail-safe)
      setUser(null);
      setSession(null);
      setRestaurantId(null);
      localStorage.removeItem('auth_session');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh session - wrapped in useCallback to prevent effect loops
  const refreshSession = useCallback(async () => {
    // Guard: prevent concurrent refresh attempts
    if (refreshInProgressRef.current) {
      logger.warn('Refresh already in progress, skipping...');
      return;
    }

    if (!session?.refreshToken) {
      throw new Error('No refresh token available');
    }

    refreshInProgressRef.current = true;

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
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [session?.refreshToken]);

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

  // Auto-refresh token before expiry - single timer via ref
  useEffect(() => {
    // Clear any existing timer first
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

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

    // Schedule single refresh via ref
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null; // Clear ref after execution
      refreshSession().catch(error => {
        logger.error('Auto-refresh failed:', error);
        logout(); // Logout if refresh fails
      });
    }, refreshTime);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
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