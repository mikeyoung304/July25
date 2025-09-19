import type { NextFunction, Request, Response } from 'express'

const isWrite = (m?: string) => !!m && /^(POST|PUT|PATCH|DELETE)$/i.test(m)

export function strictAuth(req: Request, res: Response, next: NextFunction) {
  if (!isWrite(req.method)) return next()
  const auth = req.header('authorization') || ''
  const hasBearer = auth.startsWith('Bearer ')
  const tenant = req.header('x-restaurant-id')
  if (!hasBearer || !tenant) {
    return res.status(401).json({ error: 'Missing auth headers' })
  }
  const reqTenant = req.user?.restaurantId
  if (reqTenant && reqTenant !== tenant) {
    return res.status(403).json({ error: 'Tenant mismatch' })
  }
  return next()
}

export function strictAuthForWrites(options?: { skip?: (req: Request) => boolean }) {
  const skip = options?.skip ?? (() => false)
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isWrite(req.method) || skip(req)) return next()
    return strictAuth(req, res, next)
  }
}
