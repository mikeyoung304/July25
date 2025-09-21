// @ts-nocheck
import { Router, Request, Response } from 'express';
import { VoiceWebSocketServer } from './websocket-server';
import { VoiceServerHealthSchema } from './types';
import { WebSocket } from 'ws';

let voiceServer: VoiceWebSocketServer;

export function initializeVoiceServer(): VoiceWebSocketServer {
  if (!voiceServer) {
    voiceServer = new VoiceWebSocketServer();
  }
  return voiceServer;
}

export function getVoiceServer(): VoiceWebSocketServer | undefined {
  return voiceServer;
}

export const voiceRoutes = Router();

// Add basic middleware for all voice routes
voiceRoutes.use((req, res, next) => {
  // Add CORS headers for voice endpoints
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-restaurant-id');
  
  // Add cache control
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  next();
});

// Voice health check
voiceRoutes.get('/health', (_req: Request, res: Response) => {
  const server = getVoiceServer();
  const activeSessions = server?.getActiveSessions() || 0;
  
  // Determine health status based on system state
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const openaiStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  
  if (!server) {
    status = 'unhealthy';
  } else if (activeSessions > 100) {
    status = 'degraded'; // High load
  }
  
  // Get memory usage
  const memUsage = process.memoryUsage();
  const memoryUsage = {
    used: memUsage.heapUsed,
    total: memUsage.heapTotal,
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  };
  
  const healthData = {
    status,
    service: 'voice-websocket' as const,
    active_sessions: activeSessions,
    uptime_ms: Math.round(process.uptime() * 1000),
    memory_usage: memoryUsage,
    openai_status: openaiStatus,
    timestamp: new Date().toISOString(),
  };
  
  // Validate response structure
  try {
    VoiceServerHealthSchema.parse(healthData);
    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'voice-websocket',
      active_sessions: 0,
      uptime_ms: 0,
      timestamp: new Date().toISOString(),
      error: 'Health check validation failed',
    });
  }
});

// Voice metrics endpoint
voiceRoutes.get('/metrics', (_req: Request, res: Response): void => {
  const server = getVoiceServer();
  
  if (!server) {
    return res.status(503).json({
      error: 'Voice server not initialized',
      timestamp: new Date().toISOString(),
    });
  }

  const allMetrics = server.getAllMetrics();
  const memUsage = process.memoryUsage();
  
  const metrics = {
    server_info: {
      uptime_ms: Math.round(process.uptime() * 1000),
      memory_usage: {
        heap_used: memUsage.heapUsed,
        heap_total: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      active_sessions: server.getActiveSessions(),
      node_version: process.version,
      platform: process.platform,
    },
    session_metrics: {
      total_sessions: allMetrics.length,
      average_error_count: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.error_count, 0) / allMetrics.length 
        : 0,
      total_reconnects: allMetrics.reduce((sum, m) => sum + m.reconnect_count, 0),
    },
    individual_sessions: allMetrics,
    timestamp: new Date().toISOString(),
  };

  res.json(metrics);
});

// Session-specific metrics
voiceRoutes.get('/sessions/:sessionId/metrics', (req: Request, res: Response): void => {
  const server = getVoiceServer();
  const { sessionId } = req.params;
  
  if (!server) {
    return res.status(503).json({
      error: 'Voice server not initialized',
      timestamp: new Date().toISOString(),
    });
  }

  const metrics = server.getSessionMetrics(sessionId);
  
  if (!metrics) {
    return res.status(404).json({
      error: 'Session not found',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    session_id: sessionId,
    metrics,
    timestamp: new Date().toISOString(),
  });
});

// Handshake readiness endpoint
voiceRoutes.get('/handshake', async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-10-01';
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return res.status(502).json({
      ok: false,
      model,
      code: 'NO_API_KEY',
      message: 'OPENAI_API_KEY not configured'
    });
  }

  let ws: WebSocket | null = null;
  const timeout = setTimeout(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
  }, 2000); // 2 second timeout

  try {
    const url = `wss://api.openai.com/v1/realtime?model=${model}`;
    
    // Create WebSocket with required headers
    ws = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      if (!ws) return reject(new Error('WebSocket creation failed'));
      
      ws.on('open', () => {
        // Send minimal session update
        ws!.send(JSON.stringify({
          type: 'session.update',
          session: { modalities: ['text'] }
        }));
        
        // Close immediately after sending
        setTimeout(() => {
          if (ws) ws.close();
          resolve();
        }, 100);
      });

      ws.on('error', (err) => {
        reject(err);
      });
    });

    clearTimeout(timeout);
    const handshakeMs = Date.now() - startTime;

    res.json({
      ok: true,
      model,
      handshakeMs,
      note: 'realtime:v1'
    });
  } catch (error: any) {
    clearTimeout(timeout);
    if (ws) ws.close();
    
    // Check for missing header hint
    const hint = error.message?.includes('401') || error.message?.includes('Unauthorized')
      ? 'Missing OpenAI-Beta: realtime=v1'
      : undefined;

    res.status(502).json({
      ok: false,
      model,
      code: error.code || 'HANDSHAKE_FAILED',
      message: error.message || 'Failed to connect to OpenAI Realtime',
      hint
    });
  }
});

// WebSocket connection info endpoint
voiceRoutes.get('/connections', (_req: Request, res: Response): void => {
  const server = getVoiceServer();
  
  if (!server) {
    return res.status(503).json({
      error: 'Voice server not initialized',
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    total_connections: server.getActiveSessions(),
    connection_endpoint: '/voice-stream',
    supported_protocols: ['websocket'],
    supported_audio_formats: ['pcm16', 'g711_ulaw', 'g711_alaw'],
    sample_rates: [8000, 16000, 24000, 44100],
    max_session_duration_ms: 300000, // 5 minutes
    heartbeat_interval_ms: 30000, // 30 seconds
    timestamp: new Date().toISOString(),
  });
});