import { useEffect, useState, useCallback } from 'react';
import { useRestaurant } from '@/core';
import { logger } from '@/utils/logger';
import { setAuthContextSession } from '@/services/auth';

export interface KioskAuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
}

/**
 * Hook for managing kiosk/customer authentication
 * 
 * Provides JWT tokens for self-service ordering via:
 * - Physical kiosks in restaurant
 * - QR code table ordering
 * - Online ordering without account
 * 
 * Tokens have limited scope (read menu, create orders, process payments)
 * and expire after 1 hour.
 */
export function useKioskAuth(): KioskAuthState {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { restaurant } = useRestaurant();

  const authenticate = useCallback(async () => {
    if (!restaurant?.id) {
      logger.warn('Cannot authenticate kiosk: no restaurant context');
      setError('Restaurant context not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info('Authenticating kiosk session', { restaurantId: restaurant.id });
      
      const response = await fetch('/api/v1/auth/kiosk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token received from server');
      }

      // Store token for use in API requests
      setToken(data.token);
      sessionStorage.setItem('kiosk_token', data.token);

      // Bridge to auth context for unified authentication
      const sessionData = {
        accessToken: data.token,
        expiresAt: Math.floor(Date.now() / 1000) + data.expiresIn
      };
      setAuthContextSession(sessionData);

      // Store expiry time for refresh logic
      const expiryTime = Date.now() + (data.expiresIn * 1000);
      sessionStorage.setItem('kiosk_token_expiry', expiryTime.toString());
      
      setIsAuthenticated(true);
      logger.info('Kiosk authentication successful', { 
        expiresIn: data.expiresIn,
        restaurantId: restaurant.id 
      });

      // Schedule token refresh before expiry (refresh at 50 minutes)
      const refreshTimeout = setTimeout(() => {
        logger.info('Kiosk token expiring soon, refreshing...');
        authenticate();
      }, 50 * 60 * 1000);

      // Cleanup timeout on unmount
      return () => clearTimeout(refreshTimeout);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      logger.error('Kiosk authentication failed', { error: errorMessage });
      setError(errorMessage);
      setIsAuthenticated(false);
      setToken(null);
      
      // Clear any stored tokens
      sessionStorage.removeItem('kiosk_token');
      sessionStorage.removeItem('kiosk_token_expiry');
    } finally {
      setIsLoading(false);
    }
  }, [restaurant?.id]);

  // Authenticate on mount and when restaurant changes
  useEffect(() => {
    // Check for existing valid token
    const existingToken = sessionStorage.getItem('kiosk_token');
    const tokenExpiry = sessionStorage.getItem('kiosk_token_expiry');
    
    if (existingToken && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      if (expiryTime > Date.now()) {
        // Token is still valid
        logger.info('Using existing kiosk token', { 
          expiresIn: Math.floor((expiryTime - Date.now()) / 1000) 
        });
        setToken(existingToken);
        setIsAuthenticated(true);
        setIsLoading(false);
        
        // Schedule refresh before expiry
        const timeUntilRefresh = Math.max(0, expiryTime - Date.now() - (10 * 60 * 1000)); // Refresh 10 min before expiry
        const refreshTimeout = setTimeout(() => {
          logger.info('Refreshing kiosk token before expiry');
          authenticate();
        }, timeUntilRefresh);
        
        return () => clearTimeout(refreshTimeout);
      } else {
        // Token expired, remove it
        logger.info('Existing kiosk token expired, re-authenticating');
        sessionStorage.removeItem('kiosk_token');
        sessionStorage.removeItem('kiosk_token_expiry');
      }
    }
    
    // No valid token, authenticate
    authenticate();
  }, [authenticate, restaurant?.id]);

  // Clear tokens on unmount
  useEffect(() => {
    return () => {
      // Optional: Clear tokens when component unmounts
      // Commented out to allow token persistence across navigation
      // sessionStorage.removeItem('kiosk_token');
      // sessionStorage.removeItem('kiosk_token_expiry');
    };
  }, []);

  return {
    token,
    isAuthenticated,
    isLoading,
    error,
    authenticate
  };
}