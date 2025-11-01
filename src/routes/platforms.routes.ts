import { Router } from 'express';
import { PlatformsController } from '../controllers/platforms.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';

const router = Router();
const platformsController = new PlatformsController();

/**
 * @route   POST /api/v1/platforms/connect/:platform
 * @desc    Connect a platform account
 * @access  Private
 * @param   platform: GITHUB | LEETCODE | CODEFORCES | GOOGLE_CALENDAR | MS_CALENDAR | OPENPROJECT | SLACK
 * @body    username, accessToken (optional), platformUserId (optional)
 */
router.post(
  '/connect/:platform',
  authenticate,
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('accessToken').optional().isString(),
    body('platformUserId').optional().isString(),
  ],
  validate,
  platformsController.connectPlatform
);

/**
 * @route   DELETE /api/v1/platforms/disconnect/:platform
 * @desc    Disconnect a platform account
 * @access  Private
 * @param   platform: GITHUB | LEETCODE | etc.
 */
router.delete('/disconnect/:platform', authenticate, platformsController.disconnectPlatform);

/**
 * @route   PUT /api/v1/platforms/sync/:platform
 * @desc    Manually trigger sync for a specific platform
 * @access  Private
 * @param   platform: GITHUB | LEETCODE | etc.
 */
router.put('/sync/:platform', authenticate, platformsController.syncPlatform);

/**
 * @route   GET /api/v1/platforms/:platform/status
 * @desc    Get detailed status of a specific platform connection
 * @access  Private
 * @param   platform: GITHUB | LEETCODE | etc.
 */
router.get('/:platform/status', authenticate, platformsController.getPlatformStatus);

/**
 * @route   GET /api/v1/platforms/github/repos/:connectionId
 * @desc    Get GitHub repositories for a connected account
 * @access  Private
 * @param   connectionId: Platform connection ID
 */
router.get('/github/repos/:connectionId', authenticate, platformsController.getGitHubRepositories);

/**
 * @route   GET /api/v1/platforms/github/commits/:connectionId
 * @desc    Get commits for a specific GitHub repository
 * @access  Private
 * @param   connectionId: Platform connection ID
 * @query   repo: Repository full name (owner/repo), since: ISO date, until: ISO date
 */
router.get('/github/commits/:connectionId', authenticate, platformsController.getGitHubCommits);

/**
 * @route   GET /api/v1/platforms/codeforces/stats/:connectionId
 * @desc    Get Codeforces stats for a connected account
 * @access  Private
 * @param   connectionId: Platform connection ID
 */
router.get('/codeforces/stats/:connectionId', authenticate, platformsController.getCodeforcesStats);

/**
 * @route   GET /api/v1/platforms/codeforces/submissions/:connectionId
 * @desc    Get recent submissions for a Codeforces account
 * @access  Private
 * @param   connectionId: Platform connection ID
 * @query   count: Number of submissions to fetch (optional, default 100)
 */
router.get('/codeforces/submissions/:connectionId', authenticate, platformsController.getCodeforcesSubmissions);

/**
 * @route   GET /api/v1/platforms/leetcode/stats/:connectionId
 * @desc    Get LeetCode stats for a connected account
 * @access  Private
 * @param   connectionId: Platform connection ID
 */
router.get('/leetcode/stats/:connectionId', authenticate, platformsController.getLeetCodeStats);

/**
 * @route   GET /api/v1/platforms/leetcode/submissions/:connectionId
 * @desc    Get recent submissions for a LeetCode account
 * @access  Private
 * @param   connectionId: Platform connection ID
 * @query   limit: Number of submissions to fetch (optional, default 15)
 */
router.get('/leetcode/submissions/:connectionId', authenticate, platformsController.getLeetCodeSubmissions);

export default router;
