import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';

const EMPLOYEE_ROLES = ['owner', 'admin', 'manager', 'server'];

export function resolveOrderMode(req: Request, _res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  const role = authReq.user?.role ?? 'anonymous';
  (authReq as any).orderMode = EMPLOYEE_ROLES.includes(role) ? 'employee' : 'customer';
  next();
}