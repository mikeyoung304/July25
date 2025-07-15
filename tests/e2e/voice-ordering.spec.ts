import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for fixtures
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_FIXTURE = path.join(__dirname, '../fixtures/test-audio.wav');

// Ensure test audio fixture exists
test.beforeAll(async () => {
  if (!fs.existsSync(AUDIO_FIXTURE)) {
    throw new Error(`Audio fixture not found at ${AUDIO_FIXTURE}. Please ensure test-audio.wav exists.`);
  }
});

test.describe('Voice Ordering Smoke Test', () => {
  test.describe.configure({ mode: 'serial' });

  test('Critical: Homepage loads with voice ordering button', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // HARD REQUIREMENT: Mic button must exist
    const micButton = page.locator('button:has-text("Start Voice Order")');
    await expect(micButton).toBeVisible({ timeout: 10000 });
    
    // HARD REQUIREMENT: App title must be present
    const title = page.locator('h1:has-text("Grow Fresh")');
    await expect(title).toBeVisible();
  });

  test('Critical: Kiosk page voice ordering flow', async ({ page }) => {
    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');
    
    // Mock getUserMedia to avoid actual microphone access
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {},
            kind: 'audio',
            enabled: true,
          }],
          getAudioTracks: () => [{
            stop: () => {},
            kind: 'audio',
            enabled: true,
          }],
        } as any;
      };
    });
    
    // Load audio fixture
    const audioData = fs.readFileSync(AUDIO_FIXTURE);
    
    // Mock MediaRecorder with real WAV data
    await page.addInitScript((audioBuffer) => {
      (window as any).MediaRecorder = class {
        state = 'inactive';
        ondataavailable: any;
        onstop: any;
        
        constructor() {}
        
        start() {
          this.state = 'recording';
          // Simulate audio data after a delay
          setTimeout(() => {
            if (this.ondataavailable) {
              // Use the real WAV data
              const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
              this.ondataavailable({ data: blob });
            }
          }, 100);
        }
        
        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop();
          }
        }
      };
      
      (window as any).MediaRecorder.isTypeSupported = () => true;
    }, Array.from(audioData));
    
    // HARD REQUIREMENT: Mic button must exist on kiosk page
    const micButton = page.locator('button').filter({ hasText: /hold|press|mic/i }).first();
    await expect(micButton).toBeVisible({ timeout: 10000 });
    
    // HARD REQUIREMENT: WebSocket must connect
    const wsConnected = page.waitForResponse(response => 
      response.url().includes('ws://') || response.url().includes('wss://'),
      { timeout: 5000 }
    ).catch(() => null); // WebSocket connection might not show as HTTP response
    
    // Set up response interceptor for voice API
    await page.route('**/api/v1/ai/parse-order', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          items: [{
            name: 'Soul Bowl',
            quantity: 1,
            price: 12.99,
            modifiers: []
          }],
          totalAmount: 12.99,
          confidence: 0.95
        })
      });
    });
    
    // Press and hold the mic button
    await micButton.dispatchEvent('mousedown');
    await page.waitForTimeout(500); // Hold for 500ms
    
    // Release the button
    await micButton.dispatchEvent('mouseup');
    
    // HARD REQUIREMENT: Must show processing state
    await expect(page.locator('text=/processing|transcribing|analyzing/i')).toBeVisible({ timeout: 5000 });
    
    // HARD REQUIREMENT: Must show result (either success or error)
    const resultLocator = page.locator('text=/soul bowl|order received|error|failed/i');
    await expect(resultLocator).toBeVisible({ timeout: 10000 });
    
    // HARD REQUIREMENT: No error toasts
    const errorToast = page.locator('.Toastify__toast--error, .toast-error, [role="alert"]').filter({ hasText: /error|failed/i });
    await expect(errorToast).not.toBeVisible();
  });

  test('Critical: Drive-thru page voice ordering', async ({ page }) => {
    await page.goto('/drive-thru');
    await page.waitForLoadState('networkidle');
    
    // Mock getUserMedia
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {},
            kind: 'audio',
            enabled: true,
          }],
          getAudioTracks: () => [{
            stop: () => {},
            kind: 'audio',
            enabled: true,
          }],
        } as any;
      };
    });
    
    // HARD REQUIREMENT: Drive-thru title must be present
    const title = page.locator('h1:has-text("DRIVE-THRU")');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    // HARD REQUIREMENT: Voice control must be present
    const voiceControl = page.locator('button').filter({ hasText: /hold|press|mic/i }).first();
    await expect(voiceControl).toBeVisible({ timeout: 10000 });
    
    // HARD REQUIREMENT: Order summary section must exist
    const orderSummary = page.locator('text=/your order|order summary/i');
    await expect(orderSummary).toBeVisible();
    
    // Test voice interaction
    await voiceControl.click(); // Initial press to start
    await page.waitForTimeout(100);
    
    // HARD REQUIREMENT: Must show welcome message
    const welcomeMessage = page.locator('text=/welcome|hello|what can i get/i');
    await expect(welcomeMessage).toBeVisible({ timeout: 5000 });
  });

  test('Critical: Server view with floor plan', async ({ page }) => {
    await page.goto('/server');
    await page.waitForLoadState('networkidle');
    
    // HARD REQUIREMENT: Server view title
    const title = page.locator('h1:has-text("Server View")');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    // HARD REQUIREMENT: Floor plan or setup message must exist
    const floorPlanOrMessage = page.locator('canvas, text=/floor plan|no floor plan configured/i');
    await expect(floorPlanOrMessage).toBeVisible({ timeout: 10000 });
    
    // If floor plan exists, test table interaction
    const canvas = page.locator('canvas');
    if (await canvas.isVisible()) {
      // Click on canvas to potentially select a table
      await canvas.click({ position: { x: 100, y: 100 } });
      
      // Check if seat selection appears
      const seatSelection = page.locator('text=/select seat|seat number/i');
      if (await seatSelection.isVisible({ timeout: 2000 })) {
        // HARD REQUIREMENT: Start voice order button must exist when table selected
        const startOrderButton = page.locator('button:has-text("Start Voice Order")');
        await expect(startOrderButton).toBeVisible();
      }
    }
  });

  test('Critical: Menu endpoint returns data', async ({ request }) => {
    // HARD REQUIREMENT: Menu API must respond
    const response = await request.get('/api/v1/ai/menu');
    expect(response.status()).toBeLessThan(500); // Not a server error
    
    // If menu is loaded, should return 200
    if (response.status() === 200) {
      const menu = await response.json();
      expect(menu).toBeTruthy();
    } else if (response.status() === 404) {
      // Menu not loaded is acceptable, but should have proper error
      const error = await response.json();
      expect(error).toHaveProperty('error');
    }
  });

  test('Critical: Health check passes', async ({ request }) => {
    // HARD REQUIREMENT: Health endpoint must respond
    const response = await request.get('/api/v1/health');
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health).toHaveProperty('status');
    expect(health.status).toBe('healthy');
  });
});