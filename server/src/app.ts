import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { installSecurity } from './middleware/security';
import { voiceOrderLimiter, healthCheckLimiter } from './middleware/rateLimiter';
import { normalizeCasing } from './middleware/normalize-casing';
import { csrfMiddleware, csrfErrorHandler } from './middleware/csrf';
import { originGuard } from './middleware/origin-guard';
import { requestLogger } from './middleware/requestLogger';
import { metricsMiddleware, register } from './middleware/metrics';
import { authenticate, requireRole } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { setupRoutes } from './routes';

export function createApp(): Express {
  const app = express();

  installSecurity(app);

  app.use(cookieParser());
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = Buffer.from(buf);
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(normalizeCasing);
  app.use(csrfMiddleware());
  if (process.env['COOKIE_AUTH'] === '1') {
    app.use('/api/v1/kiosk', originGuard);
    app.use('/api/v1/stations', originGuard);
  }
  app.use(requestLogger);
  app.use(metricsMiddleware);

  app.get('/internal/metrics', authenticate, requireRole(['admin']), async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.use('/api/v1/orders/voice', voiceOrderLimiter);
  app.use('/health', healthCheckLimiter);

  app.use('/api/v1', setupRoutes());
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'],
    });
  });

  app.use(csrfErrorHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
