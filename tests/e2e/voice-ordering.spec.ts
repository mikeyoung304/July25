import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Voice Ordering Smoke Test', () => {
  test('should navigate to homepage and display mic button', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if mic button exists
    const micButton = page.locator('button:has-text("HOLD ME")');
    await expect(micButton).toBeVisible();
    
    // Check connection status indicator
    const statusIndicator = page.locator('text=/Voice Ready|Connecting|Disconnected/');
    await expect(statusIndicator).toBeVisible();
  });

  test('should handle mic button click and simulate audio upload', async ({ page }) => {
    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(2000);
    
    // Find the mic button
    const micButton = page.locator('button:has-text("HOLD ME")');
    await expect(micButton).toBeVisible();
    
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
    
    // Mock MediaRecorder
    await page.addInitScript(() => {
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
              const blob = new Blob(['mock audio data'], { type: 'audio/webm' });
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
    });
    
    // Intercept WebSocket to mock server responses
    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      (window as any).WebSocket = class extends originalWebSocket {
        constructor(url: string) {
          super(url);
          
          // Mock connection
          setTimeout(() => {
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
            
            // Send connected message
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage(new MessageEvent('message', {
                  data: JSON.stringify({ type: 'connected', message: 'Voice stream ready' })
                }));
              }
            }, 100);
          }, 100);
          
          // Override send to mock responses
          const originalSend = this.send.bind(this);
          this.send = (data: any) => {
            originalSend(data);
            
            // Mock progress response for audio chunks
            if (data instanceof Blob || data instanceof ArrayBuffer) {
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage(new MessageEvent('message', {
                    data: JSON.stringify({ 
                      type: 'progress', 
                      bytesReceived: 1024,
                      totalBytesReceived: 1024 
                    })
                  }));
                }
              }, 50);
            }
            
            // Mock transcription result
            if (typeof data === 'string') {
              const message = JSON.parse(data);
              if (message.type === 'stop_recording') {
                setTimeout(() => {
                  if (this.onmessage) {
                    this.onmessage(new MessageEvent('message', {
                      data: JSON.stringify({
                        type: 'transcription_result',
                        success: true,
                        text: 'I would like a soul bowl please'
                      })
                    }));
                  }
                }, 500);
              }
            }
          };
        }
      };
    });
    
    // Press and hold the mic button
    await micButton.dispatchEvent('mousedown');
    await page.waitForTimeout(200);
    
    // Release the button
    await micButton.dispatchEvent('mouseup');
    
    // Wait for processing
    await page.waitForTimeout(1000);
    
    // Check if order appears in UI (this would depend on actual UI implementation)
    // For now, just verify no errors occurred
    const errorToast = page.locator('.toast-error');
    await expect(errorToast).not.toBeVisible();
  });
});

// QUESTION: Should I add more specific assertions about order display in the UI? 
// The current test mocks the entire flow but doesn't verify the final order display
// since I'm not sure about the exact UI structure for displaying orders.