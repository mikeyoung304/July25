import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { BadRequest } from './errorHandler';

export function validateRequest(schema: Joi.Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      throw BadRequest(
        `Validation failed: ${errors.map(e => e.message).join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
}

export function validateQuery(schema: Joi.Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      throw BadRequest(
        `Invalid query parameters: ${errors.map(e => e.message).join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    req.query = value;
    next();
  };
}