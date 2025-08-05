import promBundle from 'express-prom-bundle';
import type { RequestHandler } from 'express';
import { Counter, Gauge, register } from 'prom-client';

// Voice metrics
const voiceChunksTotal = new Counter({
  name: 'voice_chunks_total',
  help: 'Total number of voice audio chunks received',
});

const voiceOverrunTotal = new Counter({
  name: 'voice_overrun_total',
  help: 'Total number of voice audio overruns (buffer full)',
});

const voiceActiveConnections = new Gauge({
  name: 'voice_active_connections',
  help: 'Number of active voice WebSocket connections',
});

// Register metrics
register.registerMetric(voiceChunksTotal);
register.registerMetric(voiceOverrunTotal);
register.registerMetric(voiceActiveConnections);

// Export metrics for use in WebSocket handler
global.voiceMetrics = {
  voiceChunksTotal,
  voiceOverrunTotal,
  voiceActiveConnections,
};

// Create promBundle middleware with automatic HTTP metrics
const promBundleMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: {
    app: 'rebuild-6.0',
    environment: process.env['NODE_ENV'] || 'development',
  },
  promClient: {
    collectDefaultMetrics: {
      prefix: 'rebuild_',
    },
  },
  // CRITICAL: Don't auto-register /metrics route
  autoregister: false,
  // Use a specific endpoint for metrics
  metricsPath: '/metrics',
});

// Export the middleware function that tracks HTTP metrics
export const metricsMiddleware = promBundleMiddleware as unknown as RequestHandler;

// Export register for metrics endpoint
export { register };