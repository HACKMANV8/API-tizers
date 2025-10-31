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
 * @body    username, accessToken (optional), platformUserId (optional), instanceUrl (required for OpenProject)
 */
router.post(
  '/connect/:platform',
  authenticate,
  [
    body('username').optional().isString(),
    body('accessToken').optional().isString(),
    body('platformUserId').optional().isString(),
    body('instanceUrl').optional().isString(),
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
 * @route   GET /api/v1/platforms/openproject/projects
 * @desc    Get all OpenProject projects
 * @access  Private
 */
router.get('/openproject/projects', authenticate, platformsController.getOpenProjectProjects);

/**
 * @route   GET /api/v1/platforms/openproject/projects/:projectId/work-packages
 * @desc    Get work packages for a specific OpenProject project
 * @access  Private
 * @param   projectId: OpenProject project ID or identifier
 */
router.get('/openproject/projects/:projectId/work-packages', authenticate, platformsController.getProjectWorkPackages);

export default router;
