import { Job } from 'bull';
import { queueManager, SyncJobData, StatsCalculationJobData } from './queue.manager';
import { IntegrationManager, PlatformType } from '../integrations/integration.manager';
import prisma from '../config/database';
import logger from '../utils/logger';

/**
 * Queue Processor
 * Processes background jobs from Bull queues
 */
export class QueueProcessor {
  /**
   * Initialize processors
   */
  static initialize(): void {
    // Initialize IntegrationManager
    IntegrationManager.initialize(prisma);

    // Register sync processor
    queueManager
      .getSyncQueue()
      .process(queueManager.getSyncQueue().name, this.processSyncJob.bind(this));

    // Register stats calculation processor
    queueManager
      .getStatsQueue()
      .process(queueManager.getStatsQueue().name, this.processStatsCalculationJob.bind(this));

    logger.info('[QueueProcessor] Processors initialized and registered');
  }

  /**
   * Process platform sync job
   */
  private static async processSyncJob(job: Job<SyncJobData>): Promise<void> {
    const { userId, connectionId, platform } = job.data;

    logger.info(`[QueueProcessor] Processing sync job`, { userId, platform, connectionId });

    try {
      // Update job status in database
      await prisma.syncJob.create({
        data: {
          userId,
          platform,
          jobType: 'FULL_SYNC',
          status: 'PROCESSING',
          startedAt: new Date(),
          metadata: {
            connectionId,
            bullJobId: job.id,
          },
        },
      });

      // Execute sync using IntegrationManager
      await IntegrationManager.syncPlatform(userId, connectionId, platform as PlatformType);

      // Update job status
      await prisma.syncJob.updateMany({
        where: {
          userId,
          platform,
          status: 'PROCESSING',
          metadata: {
            path: ['connectionId'],
            equals: connectionId,
          },
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Queue stats calculation after successful sync
      await queueManager.addStatsCalculationJob(userId, new Date());

      logger.info(`[QueueProcessor] Sync job completed`, { userId, platform });
    } catch (error: any) {
      logger.error(`[QueueProcessor] Sync job failed`, {
        userId,
        platform,
        error: error.message,
      });

      // Update job status to failed
      await prisma.syncJob.updateMany({
        where: {
          userId,
          platform,
          status: 'PROCESSING',
          metadata: {
            path: ['connectionId'],
            equals: connectionId,
          },
        },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });

      throw error; // Re-throw to mark Bull job as failed
    }
  }

  /**
   * Process stats calculation job
   */
  private static async processStatsCalculationJob(
    job: Job<StatsCalculationJobData>
  ): Promise<void> {
    const { userId, date } = job.data;

    logger.info(`[QueueProcessor] Processing stats calculation`, { userId, date });

    try {
      // TODO: Implement stats calculation logic
      // This should aggregate data from all platforms and calculate:
      // - Activity heatmap
      // - Streaks
      // - Points
      // - Mission progress
      // - Leaderboard rankings

      // For now, just log that it would be calculated
      logger.info(`[QueueProcessor] Stats calculation would be performed here`, {
        userId,
        date,
      });

      // TODO: Remove this placeholder once stats calculation is implemented
    } catch (error: any) {
      logger.error(`[QueueProcessor] Stats calculation failed`, {
        userId,
        date,
        error: error.message,
      });

      throw error;
    }
  }
}

// Initialize processors when module is imported
QueueProcessor.initialize();

export default QueueProcessor;
