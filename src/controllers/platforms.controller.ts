import { Request, Response } from 'express';
import { BaseController } from '../utils/base-controller';
import prisma from '../config/database';
import { ResponseHandler } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth.middleware';
import { GoogleCalendarIntegration } from '../integrations/google-calendar.integration';

export class PlatformsController extends BaseController {
  private googleCalendarIntegration: GoogleCalendarIntegration;

  constructor() {
    super();
    this.googleCalendarIntegration = new GoogleCalendarIntegration(prisma);
  }

  /**
   * POST /api/v1/platforms/connect/:platform
   * Connect a platform account
   */
  connectPlatform = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
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

    // Check if platform is already connected
    const existing = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: platform.toUpperCase() as any,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestError('Platform already connected. Disconnect first to reconnect.');
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
    const userId = req.user?.id!;
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
}
