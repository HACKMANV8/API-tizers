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

/**
 * @route   POST /api/v1/platforms/openproject/work-packages/:workPackageId/add-to-tasks
 * @desc    Add a work package to tasks with optional due date override
 * @access  Private
 * @param   workPackageId: OpenProject work package ID
 * @body    dueDate (optional): ISO date string to override work package due date
 */
router.post(
  '/openproject/work-packages/:workPackageId/add-to-tasks',
  authenticate,
  [body('dueDate').optional().isISO8601()],
  validate,
  platformsController.addWorkPackageToTasks
);

export default router;
