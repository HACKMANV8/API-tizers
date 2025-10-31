import { Request, Response } from 'express';
import { BaseController } from '../utils/base-controller';
import prisma from '../config/database';
import { ResponseHandler } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth.middleware';
import { GoogleCalendarIntegration } from '../integrations/google-calendar.integration';
import { OpenProjectIntegration } from '../integrations/openproject.integration';
import { encryptionService } from '../auth/encryption.service';
import logger from '../utils/logger';

export class PlatformsController extends BaseController {
  private googleCalendarIntegration: GoogleCalendarIntegration;
  private openProjectIntegration: OpenProjectIntegration;
  private logger = logger;

  constructor() {
    super();
    this.googleCalendarIntegration = new GoogleCalendarIntegration(prisma);
    this.openProjectIntegration = new OpenProjectIntegration(prisma);
  }

  /**
   * POST /api/v1/platforms/connect/:platform
   * Connect a platform account
   */
  connectPlatform = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { platform } = req.params;
    const { username, accessToken, platformUserId, instanceUrl } = req.body;

    // Validate platform
    const validPlatforms = [
      'GITHUB',
      'LEETCODE',
      'CODEFORCES',
      'GOOGLE_CALENDAR',
      'MS_CALENDAR',
      'OPENPROJECT',
      'SLACK',
    ];

    if (!validPlatforms.includes(platform.toUpperCase())) {
      throw new BadRequestError(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
    }

    // Check if THIS specific account is already connected
    // Allow multiple accounts per platform, but not the same account twice
    const existing = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: platform.toUpperCase() as any,
        platformUsername: username,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestError(`Account @${username} is already connected to this platform.`);
    }

    // Handle OpenProject-specific connection
    if (platform.toUpperCase() === 'OPENPROJECT') {
      if (!instanceUrl || !accessToken) {
        throw new BadRequestError('OpenProject requires both instanceUrl and accessToken (PAT)');
      }

      // Validate instanceUrl format
      try {
        const url = new URL(instanceUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error('Invalid protocol');
        }
      } catch (error) {
        throw new BadRequestError('Invalid OpenProject instance URL. Must be a valid HTTP(S) URL.');
      }

      // Normalize instanceUrl (remove trailing slash for consistency)
      const normalizedInstanceUrl = instanceUrl.replace(/\/$/, '');

      // Encrypt the access token
      const encryptedToken = encryptionService.encrypt(accessToken);

      // Create the connection first
      const connection = await prisma.platformConnection.create({
        data: {
          userId,
          platform: 'OPENPROJECT',
          platformUserId: '',
          platformUsername: '',
          accessToken: encryptedToken,
          isActive: true,
          syncStatus: 'PENDING',
          metadata: {
            instanceUrl: normalizedInstanceUrl,
          },
        },
      });

      // Verify the connection by fetching user data
      try {
        const userData = await this.openProjectIntegration.fetchUserData(connection.id);
        const fetchedUsername = userData.login || userData.email;

        // Check if there's an existing connection (active or inactive) with the same username
        // This could be a previous connection that was disconnected
        const existingConnection = await prisma.platformConnection.findFirst({
          where: {
            userId,
            platform: 'OPENPROJECT',
            platformUsername: fetchedUsername,
            id: { not: connection.id }, // Exclude the current connection
          },
        });

        // If there's an existing connection, delete it to avoid unique constraint violation
        if (existingConnection) {
          this.logger.info('[PlatformsController] Removing old OpenProject connection:', {
            oldConnectionId: existingConnection.id,
            username: fetchedUsername,
          });
          await prisma.platformConnection.delete({
            where: { id: existingConnection.id },
          });
        }

        // Update connection with user data
        await prisma.platformConnection.update({
          where: { id: connection.id },
          data: {
            platformUserId: userData.id.toString(),
            platformUsername: fetchedUsername,
            metadata: {
              instanceUrl: normalizedInstanceUrl,
              email: userData.email,
              name: userData.name,
            },
          },
        });

        return ResponseHandler.success(
          res,
          {
            id: connection.id,
            platform: connection.platform,
            username: fetchedUsername,
            email: userData.email,
            instanceUrl: normalizedInstanceUrl,
            connected: true,
          },
          'OpenProject connected successfully',
          201
        );
      } catch (error: any) {
        // Connection failed - delete the connection
        await prisma.platformConnection.delete({
          where: { id: connection.id },
        });

        // Extract error message properly to avoid circular reference issues
        const errorMessage = error.message || 'Invalid credentials or instance URL';
        this.logger.error('[PlatformsController] OpenProject connection verification failed:', {
          message: errorMessage,
          status: error.response?.status,
        });

        throw new BadRequestError(errorMessage);
      }
    }

