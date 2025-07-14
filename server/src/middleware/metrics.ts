import { Request, Response, NextFunction } from 'express';
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

// Middleware to expose metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metrics') {
    res.set('Content-Type', register.contentType);
    register.metrics().then(metrics => {
      res.send(metrics);
    }).catch(err => {
      res.status(500).send('Error generating metrics');
    });
  } else {
    next();
  }
}