import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    // Expected application errors
    logger.warn(`Application error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      details: err.details,
    });

    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    });
  } else {
    // Unexpected errors
    logger.error('Unexpected error', err, {
      path: req.path,
      method: req.method,
      body: req.body,
    });

    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}

// Common error factory functions
export const errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError(400, 'BAD_REQUEST', message, details),

  notFound: (resource: string) =>
    new AppError(404, 'NOT_FOUND', `${resource} not found`),

  conflict: (message: string, details?: unknown) =>
    new AppError(409, 'CONFLICT', message, details),

  internalError: (message: string, details?: unknown) =>
    new AppError(500, 'INTERNAL_SERVER_ERROR', message, details),

  externalApiError: (message: string, details?: unknown) =>
    new AppError(502, 'EXTERNAL_API_ERROR', message, details),
};
