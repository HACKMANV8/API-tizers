import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

/**
 * @route   GET /api/v1/users/activity
 * @desc    Get user's recent activity feed
 * @access  Private
 * @query   limit: number (default: 20)
 */
router.get('/activity', authenticate, userController.getActivity);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user's overall stats (level, XP, rank, badge)
 * @access  Private
 */
router.get('/stats', authenticate, userController.getStats);

/**
 * @route   GET /api/v1/users/platforms
 * @desc    Get user's connected platforms status
 * @access  Private
 */
router.get('/platforms', authenticate, userController.getPlatforms);

export default router;
