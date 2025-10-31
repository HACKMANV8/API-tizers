/**
 * Database Connection Module
 *
 * Manages Prisma Client singleton instance for database operations
 */

import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';

// Global Prisma instance to prevent multiple connections in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Test database connection
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✓ Database connected successfully');
  } catch (error) {
    logger.error('✗ Database connection failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('✓ Database disconnected successfully');
  } catch (error) {
    logger.error('✗ Database disconnection failed:', error);
  }
}

export default prisma;
