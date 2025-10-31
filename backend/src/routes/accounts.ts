/**
 * User Account Routes
 *
 * Handles linking external platform accounts to users
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { authenticate } from '../auth/middleware';
import logger from '../utils/logger';

const router = Router();

// All account routes require authentication
router.use(authenticate);

/**
 * POST /api/accounts
 * Link a new platform account to the current user
 *
 * TODO: In production, this should initiate OAuth flow for platforms that support it
 * TODO: Store access tokens securely in the config field
 * TODO: Validate platform-specific credentials before creating account
 */
router.post(
  '/',
  [
    body('platform').isIn(['LEETCODE', 'CODEFORCES', 'CODECHEF', 'ATCODER', 'GITHUB']),
    body('accountId').notEmpty().trim(),
    body('config').optional().isObject(),
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

      const { platform, accountId, config } = req.body;

      // Check if account already linked
      const existingAccount = await prisma.userAccount.findUnique({
        where: {
          userId_platform: {
            userId: req.user.userId,
            platform,
          },
        },
      });

      if (existingAccount) {
        res.status(409).json({
          success: false,
          message: 'Account already linked for this platform',
        });
        return;
      }

      // Create account link
      const account = await prisma.userAccount.create({
        data: {
          userId: req.user.userId,
          platform,
          accountId,
          config: config || {},
        },
      });

      logger.info(`Account linked: ${req.user.email} -> ${platform}:${accountId}`);

      res.status(201).json({
        success: true,
        message: 'Account linked successfully',
        data: { account },
      });
    } catch (error) {
      logger.error('Link account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/accounts
 * Get all linked accounts for the current user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const accounts = await prisma.userAccount.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        platform: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            snapshots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { accounts },
    });
  } catch (error) {
    logger.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/accounts/:accountId
 * Unlink a platform account
 */
router.delete('/:accountId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { accountId } = req.params;

    // Verify account belongs to user
    const account = await prisma.userAccount.findFirst({
      where: {
        id: accountId,
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

    await prisma.userAccount.delete({
      where: { id: accountId },
    });

    logger.info(`Account unlinked: ${req.user.email} -> ${account.platform}`);

    res.json({
      success: true,
      message: 'Account unlinked successfully',
    });
  } catch (error) {
    logger.error('Unlink account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