    // Handle other platforms (existing logic)
    const encryptedToken = accessToken ? encryptionService.encrypt(accessToken) : '';

    const connection = await prisma.platformConnection.create({
      data: {
        userId,
        platform: platform.toUpperCase() as any,
        platformUserId: platformUserId || username,
        platformUsername: username,
        accessToken: encryptedToken,
        isActive: true,
        syncStatus: 'PENDING',
        metadata: {},
      },
    });

    return ResponseHandler.success(
      res,
      {
        id: connection.id,
        platform: connection.platform,
        username: connection.platformUsername,
        connected: true,
      },
      'Platform connected successfully',
      201
    );
  };

  /**
   * DELETE /api/v1/platforms/disconnect/:platform
   * Disconnect a platform account
   */
  disconnectPlatform = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { platform } = req.params;
    const { connectionId } = req.query; // Optional: for disconnecting specific connection

    // Find active connection
    let connection;
    if (connectionId) {
      // Disconnect specific connection by ID
      connection = await prisma.platformConnection.findFirst({
        where: {
          id: connectionId as string,
          userId,
          platform: platform.toUpperCase() as any,
          isActive: true,
        },
      });
    } else {
      // Backward compatibility: disconnect first active connection
      connection = await prisma.platformConnection.findFirst({
        where: {
          userId,
          platform: platform.toUpperCase() as any,
          isActive: true,
        },
      });
    }

    if (!connection) {
      throw new NotFoundError('Platform connection not found or already disconnected');
    }

    // Soft delete - mark as inactive
    await prisma.platformConnection.update({
      where: { id: connection.id },
      data: {
        isActive: false,
      },
    });

    return ResponseHandler.success(
      res,
      {
        platform: connection.platform,
        username: connection.platformUsername,
        disconnected: true,
      },
      'Platform disconnected successfully'
    );
  };

  /**
   * PUT /api/v1/platforms/sync/:platform
   * Manually trigger sync for a specific platform
   */
  syncPlatform = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { platform } = req.params;

    console.log('[PlatformsController] syncPlatform - userId:', userId);
    console.log('[PlatformsController] syncPlatform - req.user:', req.user);

    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    // Find active connection
    const connection = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: platform.toUpperCase() as any,
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection not found');
    }

    // Trigger sync based on platform type
    try {
      if (platform.toUpperCase() === 'GOOGLE_CALENDAR') {
        // Sync Google Calendar in the background
        this.googleCalendarIntegration.syncData(userId, connection.id).catch((error) => {
          console.error('[PlatformsController] Google Calendar sync failed:', error);
        });

        return ResponseHandler.success(
          res,
          {
            platform: connection.platform,
            syncStatus: 'SYNCING',
            message: 'Google Calendar sync initiated. Your events will be synced shortly.',
          },
          'Platform sync initiated successfully'
        );
      } else if (platform.toUpperCase() === 'OPENPROJECT') {
        // Sync OpenProject in the background
        this.openProjectIntegration.syncData(userId, connection.id).catch((error) => {
          console.error('[PlatformsController] OpenProject sync failed:', error);
        });

        return ResponseHandler.success(
          res,
          {
            platform: connection.platform,
            syncStatus: 'SYNCING',
            message: 'OpenProject sync initiated. Your work packages will be synced shortly.',
          },
          'Platform sync initiated successfully'
        );
      } else {
        // For other platforms, just set to PENDING for now
        await prisma.platformConnection.update({
          where: { id: connection.id },
          data: {
            syncStatus: 'PENDING',
          },
        });

        return ResponseHandler.success(
          res,
          {
            platform: connection.platform,
            syncStatus: 'PENDING',
            message: 'Sync job queued. Data will be updated shortly.',
          },
          'Platform sync initiated successfully'
        );
      }
    } catch (error: any) {
      throw new BadRequestError(`Failed to sync ${platform}: ${error.message}`);
    }
  };

  /**
   * GET /api/v1/platforms/:platform/status
   * Get detailed status of a specific platform connection
   */
  getPlatformStatus = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { platform } = req.params;

    const connection = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: platform.toUpperCase() as any,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        isActive: true,
        lastSynced: true,
        syncStatus: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return ResponseHandler.success(
        res,
        {
          platform: platform.toUpperCase(),
          connected: false,
        },
        'Platform not connected'
      );
    }

    return ResponseHandler.success(
      res,
      {
        ...connection,
        connected: true,
      },
      'Platform status retrieved successfully'
    );
  };

  /**
   * GET /api/platforms/github/repos/:connectionId
   * Get GitHub repositories for a connected account
   */
  getGitHubRepositories = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { connectionId } = req.params;

    // Verify the connection belongs to the user
    const connection = await prisma.platformConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: 'GITHUB',
      },
    });

    if (!connection) {
      throw new NotFoundError('GitHub connection not found');
    }

    const { GitHubIntegration } = require('../integrations/github.integration');
    const githubIntegration = new GitHubIntegration(prisma);

    const repositories = await githubIntegration.fetchRepositories(connectionId);

    this.success(res, repositories, 'GitHub repositories fetched successfully');
  };

  /**
   * GET /api/v1/platforms/openproject/projects
   * Get all OpenProject projects
   */
  getOpenProjectProjects = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;

    // Find active OpenProject connection
    const connection = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'OPENPROJECT',
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundError('OpenProject connection not found');
    }

    try {
      const projects = await this.openProjectIntegration.fetchProjects(connection.id);

      return ResponseHandler.success(
        res,
        {
          projects,
          total: projects.length,
        },
        'OpenProject projects retrieved successfully'
      );
    } catch (error: any) {
      throw new BadRequestError(`Failed to fetch projects: ${error.message}`);
    }
  };

  /**
   * GET /api/platforms/github/commits/:connectionId
   * Get commits for a specific repository
   * Query params: repo (required), since (optional), until (optional)
   */
  getGitHubCommits = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { connectionId } = req.params;
    const { repo, since, until } = req.query;

    if (!repo || typeof repo !== 'string') {
      throw new BadRequestError('Repository full name is required (e.g., owner/repo)');
    }

    // Verify the connection belongs to the user
    const connection = await prisma.platformConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: 'GITHUB',
      },
    });

    if (!connection) {
      throw new NotFoundError('GitHub connection not found');
    }

    const { GitHubIntegration } = require('../integrations/github.integration');
    const githubIntegration = new GitHubIntegration(prisma);

    const commits = await githubIntegration.fetchRepositoryCommits(
      connectionId,
      repo,
      since as string | undefined,
      until as string | undefined
    );

    this.success(res, commits, 'GitHub commits fetched successfully');
  };

  /**
   * GET /api/v1/platforms/openproject/projects/:projectId/work-packages
   * Get work packages for a specific OpenProject project
   */
  getProjectWorkPackages = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { projectId } = req.params;

    // Find active OpenProject connection
    const connection = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'OPENPROJECT',
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundError('OpenProject connection not found');
    }

    try {
      const workPackages = await this.openProjectIntegration.fetchProjectWorkPackages(
        connection.id,
        projectId
      );

      return ResponseHandler.success(
        res,
        {
          workPackages,
          total: workPackages.length,
          projectId,
        },
        'Work packages retrieved successfully'
      );
    } catch (error: any) {
      throw new BadRequestError(`Failed to fetch work packages: ${error.message}`);
    }
  };

  /**
   * POST /api/v1/platforms/openproject/work-packages/:workPackageId/add-to-tasks
   * Add a work package to tasks with optional due date override
   */
  addWorkPackageToTasks = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { workPackageId } = req.params;
    const { dueDate } = req.body;

    // Find active OpenProject connection
    const connection = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'OPENPROJECT',
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundError('OpenProject connection not found');
    }

    try {
      await this.openProjectIntegration.addWorkPackageToTasks(
        userId,
        connection.id,
        workPackageId,
        dueDate
      );

      return ResponseHandler.success(
        res,
        {
          workPackageId,
          added: true,
        },
        'Work package added to tasks successfully',
        201
      );
    } catch (error: any) {
      throw new BadRequestError(`Failed to add work package to tasks: ${error.message}`);
    }
  };
}
