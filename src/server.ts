import app from './app';
import { config } from './config';
import logger from './utils/logger';
import prisma from './config/database';
import redis from './config/redis';

const PORT = config.port;

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Prism Backend Server started on port ${PORT}`);
  logger.info(`📦 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}/api/${config.apiVersion}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connections
      await prisma.$disconnect();
      logger.info('Database disconnected');

      // Close Redis connection
      await redis.quit();
      logger.info('Redis disconnected');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

export default server;
