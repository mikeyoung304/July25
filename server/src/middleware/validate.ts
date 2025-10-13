import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

export const validateBody = <T>(schema: ZodSchema<T>): RequestHandler =>
  (req, res, next): void => {
    const r = (schema as any).safeParse(req.body);
    if (!r.success) {
      res.status(400).json({ error: 'INVALID_REQUEST', details: r.error.flatten() });
      return;
    }
    // Snake_case validation removed - adopting full snake_case convention (ADR-001)
    // Database uses snake_case, service layer uses snake_case, API now uses snake_case
    (req as any).validated = r.data;
    next();
  };
