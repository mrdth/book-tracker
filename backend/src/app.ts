import express from 'express';
import cors from 'cors';
import { requestLogger } from './api/middleware/requestLogger.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import { logger } from './config/logger.js';

export function createApp(): express.Application {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  // Import routes dynamically to avoid circular dependencies
  import('./api/routes/search.js').then((module) => {
    app.use('/api/search', module.default);
    logger.info('Search routes registered');
  });

  import('./api/routes/books.js').then((module) => {
    app.use('/api/books', module.default);
    logger.info('Books routes registered');
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  logger.info('Express app initialized');

  return app;
}
