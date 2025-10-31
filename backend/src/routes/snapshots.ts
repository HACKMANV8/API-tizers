/**
 * Platform Snapshot Routes
 *
 * Handles ingestion and retrieval of platform metric snapshots
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { authenticate } from '../auth/middleware';
import logger from '../utils/logger';
import { normalizeMetric } from '../utils/scoring';

const router = Router();

// All snapshot routes require authentication
router.use(authenticate);

/**
 * POST /api/snapshots
 * Ingest a new platform snapshot for a user account
 *
 * TODO: In production, this endpoint would be called by background scrapers
 * TODO: Implement rate limiting to prevent abuse
 * TODO: Add webhook notifications for significant metric changes
 */
router.post(
  '/',
  [
    body('userAccountId').isUUID(),
    body('metrics').isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { userAccountId, metrics } = req.body;

      // Verify account belongs to user
      const account = await prisma.userAccount.findFirst({
        where: {
          id: userAccountId,
          userId: req.user.userId,
        },
      });

      if (!account) {
        res.status(404).json({
          success: false,
          message: 'Account not found',
        });
        return;
      }

      // Calculate normalized score if metrics contain a scorable value
      // TODO: Implement platform-specific normalization logic
      let metricScore: number | null = null;
      if (metrics.score !== undefined) {
        metricScore = normalizeMetric(metrics.score, 0, 3000); // Example: LeetCode max ~3000
      } else if (metrics.problemsSolved !== undefined) {
        metricScore = normalizeMetric(metrics.problemsSolved, 0, 2000);
      }

      const snapshot = await prisma.platformSnapshot.create({
        data: {
          userAccountId,
          metrics,
          metricScore,
          recordedAt: new Date(),
        },
      });

      logger.info(`Snapshot created: ${account.platform} for user ${req.user.userId}`);

      res.status(201).json({
        success: true,
        message: 'Snapshot created successfully',
        data: { snapshot },
      });
    } catch (error) {
      logger.error('Create snapshot error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/snapshots/:userId
 * Get all snapshots for a specific user
 *
 * Query params:
 *   - platform (optional): Filter by platform
 *   - limit (optional): Limit number of results (default: 50)
 */
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { platform, limit = '50' } = req.query;

    // Build filter
    const where: any = {
      userAccount: {
        userId,
      },
    };

    if (platform && typeof platform === 'string') {
      where.userAccount.platform = platform;
    }

    const snapshots = await prisma.platformSnapshot.findMany({
      where,
      include: {
        userAccount: {
          select: {
            platform: true,
            accountId: true,
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: Math.min(parseInt(limit as string), 100),
    });

    res.json({
      success: true,
      data: {
        snapshots,
        count: snapshots.length,
      },
    });
  } catch (error) {
    logger.error('Get snapshots error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/snapshots/account/:accountId/latest
 * Get the latest snapshot for a specific account
 */
router.get('/account/:accountId/latest', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params;

    const snapshot = await prisma.platformSnapshot.findFirst({
      where: { userAccountId: accountId },
      orderBy: { recordedAt: 'desc' },
      include: {
        userAccount: {
          select: {
            platform: true,
            accountId: true,
          },
        },
      },
    });

    if (!snapshot) {
      res.status(404).json({
        success: false,
        message: 'No snapshots found for this account',
      });
      return;
    }

    res.json({
      success: true,
      data: { snapshot },
    });
  } catch (error) {
    logger.error('Get latest snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
