import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

export const validateBody = <T>(schema: ZodSchema<T>): RequestHandler =>
  (req, res, next) => {
    const r = (schema as any).safeParse(req.body);
    if (!r.success) return res.status(400).json({ error: 'INVALID_REQUEST', details: r.error.flatten() });
    if (/[a-z]+_[a-z]+/.test(JSON.stringify(req.body)))
      return res.status(400).json({ error: 'SNAKE_CASE_NOT_ALLOWED' });
    (req as any).validated = r.data;
    next();
  };
