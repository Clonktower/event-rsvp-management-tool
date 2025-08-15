import { Request, Response, NextFunction } from 'express';

export function requestInfoLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    let statusColor = '\x1b[32m'; // green for 2xx
    if (res.statusCode >= 400 && res.statusCode < 500) statusColor = '\x1b[33m'; // yellow for 4xx
    if (res.statusCode >= 500) statusColor = '\x1b[31m'; // red for 5xx
    const reset = '\x1b[0m';
    console.log(`[%s] %s %s%d%s - %dms`, req.method, req.originalUrl, statusColor, res.statusCode, reset, duration);
  });
  next();
}
