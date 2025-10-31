import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

// Log Prisma warnings
prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', e);
});

// Log Prisma errors
prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
});

export default prisma;
