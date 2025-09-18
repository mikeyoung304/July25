import { Router, Request, Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { EnhancedOpenAIAdapter } from '../ai/voice/EnhancedOpenAIAdapter';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Twilio message types
interface TwilioStartMessage {
  event: 'start';
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    from: string;
    to: string;
    customParameters?: Record<string, string>;
  };
}

interface TwilioMediaMessage {
  event: 'media';
  streamSid: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64 encoded audio
  };
}

interface TwilioStopMessage {
  event: 'stop';
  streamSid: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
}

interface TwilioMarkMessage {
  event: 'mark';
  streamSid: string;
  mark: {
    name: string;
  };
}

type TwilioMessage = TwilioStartMessage | TwilioMediaMessage | TwilioStopMessage | TwilioMarkMessage;

// Active sessions tracking
const activeSessions = new Map<string, {
  sessionId: string;
  callSid: string;
  from: string;
  to: string;
  adapter: EnhancedOpenAIAdapter;
  startTime: number;
  lastActivity: number;
}>();

/**
 * Create Express routes for Twilio webhooks
 */
export function createTwilioRoutes(): Router {
  const router = Router();

  /**
   * Twilio webhook for incoming calls
   * Returns TwiML to connect the call to our WebSocket
   */
  router.post('/voice/incoming', (req: Request, res: Response) => {
    const { From, To, CallSid } = req.body;
    
    logger.info('[Twilio] Incoming call', {
      from: From,
      to: To,
      callSid: CallSid
    });

    // Get the host for WebSocket URL
    const protocol = req.protocol === 'https' ? 'wss' : 'ws';
    const host = req.get('host');
    const streamUrl = `${protocol}://${host}/voice/stream`;

    // Custom parameters to pass to WebSocket
    const customParameters = {
      restaurantId: process.env['RESTAURANT_ID'] || 'default',
      callSid: CallSid
    };

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. I'll connect you to our ordering assistant.</Say>
  <Connect>
    <Stream url="${streamUrl}">
      ${Object.entries(customParameters).map(([key, value]) => 
        `<Parameter name="${key}" value="${value}"/>`
      ).join('\n      ')}
    </Stream>
  </Connect>
</Response>`;

    res.type('text/xml').send(twiml);
  });

  /**
   * Twilio status callback for call events
   */
  router.post('/voice/status', (req: Request, res: Response) => {
    const { CallSid, CallStatus, CallDuration } = req.body;
    
    logger.info('[Twilio] Call status update', {
      callSid: CallSid,
      status: CallStatus,
      duration: CallDuration
    });

    // Clean up session if call ended
    if (CallStatus === 'completed' || CallStatus === 'failed') {
      for (const [streamSid, session] of activeSessions.entries()) {
        if (session.callSid === CallSid) {
          session.adapter.disconnect();
          activeSessions.delete(streamSid);
          break;
        }
      }
    }

    res.status(200).send('OK');
  });

  /**
   * Health check endpoint
   */
  router.get('/voice/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      activeSessions: activeSessions.size,
      uptime: process.uptime()
    });
  });

  /**
   * Get active sessions (for debugging)
   */
  router.get('/voice/sessions', (req: Request, res: Response) => {
    const sessions = Array.from(activeSessions.entries()).map(([streamSid, session]) => ({
      streamSid,
      sessionId: session.sessionId,
      callSid: session.callSid,
      from: session.from,
      duration: Date.now() - session.startTime,
      lastActivity: Date.now() - session.lastActivity
    }));

    res.json({ sessions });
  });

  return router;
}

/**
 * Attach WebSocket server for Twilio Media Streams
 */
export function attachTwilioWebSocket(server: HTTPServer): void {
  const wss = new WebSocketServer({
    server,
    path: '/voice/stream'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const sessionId = uuidv4();
    let streamSid: string | null = null;
    let adapter: EnhancedOpenAIAdapter | null = null;
    let restaurantId = process.env['RESTAURANT_ID'] || 'default';
    let callSid: string | null = null;

    logger.info('[Twilio] WebSocket connection established', {
      sessionId,
      url: req.url
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message: TwilioMessage = JSON.parse(data.toString());

        switch (message.event) {
          case 'start':
            // Initialize session
            streamSid = message.start.streamSid;
            callSid = message.start.callSid;
            
            // Get restaurant ID from custom parameters if provided
            if (message.start.customParameters?.restaurantId) {
              restaurantId = message.start.customParameters.restaurantId;
            }

            logger.info('[Twilio] Stream started', {
              sessionId,
              streamSid,
              callSid,
              from: message.start.from,
              to: message.start.to
            });

            // Create Enhanced OpenAI adapter
            adapter = new EnhancedOpenAIAdapter(sessionId, restaurantId, {
              audio_format: 'g711_ulaw',
              sample_rate: 8000
            });

            // Set Twilio connection
            adapter.setTwilioConnection(ws, streamSid);

            // Connect to OpenAI
            await adapter.connect();

            // Track session
            activeSessions.set(streamSid, {
              sessionId,
              callSid,
              from: message.start.from,
              to: message.start.to,
              adapter,
              startTime: Date.now(),
              lastActivity: Date.now()
            });

            // Send initial greeting
            adapter.sendToOpenAI({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
                instructions: 'Greet the customer and ask how you can help them today.'
              }
            });

            break;

          case 'media':
            // Forward audio to OpenAI
            if (adapter && streamSid) {
              const session = activeSessions.get(streamSid);
              if (session) {
                session.lastActivity = Date.now();
              }

              // Send audio to adapter (it will handle format conversion)
              await adapter.sendAudio(message.media.payload);
            }
            break;

          case 'stop':
            // Clean up session
            logger.info('[Twilio] Stream stopped', {
              sessionId,
              streamSid: message.streamSid
            });

            if (adapter) {
              await adapter.disconnect();
            }

            if (message.streamSid) {
              activeSessions.delete(message.streamSid);
            }
            break;

          case 'mark':
            // Custom mark events (can be used for analytics)
            logger.debug('[Twilio] Mark received', {
              sessionId,
              streamSid,
              mark: message.mark.name
            });
            break;

          default:
            logger.warn('[Twilio] Unknown message type', {
              sessionId,
              event: (message as any).event
            });
        }
      } catch (error) {
        logger.error('[Twilio] Error processing message', {
          sessionId,
          error
        });
      }
    });

    ws.on('close', async () => {
      logger.info('[Twilio] WebSocket closed', {
        sessionId,
        streamSid
      });

      // Clean up
      if (adapter) {
        await adapter.disconnect();
      }

      if (streamSid) {
        activeSessions.delete(streamSid);
      }
    });

    ws.on('error', (error) => {
      logger.error('[Twilio] WebSocket error', {
        sessionId,
        error
      });
    });
  });

  // Periodic cleanup of stale sessions
  setInterval(() => {
    const now = Date.now();
    const maxInactivity = 5 * 60 * 1000; // 5 minutes

    for (const [streamSid, session] of activeSessions.entries()) {
      if (now - session.lastActivity > maxInactivity) {
        logger.warn('[Twilio] Cleaning up inactive session', {
          sessionId: session.sessionId,
          streamSid
        });

        session.adapter.disconnect();
        activeSessions.delete(streamSid);
      }
    }
  }, 60000); // Check every minute

  logger.info('[Twilio] WebSocket server attached to /voice/stream');
}

/**
 * Utility to send audio to Twilio
 */
export function sendAudioToTwilio(ws: WebSocket, streamSid: string, audioBase64: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      event: 'media',
      streamSid,
      media: {
        payload: audioBase64
      }
    }));
  }
}

/**
 * Utility to clear Twilio audio buffer (for barge-in)
 */
export function clearTwilioBuffer(ws: WebSocket, streamSid: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      event: 'clear',
      streamSid
    }));
  }
}

/**
 * Get session metrics
 */
export function getSessionMetrics(): any {
  const metrics = {
    activeSessions: activeSessions.size,
    sessions: [] as any[]
  };

  for (const [streamSid, session] of activeSessions.entries()) {
    metrics.sessions.push({
      streamSid,
      sessionId: session.sessionId,
      callSid: session.callSid,
      duration: Date.now() - session.startTime,
      metrics: session.adapter.getMetrics()
    });
  }

  return metrics;
}