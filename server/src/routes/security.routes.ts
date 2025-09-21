import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { securityMonitor } from '../middleware/security';

const router = Router();

/**
 * Security monitoring endpoints
 * Only accessible by administrators
 */

// GET /api/v1/security/events - Get security events
router.get('/events',
  authenticate,
  requireRole(['owner', 'manager']),
  (req, res) => {
    const { type, userId, ip, limit = 100 } = req.query;
    
    const filter: any = {};
    if (type) filter.type = type;
    if (userId) filter.userId = userId;
    if (ip) filter.ip = ip;
    
    const events = securityMonitor.getEvents(filter);
    const limitedEvents = events.slice(-Number(limit));
    
    res.json({
      events: limitedEvents,
      total: events.length,
    });
  }
);

// GET /api/v1/security/stats - Get security statistics
router.get('/stats',
  authenticate,
  requireRole(['owner', 'manager']),
  (req, res) => {
    const stats = securityMonitor.getStats();
    
    res.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  }
);

// POST /api/v1/security/test - Test security (development only)
router.post('/test',
  authenticate,
  requireRole(['owner']),
  (req, res) => {
    if (process.env['NODE_ENV'] === 'production') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Security testing disabled in production',
        }
      });
    }
    
    // Log a test security event
    securityMonitor.logEvent({
      type: 'suspicious_activity',
      ip: req.ip || 'unknown',
      userId: (req as any).user?.id,
      details: {
        test: true,
        message: 'Security monitoring test event',
      },
    });
    
    res.json({
      success: true,
      message: 'Test security event logged',
    });
  }
);

// GET /api/v1/security/config - Get security configuration
router.get('/config',
  authenticate,
  requireRole(['owner']),
  (_req, res) => {
    res.json({
      environment: process.env['NODE_ENV'],
      security: {
        csrf: true,
        rateLimit: true,
        helmet: true,
        cors: true,
        sessionTimeout: '8h',
        squareEnvironment: process.env['SQUARE_ENVIRONMENT'] || 'sandbox',
      },
      features: {
        suspiciousActivityDetection: true,
        securityEventLogging: true,
        requestSizeLimit: '10mb',
      },
    });
  }
);

export default router;