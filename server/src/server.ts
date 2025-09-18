// IMPORTANT: Load environment variables FIRST before any other imports
// This ensures all services have access to env vars during initialization
import dotenv from 'dotenv';
import path from 'path';

// Load from root .env file explicitly
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Now import everything else
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { setupRoutes } from './routes';
import { initializeDatabase } from './config/database';
import { validateEnvironment } from './config/environment';
import { aiService } from './services/ai.service';
import { setupWebSocketHandlers } from './utils/websocket';
import { setupAIWebSocket } from './ai/websocket';
import { voiceOrderLimiter, healthCheckLimiter } from './middleware/rateLimiter';
import { OrdersService } from './services/orders.service';
import { aiRoutes } from './routes/ai.routes';
import { realtimeRoutes } from './routes/realtime.routes';
import { metricsMiddleware, register } from './middleware/metrics';
import { authenticate, requireRole } from './middleware/auth';
import { csrfMiddleware, csrfErrorHandler } from './middleware/csrf';
import { applySecurity, securityMonitor } from './middleware/security';
import { normalizeCasing } from './middleware/normalize-casing';

// Validate required environment variables
validateEnvironment();

const app: Express = express();
const httpServer = createServer(app);
export const wss = new WebSocketServer({ 
  server: httpServer,
  perMessageDeflate: false, // Disable compression for better performance
  maxPayload: 5 * 1024 * 1024, // 5MB max payload
  clientTracking: true,
});

// Set WebSocket server for OrdersService
OrdersService.setWebSocketServer(wss);

// Global middleware
// Apply comprehensive security middleware (helmet + CORS + API rate limiting)
applySecurity(app);

// Cookie parser for CSRF
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Normalize casing middleware (after body parsing, before CSRF)
app.use(normalizeCasing);

// CSRF protection (after cookie parser, before routes)
app.use(csrfMiddleware());

// Request logging
app.use(requestLogger);

// Metrics middleware for tracking (not serving metrics)
app.use(metricsMiddleware);

// Protected metrics endpoint for internal monitoring
app.get('/internal/metrics', authenticate, requireRole(['admin']), (_req, res) => {
  res.set('Content-Type', register.contentType);
  register.metrics().then(metrics => {
    res.end(metrics);
  });
});

// Additional rate limiting for sensitive surfaces
app.use('/api/v1/orders/voice', voiceOrderLimiter);
app.use('/health', healthCheckLimiter);

// API routes
app.use('/api/v1', setupRoutes());

// AI routes (consolidated into main backend)
app.use('/api/v1/ai', aiRoutes);

// Real-time voice routes (WebRTC)
app.use('/api/v1/realtime', realtimeRoutes);

// Health check (outside API versioning for monitoring tools)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'],
  });
});

// CSRF error handler (before general error handler)
app.use(csrfErrorHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// WebSocket setup
setupWebSocketHandlers(wss);
setupAIWebSocket(wss);

// Start server
const PORT = process.env['PORT'] || 3001;

async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Initialize menu context for AI service
    try {
      const restaurantId = process.env['DEFAULT_RESTAURANT_ID'] || '11111111-1111-1111-1111-111111111111';
      await aiService.syncMenuFromDatabase(restaurantId);
      logger.info('✅ Menu context initialized for AI service');
    } catch (error) {
      logger.warn('⚠️  Failed to initialize menu context:', error);
    }
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Unified backend running on port ${PORT}`);
      logger.info(`   - REST API: http://localhost:${PORT}/api/v1`);
      logger.info(`   - Voice AI: http://localhost:${PORT}/api/v1/ai`);
      logger.info(`   - WebSocket: ws://localhost:${PORT}`);
      logger.info(`🌍 Environment: ${process.env['NODE_ENV']}`);
      logger.info(`🔗 Frontend URL: ${process.env['FRONTEND_URL']}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Cleanup tracking
let isShuttingDown = false;

// Handle graceful shutdown
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`${signal} received, shutting down gracefully...`);
  
  // Close WebSocket server first
  wss.clients.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });
  wss.close();
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('Server closed');
  });
  
  // Clean up AI service connections
  // Note: AIService doesn't have cleanup method
  
  // Clean up AI connections
  try {
    // const { buildPanelServiceInstance } = await import('./services/buildpanel.service');
    // if (buildPanelServiceInstance?.cleanup) {
    //   buildPanelServiceInstance.cleanup();
    // }
  } catch (error) {
    logger.debug('AI cleanup not needed:', error instanceof Error ? error.message : String(error));
  }
  
  // Force exit after 3 seconds (tsx watch needs faster exit)
  setTimeout(() => {
    logger.info('Force shutdown after timeout');
    process.exit(0);
  }, 3000);
}

// Only add listeners once
if (!process.listenerCount('SIGTERM')) {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}
if (!process.listenerCount('SIGINT')) {
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
