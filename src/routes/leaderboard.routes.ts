import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const leaderboardController = new LeaderboardController();

/**
 * @route   GET /api/v1/leaderboard
 * @desc    Get leaderboard rankings
 * @access  Private
 * @query   period: DAILY | WEEKLY | MONTHLY | ALL_TIME (default: ALL_TIME)
 * @query   limit: number (default: 100, max: 500)
 */
router.get('/', authenticate, leaderboardController.getLeaderboard);

/**
 * @route   GET /api/v1/leaderboard/user/:userId
 * @desc    Get specific user's rank and stats
 * @access  Private
 * @query   period: DAILY | WEEKLY | MONTHLY | ALL_TIME (default: ALL_TIME)
 */
router.get('/user/:userId', authenticate, leaderboardController.getUserRank);

/**
 * @route   POST /api/v1/leaderboard/refresh
 * @desc    Manually refresh leaderboard calculations
 * @access  Private (should be admin only in production)
 * @body    period: DAILY | WEEKLY | MONTHLY | ALL_TIME
 */
router.post('/refresh', authenticate, leaderboardController.refreshLeaderboard);

export default router;
