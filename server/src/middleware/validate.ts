import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

export const validateBody = <T>(schema: ZodSchema<T>): RequestHandler =>
  (req, res, next): void => {
    const r = (schema as any).safeParse(req.body);
    if (!r.success) {
      res.status(400).json({ error: 'INVALID_REQUEST', details: r.error.flatten() });
      return;
    }
    if (/[a-z]+_[a-z]+/.test(JSON.stringify(req.body))) {
      res.status(400).json({ error: 'SNAKE_CASE_NOT_ALLOWED' });
      return;
    }
    (req as any).validated = r.data;
    next();
  };
