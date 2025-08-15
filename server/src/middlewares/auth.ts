import { Request, Response, NextFunction } from 'express';
import config from '../config';

// Middleware to authenticate admin using 'Basic USER:PASS' from Authorization header
export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }
  const credentials = authHeader.replace('Basic ', '');

  if (
    credentials !== `${config.ADMIN_USER}:${config.ADMIN_PASSWORD}`
  ) {
    return res.status(403).json({ error: 'Invalid credentials' });
  }
  next();
}
