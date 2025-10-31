import Bull, { Queue, Job, JobOptions } from 'bull';
import { config } from '../config';
import logger from '../utils/logger';

export interface SyncJobData {
  userId: string;
  connectionId: string;
  platform: string;
}

export interface StatsCalculationJobData {
  userId: string;
  date: Date;
}

/**
 * Queue Manager
 * Manages Bull queues for background job processing
 */
export class QueueManager {
  private static instance: QueueManager;
  private syncQueue: Queue<SyncJobData>;
  private statsQueue: Queue<StatsCalculationJobData>;

  private constructor() {
    // Initialize sync queue
    this.syncQueue = new Bull<SyncJobData>('platform-sync', config.queue.redisUrl, {
      defaultJobOptions: {
        attempts: config.queue.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs
      },
    });

    // Initialize stats calculation queue
    this.statsQueue = new Bull<StatsCalculationJobData>('stats-calculation', config.queue.redisUrl, {
      defaultJobOptions: {
        attempts: config.queue.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Setup event handlers for queues
   */
  private setupEventHandlers(): void {
    // Sync queue events
    this.syncQueue.on('completed', (job: Job<SyncJobData>) => {
      logger.info(`[Queue] Sync job completed: ${job.id}`, { data: job.data });
    });

    this.syncQueue.on('failed', (job: Job<SyncJobData>, err: Error) => {
      logger.error(`[Queue] Sync job failed: ${job.id}`, { data: job.data, error: err.message });
    });

    this.syncQueue.on('stalled', (job: Job<SyncJobData>) => {
      logger.warn(`[Queue] Sync job stalled: ${job.id}`, { data: job.data });
    });

    // Stats queue events
    this.statsQueue.on('completed', (job: Job<StatsCalculationJobData>) => {
      logger.info(`[Queue] Stats calculation completed: ${job.id}`, { data: job.data });
    });

    this.statsQueue.on('failed', (job: Job<StatsCalculationJobData>, err: Error) => {
      logger.error(`[Queue] Stats calculation failed: ${job.id}`, {
        data: job.data,
        error: err.message,
      });
    });
  }

  /**
   * Add platform sync job
   */
  async addSyncJob(
    userId: string,
    connectionId: string,
    platform: string,
    options?: JobOptions
  ): Promise<Job<SyncJobData>> {
    return this.syncQueue.add(
      { userId, connectionId, platform },
      {
        ...options,
        jobId: `sync-${platform}-${connectionId}-${Date.now()}`,
      }
    );
  }

  /**
   * Add stats calculation job
   */
  async addStatsCalculationJob(
    userId: string,
    date: Date,
    options?: JobOptions
  ): Promise<Job<StatsCalculationJobData>> {
    return this.statsQueue.add(
      { userId, date },
      {
        ...options,
        jobId: `stats-${userId}-${date.toISOString()}-${Date.now()}`,
      }
    );
  }

  /**
   * Sync all platforms for a user
   */
  async syncAllPlatforms(userId: string): Promise<Job<SyncJobData>[]> {
    // TODO: Get all connections for user and add sync jobs
    // This will be implemented in the sync service
    return [];
  }

  /**
   * Schedule recurring sync job
   */
  async scheduleRecurringSync(
    userId: string,
    connectionId: string,
    platform: string,
    cronExpression: string
  ): Promise<void> {
    await this.syncQueue.add(
      { userId, connectionId, platform },
      {
        repeat: {
          cron: cronExpression,
        },
        jobId: `recurring-sync-${platform}-${connectionId}`,
      }
    );

    logger.info(`[Queue] Scheduled recurring sync for ${platform}`, {
      userId,
      connectionId,
      cron: cronExpression,
    });
  }

  /**
   * Remove recurring sync job
   */
  async removeRecurringSync(platform: string, connectionId: string): Promise<void> {
    const jobId = `recurring-sync-${platform}-${connectionId}`;
    const job = await this.syncQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`[Queue] Removed recurring sync for ${platform}`, { connectionId });
    }
  }

  /**
   * Get sync queue
   */
  getSyncQueue(): Queue<SyncJobData> {
    return this.syncQueue;
  }

  /**
   * Get stats queue
   */
  getStatsQueue(): Queue<StatsCalculationJobData> {
    return this.statsQueue;
  }

  /**
   * Get job counts
   */
  async getJobCounts(): Promise<any> {
    const [syncCounts, statsCounts] = await Promise.all([
      this.syncQueue.getJobCounts(),
      this.statsQueue.getJobCounts(),
    ]);

    return {
      sync: syncCounts,
      stats: statsCounts,
    };
  }

  /**
   * Close queues gracefully
   */
  async close(): Promise<void> {
    await Promise.all([this.syncQueue.close(), this.statsQueue.close()]);
    logger.info('[Queue] All queues closed');
  }
}

// Export singleton instance
export const queueManager = QueueManager.getInstance();
