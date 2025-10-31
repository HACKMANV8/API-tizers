import { PrismaClient } from '@prisma/client';
import { BaseService } from '../utils/base-service';
import { queueManager } from '../sync/queue.manager';
import { NotFoundError, BadRequestError } from '../utils/errors';

export interface SyncStatusResponse {
  platform: string;
  lastSynced: Date | null;
  syncStatus: string;
  isActive: boolean;
}

export class SyncService extends BaseService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Trigger sync for a specific platform
   */
  async syncPlatform(userId: string, platform: string): Promise<void> {
    const connection = await this.prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: platform as any,
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundError(`No active connection found for platform: ${platform}`);
    }

    // Add sync job to queue
    await queueManager.addSyncJob(userId, connection.id, platform);

    this.logInfo(`Sync job queued for platform: ${platform}`, { userId, connectionId: connection.id });
  }

  /**
   * Trigger sync for all connected platforms
   */
  async syncAllPlatforms(userId: string): Promise<void> {
    const connections = await this.prisma.platformConnection.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (connections.length === 0) {
      throw new BadRequestError('No active platform connections found');
    }

    // Add sync jobs for all platforms
    const jobs = connections.map((connection) =>
      queueManager.addSyncJob(userId, connection.id, connection.platform)
    );

    await Promise.all(jobs);

    this.logInfo(`Sync jobs queued for ${connections.length} platforms`, { userId });
  }

  /**
   * Get sync status for all platforms
   */
  async getSyncStatus(userId: string): Promise<SyncStatusResponse[]> {
    const connections = await this.prisma.platformConnection.findMany({
      where: { userId },
      select: {
        platform: true,
        lastSynced: true,
        syncStatus: true,
        isActive: true,
      },
    });

    return connections.map((conn) => ({
      platform: conn.platform,
      lastSynced: conn.lastSynced,
      syncStatus: conn.syncStatus,
      isActive: conn.isActive,
    }));
  }

  /**
   * Get sync history for a user
   */
  async getSyncHistory(userId: string, limit: number = 20) {
    const history = await this.prisma.syncJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history;
  }

  /**
   * Cancel pending sync jobs
   */
  async cancelPendingSyncs(userId: string): Promise<void> {
    // Update pending sync jobs in database
    await this.prisma.syncJob.updateMany({
      where: {
        userId,
        status: 'QUEUED',
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    this.logInfo('Cancelled pending sync jobs', { userId });
  }

  /**
   * Connect a platform (save connection details)
   */
  async connectPlatform(
    userId: string,
    platform: string,
    platformUserId: string,
    platformUsername: string,
    accessToken?: string,
    refreshToken?: string,
    tokenExpiresAt?: Date
  ): Promise<any> {
    // Check if connection already exists
    const existing = await this.prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: platform as any,
        platformUsername,
      },
    });

    if (existing) {
      // Update existing connection
      return this.prisma.platformConnection.update({
        where: { id: existing.id },
        data: {
          platformUserId,
          accessToken,
          refreshToken,
          tokenExpiresAt,
          isActive: true,
          syncStatus: 'PENDING',
        },
      });
    }

    // Create new connection
    return this.prisma.platformConnection.create({
      data: {
        userId,
        platform: platform as any,
        platformUserId,
        platformUsername,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        isActive: true,
        syncStatus: 'PENDING',
      },
    });
  }

  /**
   * Disconnect a platform
   */
  async disconnectPlatform(userId: string, connectionId: string): Promise<void> {
    const connection = await this.prisma.platformConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Soft delete by marking as inactive
    await this.prisma.platformConnection.update({
      where: { id: connectionId },
      data: { isActive: false },
    });

    // Cancel any recurring sync jobs
    // await queueManager.removeRecurringSync(connection.platform, connectionId);

    this.logInfo(`Platform disconnected: ${connection.platform}`, { userId, connectionId });
  }

  /**
   * Get all connected platforms for a user
   */
  async getConnections(userId: string) {
    return this.prisma.platformConnection.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        lastSynced: true,
        syncStatus: true,
        createdAt: true,
      },
    });
  }
}
