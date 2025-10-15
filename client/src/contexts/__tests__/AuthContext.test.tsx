import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { AuthProvider, AuthContext } from '../AuthContext'
import { supabase } from '@/core/supabase'
import { httpClient } from '@/services/http/httpClient'
import { useContext } from 'react'

// Mock dependencies
vi.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    }
  }
}))

vi.mock('@/services/http/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  }
}))

vi.mock('@/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}))

describe('AuthContext - Token Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Mock empty session initially
    ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    })

    // Mock auth state listener
    ;(supabase.auth.onAuthStateChange as vi.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  test('should schedule single refresh timer when session has refresh token', async () => {
    const TestComponent = () => {
      const auth = useContext(AuthContext)
      return <div>{auth?.session?.accessToken || 'no-session'}</div>
    }

    // Create a session that expires in 10 minutes
    const expiresAt = Math.floor(Date.now() / 1000) + 600 // 10 minutes from now
    const mockSession = {
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      expiresAt,
      expiresIn: 600
    }

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Simulate session update
    await act(async () => {
      const authContext = (supabase.auth.onAuthStateChange as vi.Mock).mock.calls[0][0]
      await authContext('TOKEN_REFRESHED', {
        access_token: mockSession.accessToken,
        refresh_token: mockSession.refreshToken,
        expires_at: mockSession.expiresAt,
        expires_in: mockSession.expiresIn
      })
    })

    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Advance time to just before refresh (5 minutes before expiry = 5 minutes from now)
    await act(async () => {
      vi.advanceTimersByTime(299000) // 4:59 - just before refresh
    })

    // Refresh should not have been called yet
    expect(httpClient.post).not.toHaveBeenCalled()

    // Advance to trigger refresh
    ;(httpClient.post as vi.Mock).mockResolvedValue({
      session: {
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
        expires_in: 600
      }
    })

    await act(async () => {
      vi.advanceTimersByTime(2000) // 5:01 - past refresh time
    })

    // Refresh should have been called exactly once
    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledTimes(1)
      expect(httpClient.post).toHaveBeenCalledWith('/api/v1/auth/refresh', {
        refreshToken: 'refresh-token'
      })
    })
  })

  test('should prevent concurrent refresh attempts with latch', async () => {
    const TestComponent = () => {
      const auth = useContext(AuthContext)
      return (
        <div>
          <span>{auth?.session?.accessToken || 'no-session'}</span>
          <button onClick={() => auth?.refreshSession()}>Refresh</button>
        </div>
      )
    }

    const { getByRole } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Setup session
    await act(async () => {
      const authContext = (supabase.auth.onAuthStateChange as vi.Mock).mock.calls[0][0]
      await authContext('TOKEN_REFRESHED', {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 600,
        expires_in: 600
      })
    })

    // Mock slow refresh response
    let resolveRefresh: (value: any) => void
    const refreshPromise = new Promise(resolve => {
      resolveRefresh = resolve
    })
    ;(httpClient.post as vi.Mock).mockReturnValue(refreshPromise)

    // Trigger first refresh
    const refreshButton = getByRole('button', { name: /refresh/i })
    act(() => {
      refreshButton.click()
    })

    // Try to trigger second refresh while first is in progress
    act(() => {
      refreshButton.click()
      refreshButton.click() // Multiple rapid clicks
    })

    // Only one API call should be made
    expect(httpClient.post).toHaveBeenCalledTimes(1)

    // Resolve the refresh
    await act(async () => {
      resolveRefresh!({
        session: {
          access_token: 'new-token',
          refresh_token: 'new-refresh-token',
          expires_in: 600
        }
      })
      await refreshPromise
    })

    // Now a new refresh should be allowed
    ;(httpClient.post as vi.Mock).mockResolvedValue({
      session: {
        access_token: 'newer-token',
        refresh_token: 'newer-refresh-token',
        expires_in: 600
      }
    })

    await act(async () => {
      refreshButton.click()
    })

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledTimes(2)
    })
  })

  test('should clear refresh timer on unmount', async () => {
    const TestComponent = () => {
      const auth = useContext(AuthContext)
      return <div>{auth?.session?.accessToken || 'no-session'}</div>
    }

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Setup session with refresh timer
    await act(async () => {
      const authContext = (supabase.auth.onAuthStateChange as vi.Mock).mock.calls[0][0]
      await authContext('TOKEN_REFRESHED', {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 600,
        expires_in: 600
      })
    })

    // Unmount component
    unmount()

    // Advance time past refresh point
    await act(async () => {
      vi.advanceTimersByTime(360000) // 6 minutes
    })

    // Refresh should not be called after unmount
    expect(httpClient.post).not.toHaveBeenCalled()
  })
})
