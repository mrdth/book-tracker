import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { closeDatabase } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { ownershipScanner } from './services/OwnershipScanner.js';

async function startServer() {
  try {
    // Initialize database and run migrations
    logger.info('Initializing database and running migrations...');
    runMigrations(env.databasePath);
    logger.info('Database initialized successfully');

    // Initialize ownership scanner
    logger.info('Scanning filesystem for owned books...');
    try {
      const ownedBooks = await ownershipScanner.scan();
      logger.info('Ownership scan completed', { ownedBooksCount: ownedBooks.length });
    } catch (error) {
      logger.warn('Ownership scan failed, continuing without ownership detection', error);
    }

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
      // eslint-disable-next-line no-undef
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
