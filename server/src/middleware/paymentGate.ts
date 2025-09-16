import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { SquareAdapter } from '../payments/square.adapter';

const squareAdapter = new SquareAdapter();

export async function requirePaymentIfCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    // Calculate order total from items
    const items = req.body.items || [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const itemTotal = item.price * item.quantity;
      const modifiersTotal = (item.modifiers || []).reduce(
        (mSum: number, mod: any) => mSum + (mod.price || 0),
        0
      );
      return sum + itemTotal + modifiersTotal;
    }, 0);

    const tax = req.body.tax || 0;
    const tip = req.body.tip || 0;
    const totalCents = Math.round((subtotal + tax + tip) * 100);

    // Validate payment token
    const restaurantId = (req as any).restaurantId;
    const isValid = await squareAdapter.validateToken(
      paymentToken,
      restaurantId,
      totalCents
    );

    if (!isValid) {
      logger.warn('Customer order rejected - invalid payment token', {
        path: req.path,
        paymentToken,
        restaurantId,
        totalCents
      });
      return res.status(402).json({
        error: 'INVALID_PAYMENT_TOKEN',
        message: 'Payment token is invalid, already used, or amount mismatch'
      });
    }

    // Store token for consumption after successful order creation
    (req as any).paymentToken = paymentToken;

    logger.debug('Customer order with valid payment token', {
      path: req.path,
      restaurantId,
      totalCents
    });
  }

  return next();
}