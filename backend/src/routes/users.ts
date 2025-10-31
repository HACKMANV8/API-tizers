/**
 * User Routes
 *
 * Handles user profile operations
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { authenticate } from '../auth/middleware';
import logger from '../utils/logger';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * GET /api/users/me
 * Get current user's profile
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accounts: true,
            projects: true,
            streaks: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * PUT /api/users/me
 * Update current user's profile
 */
router.put(
  '/me',
  [
    body('username').optional().isLength({ min: 3, max: 30 }).trim(),
    body('email').optional().isEmail().normalizeEmail(),
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

      const { username, email } = req.body;
      const updateData: { username?: string; email?: string } = {};

      if (username) updateData.username = username;
      if (email) updateData.email = email;

      // Check if no fields to update
      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No fields to update',
        });
        return;
      }

      // Check for conflicts
      if (username || email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: req.user.userId } },
              {
                OR: [
                  ...(username ? [{ username }] : []),
                  ...(email ? [{ email }] : []),
                ],
              },
            ],
          },
        });

        if (existingUser) {
          res.status(409).json({
            success: false,
            message: 'Username or email already exists',
          });
          return;
        }
      }

      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          updatedAt: true,
        },
      });

      logger.info(`User profile updated: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Update user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;
