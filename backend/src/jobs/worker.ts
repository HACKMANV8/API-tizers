/**
 * Background Worker
 *
 * Runs periodic tasks like leaderboard computation and platform syncing
 */

import prisma from '../db';
import redis, { CACHE_KEYS } from '../redis';
import logger from '../utils/logger';
import {
  rankUsers,
  extractMetricValue,
  normalizeMetric,
  PLATFORM_MAX_VALUES,
} from '../utils/scoring';
import { Platform } from '@prisma/client';

const WORKER_INTERVAL_MS = parseInt(process.env.WORKER_INTERVAL_MS || '300000'); // 5 minutes default
const WORKER_ENABLED = process.env.WORKER_ENABLED !== 'false';

let workerInterval: NodeJS.Timeout | null = null;

/**
 * Compute and cache leaderboard rankings
 * This is the same logic as the POST /api/leaderboard/compute endpoint
 */
export async function computeLeaderboardCache(): Promise<void> {
  try {
    logger.info('Computing leaderboard cache...');

    // Get all users with their latest snapshots
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

    interface UserScore {
      userId: string;
      username: string;
      platform: Platform | null;
      score: number;
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
        platformScores.get(account.platform)!.set(user.id, {
          userId: user.id,
          username: user.username,
          platform: account.platform,
          score,
        });
      }

      if (snapshotCount > 0) {
        globalScores.set(user.id, {
          userId: user.id,
          username: user.username,
          platform: null,
          score: totalScore / snapshotCount,
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

    // Clear and update database cache
    await prisma.leaderboardCache.deleteMany({});

    const cacheEntries = [];
    for (const entry of globalRanked) {
      cacheEntries.push({
        userId: entry.userId,
        platform: null,
        rank: entry.rank,
        score: entry.score,
        computedAt: new Date(),
      });
    }

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

    if (cacheEntries.length > 0) {
      await prisma.leaderboardCache.createMany({ data: cacheEntries });
    }

    // Update Redis cache
    const cacheTTL = parseInt(process.env.LEADERBOARD_CACHE_TTL || '300');
    await redis.setex(
      CACHE_KEYS.leaderboard(),
      cacheTTL,
      JSON.stringify(globalRanked)
    );

    for (const [platform, ranked] of platformRanked.entries()) {
      await redis.setex(
        CACHE_KEYS.leaderboard(platform),
        cacheTTL,
        JSON.stringify(ranked)
      );
    }

    logger.info(
      `Leaderboard cache updated: ${globalRanked.length} users, ${platformRanked.size} platforms`
    );
  } catch (error) {
    logger.error('Leaderboard cache computation error:', error);
  }
}

/**
 * Fetch LeetCode snapshot for a user account
 * This is a PLACEHOLDER implementation
 *
 * TODO: Replace with actual LeetCode API/scraping logic
 * TODO: Implement rate limiting (e.g., 1 request per second)
 * TODO: Handle authentication if required
 * TODO: Parse response and extract metrics (problems solved, rating, etc.)
 * TODO: Store snapshot in database
 *
 * Example real implementation:
 *   - Use LeetCode GraphQL API: https://leetcode.com/graphql
 *   - Query: userPublicProfile(username: "...")
 *   - Extract: problemsSolved, ranking, reputation, etc.
 *   - Create PlatformSnapshot with metrics
 */
export async function fetchLeetCodeSnapshot(userAccountId: string): Promise<void> {
  try {
    logger.info(`Fetching LeetCode snapshot for account ${userAccountId}...`);

    // TODO: Get account details
    // const account = await prisma.userAccount.findUnique({
    //   where: { id: userAccountId }
    // });

    // TODO: Call LeetCode API
    // const response = await fetch('https://leetcode.com/graphql', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     query: `query getUserProfile($username: String!) {
    //       matchedUser(username: $username) {
    //         profile { ranking reputation }
    //         submitStats { acSubmissionNum { difficulty count } }
    //       }
    //     }`,
    //     variables: { username: account.accountId }
    //   })
    // });

    // TODO: Parse and store snapshot
    // const data = await response.json();
    // await prisma.platformSnapshot.create({
    //   data: {
    //     userAccountId,
    //     metrics: data,
    //     metricScore: normalizeMetric(data.ranking, 0, 500000),
    //     recordedAt: new Date()
    //   }
    // });

    logger.info('LeetCode snapshot fetch: NOT IMPLEMENTED (placeholder)');
  } catch (error) {
    logger.error('LeetCode snapshot fetch error:', error);
  }
}

/**
 * Sync all platform accounts
 * Iterates through all user accounts and fetches latest data
 *
 * TODO: Implement for each platform (LeetCode, Codeforces, etc.)
 * TODO: Add intelligent scheduling (don't sync too frequently)
 * TODO: Respect rate limits for each platform
 * TODO: Add exponential backoff for failed syncs
 */
export async function syncAllPlatforms(): Promise<void> {
  try {
    logger.info('Syncing all platforms...');

    const accounts = await prisma.userAccount.findMany({
      where: {
        // Only sync accounts that haven't been updated recently
        updatedAt: {
          lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
      take: 50, // Limit to prevent overwhelming APIs
    });

    logger.info(`Found ${accounts.length} accounts to sync`);

    for (const account of accounts) {
      // TODO: Dispatch to platform-specific sync function
      switch (account.platform) {
        case 'LEETCODE':
          await fetchLeetCodeSnapshot(account.id);
          break;
        // TODO: Add other platforms
        // case 'CODEFORCES':
        //   await fetchCodeforcesSnapshot(account.id);
        //   break;
        default:
          logger.warn(`Sync not implemented for platform: ${account.platform}`);
      }

      // Rate limiting: wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info('Platform sync completed');
  } catch (error) {
    logger.error('Platform sync error:', error);
  }
}

/**
 * Main worker loop
 * Executes periodic tasks at configured interval
 */
async function workerLoop(): Promise<void> {
  logger.info('Worker loop executing...');

  try {
    // Task 1: Compute leaderboard
    await computeLeaderboardCache();

    // Task 2: Sync platforms (commented out by default - enable when scrapers are ready)
    // await syncAllPlatforms();

    logger.info('Worker loop completed successfully');
  } catch (error) {
    logger.error('Worker loop error:', error);
  }
}

/**
 * Start the background worker
 */
export function startWorker(): void {
  if (!WORKER_ENABLED) {
    logger.info('Background worker is disabled');
    return;
  }

  logger.info(`Starting background worker (interval: ${WORKER_INTERVAL_MS}ms)`);

  // Run immediately on startup
  workerLoop();

  // Schedule periodic execution
  workerInterval = setInterval(workerLoop, WORKER_INTERVAL_MS);

  logger.info('Background worker started');
}

/**
 * Stop the background worker (for graceful shutdown)
 */
export function stopWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    logger.info('Background worker stopped');
  }
}
