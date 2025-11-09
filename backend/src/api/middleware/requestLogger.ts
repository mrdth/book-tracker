import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log incoming request
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    const logMessage = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;

    if (level === 'warn') {
      logger.warn(logMessage, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    } else {
      logger.info(logMessage, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    }
  });

  next();
}
