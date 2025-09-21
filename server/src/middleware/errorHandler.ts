import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class ApiError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log error details
  logger.error({
    error: err.message,
    statusCode,
    code: err.code,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    restaurantId: req.headers['x-restaurant-id'],
  });

  // Don't leak error details in production for non-operational errors
  const message = 
    isOperational || process.env['NODE_ENV'] !== 'production'
      ? err.message
      : 'Internal server error';

  res.status(statusCode).json({
    error: {
      message,
      code: err.code,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });
}

// Common error creators
export const BadRequest = (message: string, code?: string) => 
  new ApiError(400, message, code);

export const Unauthorized = (message = 'Unauthorized', code?: string) => 
  new ApiError(401, message, code);

export const Forbidden = (message = 'Forbidden', code?: string) => 
  new ApiError(403, message, code);

export const NotFound = (message = 'Not found', code?: string) => 
  new ApiError(404, message, code);

export const Conflict = (message: string, code?: string) => 
  new ApiError(409, message, code);

export const UnprocessableEntity = (message: string, code?: string) => 
  new ApiError(422, message, code);

export const InternalError = (message = 'Internal server error', code?: string) => 
  new ApiError(500, message, code);