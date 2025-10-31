import { Request, Response } from 'express';
import { BaseController } from '../utils/base-controller';
import prisma from '../config/database';
import { ResponseHandler } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth.middleware';

export class PlatformsController extends BaseController {
  constructor() {
    super();
  }

  /**
   * POST /api/v1/platforms/connect/:platform
   * Connect a platform account
   */
  connectPlatform = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { platform } = req.params;
    const { username, accessToken, platformUserId } = req.body;

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

    // Create platform connection
    const connection = await prisma.platformConnection.create({
      data: {
        userId,
        platform: platform.toUpperCase() as any,
        platformUserId: platformUserId || username,
        platformUsername: username,
        accessToken: accessToken || '', // TODO: Encrypt in production
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
    const userId = req.user!.id;
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
    const userId = req.user!.id;
    const { platform } = req.params;

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

    // Update sync status
    await prisma.platformConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: 'PENDING',
      },
    });

    // TODO: Trigger actual sync job via queue
    // await queueManager.addSyncJob(userId, platform.toUpperCase());

    return ResponseHandler.success(
      res,
      {
        platform: connection.platform,
        syncStatus: 'PENDING',
        message: 'Sync job queued. Data will be updated shortly.',
      },
      'Platform sync initiated successfully'
    );
  };

  /**
   * GET /api/v1/platforms/:platform/status
   * Get detailed status of a specific platform connection
   */
  getPlatformStatus = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
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
        isActive: true,
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
        isActive: true,
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

    this.success(res, commits, 'Repository commits fetched successfully');
  };

  /**
   * GET /api/platforms/codeforces/stats/:connectionId
   * Get Codeforces stats for a connected account
   */
  getCodeforcesStats = async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const { connectionId } = req.params;

    // Verify the connection belongs to the user
    const connection = await prisma.platformConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: 'CODEFORCES',
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundError('Codeforces connection not found');
    }

    // Get the latest stats from database
    const stats = await prisma.cpStat.findFirst({
      where: {
        connectionId,
        platform: 'CODEFORCES',
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (!stats) {
      // No stats yet, trigger a sync
      const { CodeforcesIntegration } = require('../integrations/codeforces.integration');
      const codeforcesIntegration = new CodeforcesIntegration(prisma);

      try {
        await codeforcesIntegration.syncData(userId, connectionId);

        // Fetch the newly created stats
        const newStats = await prisma.cpStat.findFirst({
          where: {
            connectionId,
            platform: 'CODEFORCES',
          },
          orderBy: {
            date: 'desc',
          },
        });

        this.success(res, newStats, 'Codeforces stats fetched successfully');
      } catch (error: any) {
        this.error(res, 'Failed to sync Codeforces data', 500);
      }
    } else {
      this.success(res, stats, 'Codeforces stats fetched successfully');
    }
  };

  /**
   * GET /api/platforms/codeforces/submissions/:connectionId
   * Get recent submissions for a Codeforces account
   * Query params: count (optional, default 100)
   */
  getCodeforcesSubmissions = async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const { connectionId } = req.params;
    const { count } = req.query;

    // Verify the connection belongs to the user
    const connection = await prisma.platformConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: 'CODEFORCES',
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundError('Codeforces connection not found');
    }

    const { CodeforcesIntegration } = require('../integrations/codeforces.integration');
    const codeforcesIntegration = new CodeforcesIntegration(prisma);

    const submissions = await codeforcesIntegration.fetchSubmissions(
      connection.platformUsername,
      count ? parseInt(count as string, 10) : 100
    );

    this.success(res, submissions, 'Codeforces submissions fetched successfully');
  };
}
