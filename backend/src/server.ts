/**
 * Server Entry Point
 *
 * Starts the Express server and background worker
 */

import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDatabase, disconnectDatabase } from './db';
import { disconnectRedis } from './redis';
import { startWorker, stopWorker } from './jobs/worker';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

let server: any;

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start Express server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API available at: http://localhost:${PORT}/api`);
    });

    // Start background worker
    startWorker();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Stop background worker
        stopWorker();

        // Disconnect from database
        await disconnectDatabase();

        // Disconnect from Redis
        await disconnectRedis();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  }

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();
