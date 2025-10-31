/**
 * Streak Routes
 *
 * Handles user activity streaks and calendar-style data
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { authenticate } from '../auth/middleware';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/streaks
 * Record a new activity for the current user
 *
 * TODO: Add automatic streak detection from platform activities
 * TODO: Add streak milestones and notifications (7 days, 30 days, etc.)
 */
router.post(
  '/',
  [
    body('activityType').notEmpty().trim(),
    body('date').optional().isISO8601(),
    body('metadata').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { activityType, date, metadata } = req.body;
      const activityDate = date ? new Date(date) : new Date();

      // Check if streak already exists for this date and type
      const existing = await prisma.streak.findUnique({
        where: {
          userId_date_activityType: {
            userId: req.user.userId,
            date: activityDate,
            activityType,
          },
        },
      });

      if (existing) {
        res.status(409).json({
          success: false,
          message: 'Activity already recorded for this date',
        });
        return;
      }

      const streak = await prisma.streak.create({
        data: {
          userId: req.user.userId,
          date: activityDate,
          activityType,
          metadata: metadata || {},
        },
      });

      logger.info(`Streak recorded: ${activityType} for ${req.user.email}`);
      res.status(201).json({ success: true, data: { streak } });
    } catch (error) {
      logger.error('Create streak error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * GET /api/streaks/:userId
 * Get calendar-style streak data for a user
 *
 * Query params:
 *   - startDate: ISO 8601 date string (default: 30 days ago)
 *   - endDate: ISO 8601 date string (default: today)
 *   - activityType: Filter by activity type (optional)
 */
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, activityType } = req.query;

    // Default to last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    };

    if (activityType) {
      where.activityType = activityType;
    }

    const streaks = await prisma.streak.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Calculate current streak
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const streak of streaks) {
      const streakDate = new Date(streak.date);
      streakDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        tempStreak = 1;
      } else {
        const dayDiff = (streakDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }

      maxStreak = Math.max(maxStreak, tempStreak);
      lastDate = streakDate;

      // Check if streak continues to today
      if (lastDate.getTime() === today.getTime()) {
        currentStreak = tempStreak;
      }
    }

    res.json({
      success: true,
      data: {
        streaks,
        stats: {
          totalActivities: streaks.length,
          currentStreak,
          maxStreak,
          dateRange: { start, end },
        },
      },
    });
  } catch (error) {
    logger.error('Get streaks error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/streaks/me/summary
 * Get streak summary for the current user
 */
router.get('/me/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalStreaks, recentStreaks, activityTypes] = await Promise.all([
      prisma.streak.count({ where: { userId: req.user.userId } }),
      prisma.streak.count({
        where: {
          userId: req.user.userId,
          date: { gte: thirtyDaysAgo },
        },
      }),
      prisma.streak.groupBy({
        by: ['activityType'],
        where: { userId: req.user.userId },
        _count: { activityType: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalStreaks,
        recentStreaks,
        activityTypes,
      },
    });
  } catch (error) {
    logger.error('Get streak summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
