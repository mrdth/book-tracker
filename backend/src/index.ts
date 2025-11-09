import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initializeDatabase, closeDatabase } from './db/connection.js';

async function startServer() {
  try {
    // Initialize database
    logger.info('Initializing database...');
    initializeDatabase(env.databasePath);
    logger.info('Database initialized successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(env.port, () => {
      logger.info(`Server started successfully`, {
        port: env.port,
        environment: env.nodeEnv,
        databasePath: env.databasePath,
      });
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      server.close(() => {
        logger.info('HTTP server closed');
        closeDatabase();
        logger.info('Database connection closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
