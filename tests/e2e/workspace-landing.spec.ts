/**
 * Workspace Landing E2E Tests
 * Tests the new workspace-based landing flow
 * Part of: Workspace-Based Landing Flow
 */

import { test, expect, Page } from '@playwright/test'

const DEMO_ENABLED = process.env.VITE_DEMO_PANEL === 'true' || process.env.VITE_DEMO_PANEL === '1'

test.describe('Workspace Landing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing state
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test.describe('Feature Flag Enabled', () => {
    test.beforeEach(async ({ page }) => {
      // Set feature flag enabled
      await page.goto('/')
      await page.evaluate(() => {
        // Feature flag should be set via environment variables
        // This is just for testing purposes
      })
    })

    test('displays workspace dashboard at root path', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Verify dashboard is displayed
      await expect(page.getByTestId('workspace-dashboard')).toBeVisible()
      await expect(page.getByText('Restaurant OS')).toBeVisible()
      await expect(page.getByText('Select your workspace')).toBeVisible()
    })

    test('displays all 6 workspace tiles', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByTestId('workspace-tile-server')).toBeVisible()
      await expect(page.getByTestId('workspace-tile-kitchen')).toBeVisible()
      await expect(page.getByTestId('workspace-tile-kiosk')).toBeVisible()
      await expect(page.getByTestId('workspace-tile-online-order')).toBeVisible()
      await expect(page.getByTestId('workspace-tile-admin')).toBeVisible()
      await expect(page.getByTestId('workspace-tile-expo')).toBeVisible()
    })

    test('does NOT show login or sign-in text on landing', async ({ page }) => {
      await page.goto('/')

      const bodyText = await page.textContent('body')
      expect(bodyText?.toLowerCase()).not.toContain('login')
      expect(bodyText?.toLowerCase()).not.toContain('sign in')
      expect(bodyText?.toLowerCase()).not.toContain('password')
    })

    test('kiosk tile navigates directly without authentication', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-kiosk').click()

      await expect(page).toHaveURL(/\/kiosk/, { timeout: 5000 })
    })

    test('online order tile navigates directly without authentication', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-online-order').click()

      await expect(page).toHaveURL(/\/order/, { timeout: 5000 })
    })

    test('protected tile opens authentication modal', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-server').click()

      // Modal should appear
      await expect(page.getByText('Authentication Required')).toBeVisible({ timeout: 3000 })
      await expect(page.getByLabelText(/email address/i)).toBeVisible()
      await expect(page.getByLabelText(/password/i)).toBeVisible()
    })

    test('modal can be closed with ESC key', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-server').click()
      await expect(page.getByText('Authentication Required')).toBeVisible()

      await page.keyboard.press('Escape')

      await expect(page.getByText('Authentication Required')).not.toBeVisible()
    })

    test('modal can be closed with close button', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-server').click()
      await expect(page.getByText('Authentication Required')).toBeVisible()

      await page.getByLabel(/close dialog/i).click()

      await expect(page.getByText('Authentication Required')).not.toBeVisible()
    })
  })

  test.describe('Demo Mode', () => {
    test.skip(!DEMO_ENABLED, 'Demo panel disabled in environment')

    test('shows demo badge when VITE_DEMO_PANEL=1', async ({ page }) => {

      await page.goto('/')

      await expect(page.getByText('Demo')).toBeVisible()
    })

    test('pre-fills credentials for role-specific workspace', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-server').click()
      await expect(page.getByText('Authentication Required')).toBeVisible()

      // Check if credentials are pre-filled
      const emailInput = page.getByLabelText(/email address/i)
      const passwordInput = page.getByLabelText(/password/i)

      await expect(emailInput).toHaveValue('server@restaurant.com')
      await expect(passwordInput).toHaveValue('Demo123!')
    })

    test('can clear pre-filled demo credentials', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-kitchen').click()
      await expect(page.getByText('Demo Mode')).toBeVisible()

      await page.getByText(/use different account/i).click()

      const emailInput = page.getByLabelText(/email address/i)
      const passwordInput = page.getByLabelText(/password/i)

      await expect(emailInput).toHaveValue('')
      await expect(passwordInput).toHaveValue('')
    })

    test('demo login flow works end-to-end', async ({ page }) => {
      await page.goto('/')

      // Click server workspace
      await page.getByTestId('workspace-tile-server').click()
      await expect(page.getByText('Authentication Required')).toBeVisible()

      // Credentials should be pre-filled, just submit
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should navigate to server workspace
      await expect(page).toHaveURL(/\/server/, { timeout: 10000 })
    })
  })

  test.describe('Deep Links', () => {
    test('deep link to protected route shows modal', async ({ page }) => {
      // Navigate directly to /server without authentication
      await page.goto('/server')

      // Modal should appear
      await expect(page.getByText('Authentication Required')).toBeVisible({ timeout: 5000 })
    })

    test('deep link navigates to destination after login', async ({ page }) => {
      test.skip(!DEMO_ENABLED, 'Demo panel disabled in environment')

      // Navigate directly to /kitchen
      await page.goto('/kitchen')

      // Modal appears
      await expect(page.getByText('Authentication Required')).toBeVisible()

      // Login with demo credentials
      await page.getByLabelText(/email address/i).fill('kitchen@restaurant.com')
      await page.getByLabelText(/password/i).fill('Demo123!')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should navigate to kitchen after successful login
      await expect(page).toHaveURL(/\/kitchen/, { timeout: 10000 })
    })

    test('deep link to public route works without authentication', async ({ page }) => {
      await page.goto('/kiosk')

      // Should navigate directly, no modal
      await expect(page).toHaveURL(/\/kiosk/)
      await expect(page.getByText('Authentication Required')).not.toBeVisible()
    })
  })

  test.describe('Authenticated User', () => {
    test.skip(!DEMO_ENABLED, 'Demo panel disabled in environment')

    test('authenticated user with permission navigates directly', async ({ page }) => {

      // First, login via the modal
      await page.goto('/')
      await page.getByTestId('workspace-tile-server').click()
      await expect(page.getByText('Authentication Required')).toBeVisible()
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page).toHaveURL(/\/server/, { timeout: 10000 })

      // Go back to dashboard
      await page.goto('/')

      // Now click server tile again - should navigate directly
      await page.getByTestId('workspace-tile-server').click()

      // Should NOT show modal, navigate directly
      await expect(page).toHaveURL(/\/server/, { timeout: 5000 })
      await expect(page.getByText('Authentication Required')).not.toBeVisible()
    })

    test('authenticated user without permission shows modal with switch account', async ({ page }) => {
      // Login as server
      await page.goto('/')
      await page.getByTestId('workspace-tile-server').click()
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page).toHaveURL(/\/server/, { timeout: 10000 })

      // Try to access admin (server doesn't have admin permissions)
      await page.goto('/')
      await page.getByTestId('workspace-tile-admin').click()

      // Should show insufficient permissions modal
      await expect(page.getByText('Insufficient Permissions')).toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('button', { name: /switch account/i })).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('all workspace tiles are keyboard accessible', async ({ page }) => {
      await page.goto('/')

      // Tab to first tile
      await page.keyboard.press('Tab')
      const serverTile = page.getByTestId('workspace-tile-server')

      // Should be focusable
      await expect(serverTile).toBeFocused()

      // Press Enter to activate
      await page.keyboard.press('Enter')

      // Modal should open
      await expect(page.getByText('Authentication Required')).toBeVisible()
    })

    test('modal has proper focus management', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-server').click()
      await expect(page.getByText('Authentication Required')).toBeVisible()

      // Email input should be focused
      await expect(page.getByLabelText(/email address/i)).toBeFocused()
    })

    test('modal traps focus within it', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('workspace-tile-server').click()
      await expect(page.getByText('Authentication Required')).toBeVisible()

      // Tab through all focusable elements
      await page.keyboard.press('Tab') // To password
      await page.keyboard.press('Tab') // To show password button
      await page.keyboard.press('Tab') // To sign in button
      await page.keyboard.press('Tab') // To PIN login link
      await page.keyboard.press('Tab') // To Station link
      await page.keyboard.press('Tab') // To cancel button
      await page.keyboard.press('Tab') // Should wrap back to close button or email

      // Focus should stay within modal
      const focused = await page.evaluateHandle(() => document.activeElement)
      const modalContainer = await page.getByRole('dialog')
      const isFocusWithinModal = await modalContainer.evaluate((modal, focused) => {
        return modal.contains(focused as Element)
      }, focused)

      expect(isFocusWithinModal).toBe(true)
    })
  })

  test.describe('Old Landing Page Fallback', () => {
    test('old landing page is accessible at /welcome', async ({ page }) => {
      await page.goto('/welcome')

      // Should show the old landing page with customer ordering and staff access
      await expect(page.getByText(/order online/i)).toBeVisible()
      await expect(page.getByText(/staff access/i)).toBeVisible()
    })
  })

  test.describe('Alternative Login Methods', () => {
    test('PIN login link works from modal', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('workspace-tile-server').click()

      await page.getByText('PIN Login').click()

      await expect(page).toHaveURL(/\/pin-login/)
    })

    test('Station login link works from modal', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('workspace-tile-server').click()

      await page.getByText('Station').click()

      await expect(page).toHaveURL(/\/station-login/)
    })
  })
})
