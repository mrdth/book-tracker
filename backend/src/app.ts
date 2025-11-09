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

  // API routes will be registered here
  // TODO: Register routes when they are created
  // app.use('/api/search', searchRoutes);
  // app.use('/api/books', booksRoutes);
  // app.use('/api/authors', authorsRoutes);
  // app.use('/api/ownership', ownershipRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  logger.info('Express app initialized');

  return app;
}
