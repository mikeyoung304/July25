import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requirePaymentIfCustomer(req: Request, res: Response, next: NextFunction) {
  const mode = (req as any).orderMode;

  // Employee orders bypass payment requirement
  if (mode === 'employee') {
    logger.debug('Employee order - bypassing payment requirement', {
      path: req.path,
      method: req.method,
      user: (req as any).user?.id
    });
    return next();
  }

  // Customer orders must have payment token
  if (mode === 'customer') {
    const paymentToken =
      (req.body && (req.body.payment_token || req.body.paymentToken)) ||
      (req.headers['x-payment-token'] as string) ||
      null;

    if (!paymentToken) {
      logger.warn('Customer order rejected - no payment token', {
        path: req.path,
        method: req.method,
        user: (req as any).user?.id,
        restaurantId: (req as any).restaurantId
      });
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: 'Payment token is required for customer orders'
      });
    }

    // TODO: Validate payment token with payment provider
    // For now, just check it exists
    logger.debug('Customer order with payment token', {
      path: req.path,
      hasToken: true
    });
  }

  return next();
}