import type { Request, Response, NextFunction } from 'express';

function parseCsv(name: string): string[] {
  return (process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

const allowedOrigins = new Set(parseCsv('CSRF_ORIGINS'));

export function originGuard(req: Request, res: Response, next: NextFunction) {
  if (/^(GET|OPTIONS)$/i.test(req.method)) {
    return next();
  }

  const origin = req.headers['origin'];

  if (!origin || allowedOrigins.size === 0) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  if (!allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  return next();
}
