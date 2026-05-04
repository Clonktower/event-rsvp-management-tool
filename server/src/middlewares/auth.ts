import { Request, Response, NextFunction } from 'express';
import config from '../config';

export function isAdminRequest(req: Request): boolean {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;
  return authHeader.replace('Basic ', '') === `${config.ADMIN_USER}:${config.ADMIN_PASSWORD}`;
}

export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }
  next();
}
