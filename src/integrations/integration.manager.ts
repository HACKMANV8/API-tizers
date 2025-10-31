import { PrismaClient } from '@prisma/client';
import { GitHubIntegration } from './github.integration';
import { LeetCodeIntegration } from './leetcode.integration';
import { CodeforcesIntegration } from './codeforces.integration';
import { GoogleCalendarIntegration } from './google-calendar.integration';
import { MicrosoftCalendarIntegration } from './microsoft-calendar.integration';
import { OpenProjectIntegration } from './openproject.integration';
import { SlackIntegration } from './slack.integration';
import { BaseIntegration } from '../utils/base-integration';
import { BadRequestError } from '../utils/errors';

export type PlatformType =
  | 'GITHUB'
  | 'LEETCODE'
  | 'CODEFORCES'
  | 'GOOGLE_CALENDAR'
  | 'MS_CALENDAR'
  | 'OPENPROJECT'
  | 'SLACK';

/**
 * Integration Manager
 * Factory class to create and manage platform integrations
 */
export class IntegrationManager {
  private static instances: Map<PlatformType, BaseIntegration> = new Map();
  private static prisma: PrismaClient;

  /**
   * Initialize the manager with Prisma client
   */
  static initialize(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

  /**
   * Get integration instance for a platform
   */
  static getIntegration(platform: PlatformType): BaseIntegration {
    if (!this.prisma) {
      throw new Error('IntegrationManager not initialized. Call initialize() first.');
    }

    // Return cached instance if exists
    if (this.instances.has(platform)) {
      return this.instances.get(platform)!;
    }

    // Create new instance based on platform
    let integration: BaseIntegration;

    switch (platform) {
      case 'GITHUB':
        integration = new GitHubIntegration(this.prisma);
        break;
      case 'LEETCODE':
        integration = new LeetCodeIntegration(this.prisma);
        break;
      case 'CODEFORCES':
        integration = new CodeforcesIntegration(this.prisma);
        break;
      case 'GOOGLE_CALENDAR':
        integration = new GoogleCalendarIntegration(this.prisma);
        break;
      case 'MS_CALENDAR':
        integration = new MicrosoftCalendarIntegration(this.prisma);
        break;
      case 'OPENPROJECT':
        integration = new OpenProjectIntegration(this.prisma);
        break;
      case 'SLACK':
        integration = new SlackIntegration(this.prisma);
        break;
      default:
        throw new BadRequestError(`Unsupported platform: ${platform}`);
    }

    // Cache the instance
    this.instances.set(platform, integration);
    return integration;
  }

  /**
   * Sync data for a specific platform connection
   */
  static async syncPlatform(
    userId: string,
    connectionId: string,
    platform: PlatformType
  ): Promise<void> {
    const integration = this.getIntegration(platform);
    await integration.syncData(userId, connectionId);
  }

  /**
   * Sync all connected platforms for a user
   */
  static async syncAllPlatforms(userId: string): Promise<void> {
    const connections = await this.prisma.platformConnection.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    const syncPromises = connections.map((connection) =>
      this.syncPlatform(userId, connection.id, connection.platform as PlatformType)
    );

    await Promise.allSettled(syncPromises);
  }

  /**
   * Get supported platforms list
   */
  static getSupportedPlatforms(): PlatformType[] {
    return [
      'GITHUB',
      'LEETCODE',
      'CODEFORCES',
      'GOOGLE_CALENDAR',
      'MS_CALENDAR',
      'OPENPROJECT',
      'SLACK',
    ];
  }
}
