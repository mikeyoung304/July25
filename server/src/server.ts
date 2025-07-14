import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { setupRoutes } from './routes';
import { initializeDatabase } from './config/database';
import { validateEnvironment } from './config/environment';
import { setupWebSocketHandlers } from './utils/websocket';
import { setupAIWebSocket } from './ai/websocket';
import { apiLimiter, voiceOrderLimiter, healthCheckLimiter } from './middleware/rateLimiter';
import { OrdersService } from './services/orders.service';
import { aiRoutes } from './routes/ai.routes';
import { metricsMiddleware } from './middleware/metrics';

// Load environment variables
dotenv.config();

// Validate required environment variables
validateEnvironment();

const app: Express = express();
const httpServer = createServer(app);
export const wss = new WebSocketServer({ server: httpServer });

// Set WebSocket server for OrdersService
OrdersService.setWebSocketServer(wss);

// Global middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Metrics endpoint (before rate limiting)
app.use(metricsMiddleware);

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/v1/orders/voice', voiceOrderLimiter);
app.use('/health', healthCheckLimiter);

// API routes
app.use('/api/v1', setupRoutes());

// AI routes (consolidated into main backend)
app.use('/api/v1/ai', aiRoutes);

// Health check (outside API versioning for monitoring tools)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// WebSocket setup
setupWebSocketHandlers(wss);
setupAIWebSocket(wss);

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Unified backend running on port ${PORT}`);
      logger.info(`   - REST API: http://localhost:${PORT}/api/v1`);
      logger.info(`   - Voice AI: http://localhost:${PORT}/api/v1/ai`);
      logger.info(`   - WebSocket: ws://localhost:${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();