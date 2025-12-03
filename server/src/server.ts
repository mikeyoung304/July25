// IMPORTANT: Environment must be loaded FIRST via env.ts
// The import of ./config/environment will trigger ./config/env.ts
import { validateEnvironment, getConfig } from './config/environment';
import { EnvValidationError } from './config/env';
import { initializeDatabase } from './config/database';
import { initializeSentry, getSentryRequestHandler, getSentryTracingHandler, getSentryErrorHandler } from './config/sentry';

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
import { aiService } from './services/ai.service';
import { setupWebSocketHandlers, cleanupWebSocketServer } from './utils/websocket';
import { apiLimiter, voiceOrderLimiter, healthCheckLimiter } from './middleware/rateLimiter';
import { stopRateLimiterCleanup } from './middleware/authRateLimiter';
import { OrdersService } from './services/orders.service';
import { TableService } from './services/table.service';
import { aiRoutes } from './routes/ai.routes';
import { realtimeRoutes } from './routes/realtime.routes';
import { metricsMiddleware, register } from './middleware/metrics';
import { authenticate, requireRole } from './middleware/auth';
import { csrfMiddleware, csrfErrorHandler } from './middleware/csrf';
import { applySecurity } from './middleware/security';
import { sanitizeRequest } from './middleware/requestSanitizer';
import { slugResolver } from './middleware/slugResolver';
// Disabled per ADR-001: import { responseTransformMiddleware } from './middleware/responseTransform';

const app: Express = express();
const httpServer = createServer(app);
export const wss = new WebSocketServer({
  server: httpServer,
  perMessageDeflate: false, // Disable compression for better performance
  maxPayload: 5 * 1024 * 1024, // 5MB max payload
  clientTracking: true,
});

// Set WebSocket server for services that need real-time broadcasts
OrdersService.setWebSocketServer(wss);
TableService.setWebSocketServer(wss);

// Initialize Sentry monitoring (before any other middleware)
initializeSentry();

// Sentry request handler (must be first middleware)
app.use(getSentryRequestHandler());

// Sentry tracing middleware (must be after request handler)
app.use(getSentryTracingHandler());

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

  // July25 canonical deployment (production)
  'https://july25-client.vercel.app',

  // Main branch preview deployment
  'https://july25-client-git-main-mikeyoung304-gmailcoms-projects.vercel.app',
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

    // Check if origin is in allowed list
    if (normalized && allowedOrigins.has(normalized)) {
      callback(null, true);
    }
    // Allow Vercel preview deployments matching our project patterns
    else if (normalized && (
      normalized.match(/^https:\/\/july25-client-[a-z0-9]+-mikeyoung304-gmailcoms-projects\.vercel\.app$/) ||
      normalized.match(/^https:\/\/rebuild-60-[a-z0-9]+-mikeyoung304-gmailcoms-projects\.vercel\.app$/) ||
      normalized.match(/^https:\/\/grow-[a-z0-9]+-mikeyoung304-gmailcoms-projects\.vercel\.app$/)
    )) {
      callback(null, true);
    }
    else {
      console.error(`❌ CORS blocked origin: "${origin}"`);
      console.error('   Allowed origins:', allowedOriginList);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id', 'x-request-id', 'X-CSRF-Token', 'X-Restaurant-ID', 'x-demo-token-version', 'X-Client-Flow', 'x-client-flow'],
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

// Slug resolver middleware (resolves restaurant slugs to UUIDs in headers)
app.use(slugResolver);

// Response transformation middleware - DISABLED per ADR-001 (full snake_case convention)
// Rationale: Database uses snake_case, frontend expects snake_case, transformation adds overhead
// Frontend has defensive code that checks snake_case first, so this is safe to disable
// app.use(responseTransformMiddleware);

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
// Redirect to the comprehensive health check endpoint
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.redirect(301, '/api/v1/health');
});

// Also support /api/health for consistency
app.get('/api/health', (_req: express.Request, res: express.Response) => {
  res.redirect(301, '/api/v1/health');
});

// CSRF error handler (before general error handler)
app.use(csrfErrorHandler);

// Sentry error handler (must be after routes, before other error handlers)
app.use(getSentryErrorHandler());

// Error handling middleware (must be last)
app.use(errorHandler);

// WebSocket setup
setupWebSocketHandlers(wss);

// Start server
async function startServer() {
  try {
    // Validate environment and initialize database
    validateEnvironment();
    await initializeDatabase();
    const config = getConfig();

    // TODO-151: Security warning for development rate limit on production
    if (process.env['RENDER'] === 'true' && process.env['NODE_ENV'] === 'development') {
      logger.error('SECURITY WARNING: NODE_ENV=development on production environment. Rate limits are 3x more permissive. Set NODE_ENV=production.');
    }

    // Initialize menu context for AI service
    try {
      const restaurantId = config.restaurant.defaultId;
      await aiService.syncMenuFromDatabase(restaurantId);
      logger.info('✅ Menu context initialized for AI service');
    } catch (error) {
      logger.warn('⚠️  Failed to initialize menu context:', error);
    }

    httpServer.listen(config.port, () => {
      const host = config.nodeEnv === 'production'
        ? config.frontend.url.replace('http://', '').replace('https://', '').split(':')[0]
        : 'localhost';

      logger.info(`🚀 Unified backend running on port ${config.port}`);
      logger.info(`   - REST API: http://${host}:${config.port}/api/v1`);
      logger.info(`   - Voice AI: http://${host}:${config.port}/api/v1/ai`);
      logger.info(`   - WebSocket: ws://${host}:${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 Frontend URL: ${config.frontend.url}`);
      logger.info(`🏢 Default Restaurant: ${config.restaurant.defaultId}`);
    });
  } catch (error) {
    // Handle environment validation errors per ADR-009 fail-fast policy
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
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


  // Clean up auth rate limiter
  try {
    stopRateLimiterCleanup();
    logger.info('Auth rate limiter cleanup complete');
  } catch (error) {
    logger.error('Error stopping rate limiter cleanup:', error);
  }

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
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

  // Force exit after 5 seconds (increased from 3s to allow cleanup)
  setTimeout(() => {
    logger.info('Force shutdown after timeout');
    process.exit(0);
  }, 5000);
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
