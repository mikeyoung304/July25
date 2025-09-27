// IMPORTANT: Load environment variables FIRST before any other imports
// This ensures all services have access to env vars during initialization
import dotenv from 'dotenv';
import path from 'path';

// Load from root .env file explicitly
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Now import everything else
import express, { Express } from 'express';
import cors from 'cors';
import _helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { setupRoutes } from './routes';
import { initializeDatabase } from './config/database';
import { validateEnvironment, getConfig } from './config/environment';
import { aiService } from './services/ai.service';
import { setupWebSocketHandlers, cleanupWebSocketServer } from './utils/websocket';
import { setupAIWebSocket } from './ai/websocket';
import { apiLimiter, voiceOrderLimiter, healthCheckLimiter } from './middleware/rateLimiter';
import { OrdersService } from './services/orders.service';
import { aiRoutes } from './routes/ai.routes';
import { realtimeRoutes } from './routes/realtime.routes';
import { metricsMiddleware, register } from './middleware/metrics';
import { authenticate, requireRole } from './middleware/auth';
import { csrfMiddleware, csrfErrorHandler } from './middleware/csrf';
import { applySecurity } from './middleware/security';
import { sanitizeRequest } from './middleware/requestSanitizer';
import { responseTransformMiddleware } from './middleware/responseTransform';

// Validate required environment variables
try {
  validateEnvironment();
  logger.info('✅ Environment validation passed');
} catch (error) {
  logger.error('❌ Environment validation failed:', error);
  logger.error('Please check your .env file and ensure all required variables are set');
  process.exit(1);
}

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
// Apply comprehensive security middleware
applySecurity(app);

// Utility to normalize and validate origins (ensures scheme + host only)
const normalizeOrigin = (origin: string | undefined | null): string | null => {
  if (!origin) return null;
  const trimmed = origin.trim();
  if (!trimmed) return null;

  try {
    const candidate = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const { protocol, host } = new URL(candidate);
    if (!protocol || !host) return null;
    return `${protocol}//${host}`;
  } catch {
    return null;
  }
};

const allowedOrigins = new Set<string>([
  // Local development
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173', // vite preview
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',

  // Production domains
  'https://growfreshlocalfood.com',
  'https://www.growfreshlocalfood.com',

  // July25 canonical deployment
  'https://july25-client.vercel.app',

  // Rebuild-60 canonical deployment
  'https://rebuild-60.vercel.app',

  // Historic preview deployments (kept for compatibility)
  'https://july25-client-git-feat-r-b7c846-mikeyoung304-gmailcoms-projects.vercel.app',
  'https://rebuild-60-ao1ku064c-mikeyoung304-gmailcoms-projects.vercel.app',
  'https://grow-git-main-mikeyoung304-gmailcoms-projects.vercel.app',
  'https://grow-ir056u92z-mikeyoung304-gmailcoms-projects.vercel.app',
]);

const addOrigin = (origin: string | undefined | null, label?: string) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    if (origin) {
      logger.warn('Skipping invalid CORS origin', { origin, label });
    }
    return;
  }
  allowedOrigins.add(normalized);
};

// Add explicit environment overrides (comma-separated list)
if (process.env['ALLOWED_ORIGINS']) {
  process.env['ALLOWED_ORIGINS']
    .split(',')
    .forEach(origin => addOrigin(origin, 'ALLOWED_ORIGINS'));
}

// Add primary frontend URL (Render, Vercel, etc.)
addOrigin(process.env['FRONTEND_URL'], 'FRONTEND_URL');
addOrigin(process.env['RENDER_EXTERNAL_URL'], 'RENDER_EXTERNAL_URL');

// Support Vercel deployment metadata (preview/staging URLs)
addOrigin(process.env['VERCEL_URL'], 'VERCEL_URL');
addOrigin(process.env['VERCEL_BRANCH_URL'], 'VERCEL_BRANCH_URL');
addOrigin(process.env['VERCEL_DEPLOYMENT_URL'], 'VERCEL_DEPLOYMENT_URL');
addOrigin(process.env['NEXT_PUBLIC_VERCEL_URL'], 'NEXT_PUBLIC_VERCEL_URL');

const allowedOriginList = Array.from(allowedOrigins);

logger.info('🔧 CORS allowed origins:', allowedOriginList);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const normalized = normalizeOrigin(origin);

    if (normalized && allowedOrigins.has(normalized)) {
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked origin: "${origin}"`);
      console.error('   Allowed origins:', allowedOriginList);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id', 'x-request-id', 'X-CSRF-Token', 'X-Restaurant-ID'],
  exposedHeaders: ['ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset', 'x-order-data', 'x-transcript', 'x-response-text'],
  maxAge: 86400, // 24 hours
}));

// Handle preflight requests
app.options('*', cors());

// Cookie parser for CSRF
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request sanitization (after body parsing, before other middleware)
app.use(sanitizeRequest);

// Response transformation middleware (transforms snake_case to camelCase)
app.use(responseTransformMiddleware);

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

// Rate limiting
app.use('/api/', apiLimiter);
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
      const config = getConfig();
      const restaurantId = config.restaurant.defaultId;
      await aiService.syncMenuFromDatabase(restaurantId);
      logger.info('✅ Menu context initialized for AI service');
    } catch (error) {
      logger.warn('⚠️  Failed to initialize menu context:', error);
    }
    
    httpServer.listen(PORT, () => {
      const config = getConfig();
      const host = process.env['NODE_ENV'] === 'production' ? config.frontend.url.replace('http://', '').replace('https://', '').split(':')[0] : 'localhost';
      
      logger.info(`🚀 Unified backend running on port ${PORT}`);
      logger.info(`   - REST API: http://${host}:${PORT}/api/v1`);
      logger.info(`   - Voice AI: http://${host}:${PORT}/api/v1/ai`);
      logger.info(`   - WebSocket: ws://${host}:${PORT}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 Frontend URL: ${config.frontend.url}`);
      logger.info(`🏢 Default Restaurant: ${config.restaurant.defaultId}`);
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
  
  // Clean up WebSocket heartbeat interval FIRST
  cleanupWebSocketServer();
  
  // Close WebSocket server 
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
