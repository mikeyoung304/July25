import { test, expect } from '@playwright/test';

test.describe('Table Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as server
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'server@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    // Navigate to Server View
    await page.waitForURL('**/server');
  });

  test('should complete full payment flow with tip', async ({ page }) => {
    // Find an occupied table
    await page.waitForSelector('.border-green-500'); // Wait for tables to load
    
    // Click on first occupied table's payment button
    await page.click('button:has-text("Process Payment"):first');
    
    // Wait for check to be presented
    await expect(page.locator('h1:has-text("Review Your Check")')).toBeVisible();
    
    // Verify check items are displayed
    await expect(page.locator('text=Subtotal')).toBeVisible();
    await expect(page.locator('text=Tax')).toBeVisible();
    
    // Continue to tip selection
    await page.click('button:has-text("Continue to Tip")');
    
    // Select 20% tip
    await expect(page.locator('h1:has-text("Add a Tip?")')).toBeVisible();
    await page.click('button:has-text("20%")');
    
    // Should move to payment method selection
    await expect(page.locator('h1:has-text("Payment Method")')).toBeVisible();
    
    // Select Square Reader
    await page.click('button:has-text("Square Reader")');
    
    // Should show processing (mocked in dev)
    await expect(page.locator('text=Processing payment')).toBeVisible();
    
    // Should show confirmation
    await expect(page.locator('h1:has-text("Thank You!")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Your payment has been processed successfully')).toBeVisible();
    
    // Complete without receipt
    await page.click('button:has-text("No Receipt")');
    await page.click('button:has-text("Done")');
    
    // Should return to server view
    await expect(page).toHaveURL(/.*\/server/);
  });

  test('should handle cash payment with change', async ({ page }) => {
    // Click on occupied table's payment button
    await page.click('button:has-text("Process Payment"):first');
    
    // Wait for check
    await expect(page.locator('h1:has-text("Review Your Check")')).toBeVisible();
    
    // Continue without tip
    await page.click('button:has-text("Continue to Tip")');
    await page.click('button:has-text("No Tip")');
    
    // Select cash payment
    await expect(page.locator('h1:has-text("Payment Method")')).toBeVisible();
    await page.click('button:has-text("Cash")');
    
    // Cash modal should appear
    await expect(page.locator('h2:has-text("Cash Payment")')).toBeVisible();
    
    // Enter amount with change
    const amountInput = page.locator('input[placeholder="Enter amount received"]');
    await amountInput.fill('100');
    
    // Verify change calculation
    await expect(page.locator('text=/Change: \\$/')).toBeVisible();
    
    // Process payment
    await page.click('button:has-text("Process Cash Payment")');
    
    // Should show confirmation with change amount
    await expect(page.locator('h1:has-text("Thank You!")')).toBeVisible({ timeout: 10000 });
  });

  test('should handle split payment flow', async ({ page }) => {
    // Click on occupied table's payment button
    await page.click('button:has-text("Process Payment"):first');
    
    // Continue to payment method
    await page.click('button:has-text("Continue to Tip")');
    await page.click('button:has-text("20%")');
    
    // Select split check
    await page.click('button:has-text("Split Check")');
    
    // Should show split configuration
    await expect(page.locator('h1:has-text("Split Check")')).toBeVisible();
    
    // Select 3-way split
    await page.click('button:has-text("3")');
    
    // Verify 3 split cards appear
    const splitCards = page.locator('text=Person').count();
    await expect(splitCards).resolves.toBe(3);
    
    // Pay first split
    await page.click('button:has-text("Pay Now"):first');
    
    // Should show payment in progress (mocked)
    await page.waitForTimeout(2500); // Wait for mock payment
    
    // First split should be marked as paid
    await expect(page.locator('text=Paid ✓').first()).toBeVisible();
    
    // Progress bar should update
    await expect(page.locator('text=1 of 3 paid')).toBeVisible();
  });

  test('should validate custom tip amount', async ({ page }) => {
    // Click on occupied table's payment button
    await page.click('button:has-text("Process Payment"):first');
    
    // Continue to tip
    await page.click('button:has-text("Continue to Tip")');
    
    // Select custom tip
    await page.click('button:has-text("Custom Amount")');
    
    // Enter custom tip amount
    const tipInput = page.locator('input[placeholder="Enter tip amount"]');
    await tipInput.fill('15.50');
    
    // Should show percentage calculation
    await expect(page.locator('text=/\\d+% tip/')).toBeVisible();
    
    // Confirm custom tip
    await page.click('button:has-text("Add $15.50 Tip")');
    
    // Should proceed to payment method
    await expect(page.locator('h1:has-text("Payment Method")')).toBeVisible();
  });

  test('should handle email receipt request', async ({ page }) => {
    // Complete payment flow to confirmation
    await page.click('button:has-text("Process Payment"):first');
    await page.click('button:has-text("Continue to Tip")');
    await page.click('button:has-text("20%")');
    await page.click('button:has-text("Digital Wallet")');
    
    // Wait for confirmation
    await expect(page.locator('h1:has-text("Thank You!")')).toBeVisible({ timeout: 10000 });
    
    // Select email receipt
    await page.click('button:has-text("Email")');
    
    // Enter email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('customer@example.com');
    
    // Send receipt
    await page.click('button:has-text("Send Receipt & Complete")');
    
    // Should show receipt sent confirmation
    await expect(page.locator('text=Receipt sent to customer@example.com')).toBeVisible();
  });

  test('should allow navigation back through steps', async ({ page }) => {
    // Start payment flow
    await page.click('button:has-text("Process Payment"):first');
    
    // Go to tip
    await page.click('button:has-text("Continue to Tip")');
    await expect(page.locator('h1:has-text("Add a Tip?")')).toBeVisible();
    
    // Go back to check
    await page.click('button:has-text("← Back")');
    await expect(page.locator('h1:has-text("Review Your Check")')).toBeVisible();
    
    // Forward to tip again
    await page.click('button:has-text("Continue to Tip")');
    
    // Select tip and go to payment
    await page.click('button:has-text("18%")');
    await expect(page.locator('h1:has-text("Payment Method")')).toBeVisible();
    
    // Go back to tip
    await page.click('button:has-text("← Back to tip")');
    await expect(page.locator('h1:has-text("Add a Tip?")')).toBeVisible();
  });
});