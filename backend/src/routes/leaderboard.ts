/**
 * Leaderboard Routes
 *
 * Handles leaderboard retrieval and computation
 */

import { Router, Request, Response } from 'express';
import prisma from '../db';
import redis, { CACHE_KEYS } from '../redis';
import { validateAdminKey } from '../auth/middleware';
import logger from '../utils/logger';
import {
  aggregateScores,
  rankUsers,
  extractMetricValue,
  normalizeMetric,
  PLATFORM_MAX_VALUES,
} from '../utils/scoring';
import { Platform } from '@prisma/client';

const router = Router();

const LEADERBOARD_CACHE_TTL = parseInt(process.env.LEADERBOARD_CACHE_TTL || '300');
const DEFAULT_LIMIT = parseInt(process.env.LEADERBOARD_DEFAULT_LIMIT || '50');

/**
 * GET /api/leaderboard
 * Get paginated leaderboard
 *
 * Query params:
 *   - limit: Number of results (default: 50, max: 100)
 *   - offset: Pagination offset (default: 0)
 *   - platform: Filter by platform (optional)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const platform = req.query.platform as Platform | undefined;

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.leaderboard(platform);
    const cached = await redis.get(cacheKey);

    if (cached) {
      const leaderboard = JSON.parse(cached);
      const paginated = leaderboard.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          leaderboard: paginated,
          total: leaderboard.length,
          limit,
          offset,
          cached: true,
        },
      });
      return;
    }

    // If not cached, get from database
    const where = platform ? { platform } : {};

    const leaderboardData = await prisma.leaderboardCache.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { rank: 'asc' },
      skip: offset,
      take: limit,
    });

    const total = await prisma.leaderboardCache.count({ where });

    res.json({
      success: true,
      data: {
        leaderboard: leaderboardData,
        total,
        limit,
        offset,
        cached: false,
      },
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/leaderboard/compute
 * Compute and cache leaderboard rankings
 * Protected with admin API key
 *
 * This endpoint:
 * 1. Fetches latest snapshots for all users
 * 2. Computes normalized scores using metricScore or fallback metrics
 * 3. Ranks users deterministically
 * 4. Updates LeaderboardCache table
 * 5. Caches results in Redis
 *
 * TODO: Add platform-specific computation logic
 * TODO: Consider time-weighted scoring (recent activity counts more)
 * TODO: Handle edge cases (users with no snapshots, tied scores)
 */
router.post('/compute', validateAdminKey, async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Starting leaderboard computation...');

    // Get all users with their latest snapshots per platform
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          include: {
            snapshots: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    // Compute scores for each user
    interface UserScore {
      userId: string;
      username: string;
      platform: Platform | null;
      score: number;
      snapshotCount: number;
    }

    const globalScores: Map<string, UserScore> = new Map();
    const platformScores: Map<string, Map<string, UserScore>> = new Map();

    for (const user of users) {
      let totalScore = 0;
      let snapshotCount = 0;

      for (const account of user.accounts) {
        const latestSnapshot = account.snapshots[0];
        if (!latestSnapshot) continue;

        snapshotCount++;
        let score = 0;

        // Use metricScore if available, otherwise extract from metrics
        if (latestSnapshot.metricScore !== null) {
          score = latestSnapshot.metricScore;
        } else {
          const metricValue = extractMetricValue(latestSnapshot.metrics);
          if (metricValue !== null) {
            const maxValue = PLATFORM_MAX_VALUES[account.platform] || 1000;
            score = normalizeMetric(metricValue, 0, maxValue);
          }
        }

        totalScore += score;

        // Track platform-specific scores
        if (!platformScores.has(account.platform)) {
          platformScores.set(account.platform, new Map());
        }
        const platformMap = platformScores.get(account.platform)!;
        platformMap.set(user.id, {
          userId: user.id,
          username: user.username,
          platform: account.platform,
          score,
          snapshotCount: 1,
        });
      }

      if (snapshotCount > 0) {
        globalScores.set(user.id, {
          userId: user.id,
          username: user.username,
          platform: null,
          score: totalScore / snapshotCount, // Average score across platforms
          snapshotCount,
        });
      }
    }

    // Rank global leaderboard
    const globalRanked = rankUsers(Array.from(globalScores.values()));

    // Rank platform-specific leaderboards
    const platformRanked: Map<string, Array<UserScore & { rank: number }>> = new Map();
    for (const [platform, scores] of platformScores.entries()) {
      platformRanked.set(platform, rankUsers(Array.from(scores.values())));
    }

    // Clear existing cache
    await prisma.leaderboardCache.deleteMany({});

    // Store in database
    const cacheEntries = [];

    // Global leaderboard
    for (const entry of globalRanked) {
      cacheEntries.push({
        userId: entry.userId,
        platform: null,
        rank: entry.rank,
        score: entry.score,
        computedAt: new Date(),
      });
    }

    // Platform-specific leaderboards
    for (const [platform, ranked] of platformRanked.entries()) {
      for (const entry of ranked) {
        cacheEntries.push({
          userId: entry.userId,
          platform: platform as Platform,
          rank: entry.rank,
          score: entry.score,
          computedAt: new Date(),
        });
      }
    }

    await prisma.leaderboardCache.createMany({
      data: cacheEntries,
    });

    // Cache in Redis
    await redis.setex(
      CACHE_KEYS.leaderboard(),
      LEADERBOARD_CACHE_TTL,
      JSON.stringify(globalRanked)
    );

    for (const [platform, ranked] of platformRanked.entries()) {
      await redis.setex(
        CACHE_KEYS.leaderboard(platform),
        LEADERBOARD_CACHE_TTL,
        JSON.stringify(ranked)
      );
    }

    logger.info(
      `Leaderboard computed: ${globalRanked.length} users, ${platformRanked.size} platforms`
    );

    res.json({
      success: true,
      message: 'Leaderboard computed successfully',
      data: {
        totalUsers: globalRanked.length,
        platforms: Array.from(platformRanked.keys()),
        computedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Compute leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
