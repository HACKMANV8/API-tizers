/**
 * Redis Client Module
 *
 * Manages Redis connection for caching leaderboard and other data
 */

import Redis from 'ioredis';
import logger from './utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  logger.info('✓ Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('✗ Redis connection error:', error);
});

redis.on('ready', () => {
  logger.info('✓ Redis is ready to accept commands');
});

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('✓ Redis disconnected successfully');
  } catch (error) {
    logger.error('✗ Redis disconnection failed:', error);
  }
}

// Leaderboard cache key helpers
export const CACHE_KEYS = {
  leaderboard: (platform?: string) =>
    platform ? `leaderboard:${platform}` : 'leaderboard:global',
  userSnapshot: (userId: string) => `snapshot:${userId}`,
};

export default redis;
