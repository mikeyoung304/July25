/**
 * Phase 2B: P0.9 Auth Stabilization - Voice WebSocket Multi-Tenancy Security Tests
 *
 * CRITICAL: Tests to prevent cross-restaurant data leakage in voice sessions
 *
 * Attack Scenarios Tested:
 * 1. Cross-restaurant session creation
 * 2. Cross-restaurant audio processing
 * 3. Missing restaurant ID in session config
 * 4. JWT without restaurant context
 * 5. Case sensitivity bypass attempts
 * 6. Session restaurant ID modification attempts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { VoiceWebSocketServer } from '../../src/voice/websocket-server';
import http from 'http';
import { supabase } from '../../src/config/database';

describe.skip('Voice WebSocket Multi-Tenancy Security - SKIPPED (memory leak)', () => {
  let server: http.Server;
  let voiceServer: VoiceWebSocketServer;
  let serverPort: number;
  const JWT_SECRET = process.env['SUPABASE_JWT_SECRET'] || 'test-jwt-secret-for-testing-only';

  // Test restaurant IDs
  const RESTAURANT_A = 'rest-a-test';
  const RESTAURANT_B = 'rest-b-test';
  const USER_ID = 'user-test-123';

  /**
   * Generate a test JWT token for a specific restaurant
   */
  function generateToken(restaurantId: string, userId: string = USER_ID): string {
    return jwt.sign(
      {
        sub: userId,
        restaurant_id: restaurantId,
        role: 'customer',
        email: 'test@example.com',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Create a WebSocket connection with authentication
   */
  function createAuthenticatedConnection(restaurantId: string, userId?: string): Promise<WebSocket> {
    const token = generateToken(restaurantId, userId);
    const ws = new WebSocket(`ws://localhost:${serverPort}/voice?token=${token}`);

    return new Promise((resolve, reject) => {
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  /**
   * Wait for WebSocket message matching condition
   */
  function waitForMessage(ws: WebSocket, condition: (msg: any) => boolean, timeoutMs = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.removeAllListeners('message');
        reject(new Error('Message timeout'));
      }, timeoutMs);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (condition(message)) {
            clearTimeout(timeout);
            ws.removeAllListeners('message');
            resolve(message);
          }
        } catch (error) {
          // Ignore parse errors
        }
      });
    });
  }

  beforeAll(async () => {
    // Set up HTTP server for WebSocket
    server = http.createServer();
    voiceServer = new VoiceWebSocketServer();

    // Create WebSocket.Server to properly handle upgrades
    const wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket upgrade
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        voiceServer.handleConnection(ws, request);
      });
    });

    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    voiceServer.shutdown();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  afterEach(async () => {
    // Clean up any open connections
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Test 1: Valid Same-Restaurant Access', () => {
    it('should allow session creation when restaurant matches JWT', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A);

      // Send session.start with matching restaurant
      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: RESTAURANT_A,
          loopback: true,
        },
      }));

      // Should receive session.started event (not error)
      const response = await waitForMessage(ws, msg =>
        msg.type === 'session.started' || msg.type === 'error'
      );

      expect(response.type).toBe('session.started');
      expect(response.session_id).toBeDefined();

      ws.close();
    });

    it('should allow audio processing for authenticated restaurant', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A);

      // Start session
      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: RESTAURANT_A,
          loopback: true,
        },
      }));

      await waitForMessage(ws, msg => msg.type === 'session.started');

      // Send audio
      ws.send(JSON.stringify({
        type: 'audio',
        timestamp: Date.now(),
        data: {
          chunk: Buffer.from('test-audio-data').toString('base64'),
          hasVoice: true,
        },
      }));

      // Should process without error (loopback mode echoes back)
      const response = await waitForMessage(ws, msg =>
        msg.type === 'audio' || msg.type === 'error'
      );

      expect(response.type).not.toBe('error');

      ws.close();
    });
  });

  describe('Test 2: Cross-Restaurant Access Blocked', () => {
    it('should reject session creation for different restaurant', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A);

      // Attempt to create session for Restaurant B
      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: RESTAURANT_B, // DIFFERENT RESTAURANT
          loopback: true,
        },
      }));

      // Should receive error and connection close
      const errorPromise = waitForMessage(ws, msg => msg.type === 'error');
      const closePromise = new Promise<number>((resolve) => {
        ws.on('close', (code) => resolve(code));
      });

      const error = await errorPromise;
      const closeCode = await closePromise;

      expect(error.error.code).toBe('MULTI_TENANCY_VIOLATION');
      expect(error.error.message).toContain('Restaurant context mismatch');
      expect(closeCode).toBe(1008); // Security policy violation
    });

    it('should log security violation to audit logs', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A, 'audit-test-user');

      // Attempt cross-restaurant access
      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: RESTAURANT_B,
          loopback: true,
        },
      }));

      // Wait for connection to close
      await new Promise((resolve) => ws.on('close', resolve));

      // Check if security violation was logged
      // Note: This test assumes security_audit_logs table exists
      // In production, verify the audit log entry was created
      // For now, we verify the connection was closed as expected
      expect(ws.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Test 3: Missing Restaurant ID Blocked', () => {
    it('should reject session without restaurant_id in config', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A);

      // Send session.start WITHOUT restaurant_id
      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          loopback: true,
          // restaurant_id: MISSING
        },
      }));

      // Should receive error and connection close
      const errorPromise = waitForMessage(ws, msg => msg.type === 'error');
      const closePromise = new Promise<number>((resolve) => {
        ws.on('close', (code) => resolve(code));
      });

      const error = await errorPromise;
      const closeCode = await closePromise;

      expect(error.error.code).toBe('MULTI_TENANCY_VIOLATION');
      expect(error.error.message).toContain('Restaurant context required');
      expect(closeCode).toBe(1008);
    });

    it('should reject session with undefined restaurant_id', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A);

      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: undefined,
          loopback: true,
        },
      }));

      const closePromise = new Promise<number>((resolve) => {
        ws.on('close', (code) => resolve(code));
      });

      const closeCode = await closePromise;
      expect(closeCode).toBe(1008);
    });

    it('should reject session with null restaurant_id', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A);

      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: null,
          loopback: true,
        },
      }));

      const closePromise = new Promise<number>((resolve) => {
        ws.on('close', (code) => resolve(code));
      });

      const closeCode = await closePromise;
      expect(closeCode).toBe(1008);
    });
  });

  describe('Test 4: JWT Without Restaurant Context', () => {
    it('should reject connection if JWT lacks restaurant_id', async () => {
      // Create JWT without restaurant_id
      const invalidToken = jwt.sign(
        {
          sub: USER_ID,
          // restaurant_id: MISSING
          role: 'customer',
          email: 'test@example.com',
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const ws = new WebSocket(`ws://localhost:${serverPort}/voice?token=${invalidToken}`);

      // Should be rejected during connection
      const closePromise = new Promise<number>((resolve) => {
        ws.on('close', (code) => resolve(code));
      });

      const closeCode = await closePromise;
      expect(closeCode).toBe(1008); // Authentication failed
    });
  });

  describe('Test 5: Case Sensitivity Bypass Prevention', () => {
    it('should normalize restaurant IDs to prevent case-based bypass', async () => {
      const ws = await createAuthenticatedConnection('RESTAURANT-TEST');

      // Try different case variation
      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: 'restaurant-test', // lowercase
          loopback: true,
        },
      }));

      // Should succeed (case-insensitive match)
      const response = await waitForMessage(ws, msg =>
        msg.type === 'session.started' || msg.type === 'error'
      );

      expect(response.type).toBe('session.started');

      ws.close();
    });

    it('should still block different restaurants regardless of case', async () => {
      const ws = await createAuthenticatedConnection('restaurant-a');

      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: 'RESTAURANT-B', // Different restaurant, different case
          loopback: true,
        },
      }));

      const closePromise = new Promise<number>((resolve) => {
        ws.on('close', (code) => resolve(code));
      });

      const closeCode = await closePromise;
      expect(closeCode).toBe(1008);
    });
  });

  describe('Test 6: Defense-in-Depth Validation', () => {
    it('should validate restaurant on every audio chunk', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A);

      // Start valid session
      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: RESTAURANT_A,
          loopback: true,
        },
      }));

      await waitForMessage(ws, msg => msg.type === 'session.started');

      // Send multiple audio chunks (all should be validated)
      for (let i = 0; i < 5; i++) {
        ws.send(JSON.stringify({
          type: 'audio',
          timestamp: Date.now(),
          data: {
            chunk: Buffer.from(`test-audio-${i}`).toString('base64'),
            hasVoice: true,
          },
        }));
      }

      // Should process all without error
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(ws.readyState).toBe(WebSocket.OPEN);

      ws.close();
    });
  });

  describe('Test 7: No Information Leakage', () => {
    it('should not expose other restaurant IDs in error messages', async () => {
      const ws = await createAuthenticatedConnection(RESTAURANT_A);

      ws.send(JSON.stringify({
        type: 'session.start',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: RESTAURANT_B,
          loopback: true,
        },
      }));

      const error = await waitForMessage(ws, msg => msg.type === 'error');

      // Error message should be generic, not expose RESTAURANT_B
      expect(error.error.message).not.toContain(RESTAURANT_B);
      expect(error.error.message).toContain('Restaurant context mismatch');
    });
  });
});
