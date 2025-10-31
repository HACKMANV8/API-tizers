import { PrismaClient } from '@prisma/client';
import { BaseIntegration } from '../utils/base-integration';
import { config } from '../config';
import { NotFoundError, ServiceUnavailableError } from '../utils/errors';
import { startOfDay } from 'date-fns';

export interface LeetCodeUserStats {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  ranking: number;
  contributionPoints: number;
  reputation: number;
}

export class LeetCodeIntegration extends BaseIntegration {
  constructor(prisma: PrismaClient) {
    super(
      {
        baseURL: config.platforms.leetcode.apiUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      prisma,
      'LeetCode'
    );
  }

  /**
   * Fetch user profile using GraphQL
   */
  async fetchUserData(connectionId: string): Promise<any> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.platformUsername) {
      throw new NotFoundError('LeetCode connection not found');
    }

    try {
      const query = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              ranking
              reputation
            }
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
              totalSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
      `;

      const response = await this.client.post('', {
        query,
        variables: { username: connection.platformUsername },
      });

      return response.data.data.matchedUser;
    } catch (error) {
      this.logger.error('[LeetCode] Error fetching user data:', error);
      throw new ServiceUnavailableError('Failed to fetch LeetCode user data');
    }
  }

  /**
   * Fetch recent submissions
   */
  async fetchRecentSubmissions(username: string): Promise<any[]> {
    try {
      const query = `
        query getRecentSubmissions($username: String!, $limit: Int!) {
          recentSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            timestamp
            statusDisplay
            lang
          }
        }
      `;

      const response = await this.client.post('', {
        query,
        variables: { username, limit: 20 },
      });

      return response.data.data.recentSubmissionList || [];
    } catch (error) {
      this.logger.error('[LeetCode] Error fetching recent submissions:', error);
      return [];
    }
  }

  /**
   * Parse submission stats
   */
  private parseSubmissionStats(submitStats: any): LeetCodeUserStats {
    const acSubmissions = submitStats.acSubmissionNum || [];
    const totalSubmissions = submitStats.totalSubmissionNum || [];

    const getCountByDifficulty = (arr: any[], difficulty: string) => {
      const item = arr.find((s: any) => s.difficulty === difficulty);
      return item ? item.count : 0;
    };

    const easySolved = getCountByDifficulty(acSubmissions, 'Easy');
    const mediumSolved = getCountByDifficulty(acSubmissions, 'Medium');
    const hardSolved = getCountByDifficulty(acSubmissions, 'Hard');
    const totalSolved = getCountByDifficulty(acSubmissions, 'All');

    const totalAttempts = getCountByDifficulty(totalSubmissions, 'All');
    const acceptanceRate = totalAttempts > 0 ? (totalSolved / totalAttempts) * 100 : 0;

    return {
      username: '',
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
      ranking: 0,
      contributionPoints: 0,
      reputation: 0,
    };
  }

  /**
   * Sync LeetCode data for a user
   */
  async syncData(userId: string, connectionId: string): Promise<void> {
    await this.updateSyncStatus(connectionId, 'SYNCING');

    try {
      const connection = await this.prisma.platformConnection.findUnique({
        where: { id: connectionId },
      });

      if (!connection || !connection.platformUsername) {
        throw new NotFoundError('LeetCode connection not found or incomplete');
      }

      // Fetch user data
      const userData = await this.fetchUserData(connectionId);

      if (!userData) {
        throw new NotFoundError('LeetCode user not found');
      }

      // Parse stats
      const stats = this.parseSubmissionStats(userData.submitStats);
      stats.username = userData.username;
      stats.ranking = userData.profile?.ranking || 0;
      stats.reputation = userData.profile?.reputation || 0;

      // Fetch recent submissions to calculate today's problems solved
      const recentSubmissions = await this.fetchRecentSubmissions(connection.platformUsername);
      const todayStart = startOfDay(new Date());
      const todaySubmissions = recentSubmissions.filter((sub) => {
        const subDate = new Date(parseInt(sub.timestamp) * 1000);
        return subDate >= todayStart && sub.statusDisplay === 'Accepted';
      });

      // Count unique problems solved today
      const uniqueProblems = new Set(todaySubmissions.map((sub) => sub.titleSlug));
      const problemsSolvedToday = uniqueProblems.size;

      // Upsert LeetCode stats
      await this.prisma.cpStat.upsert({
        where: {
          connectionId_date: {
            connectionId,
            date: todayStart,
          },
        },
        create: {
          connectionId,
          userId,
          platform: 'LEETCODE',
          date: todayStart,
          problemsSolved: problemsSolvedToday,
          easySolved: 0, // Today's count not available in API
          mediumSolved: 0,
          hardSolved: 0,
          rating: stats.reputation,
          ranking: stats.ranking,
          acceptanceRate: stats.acceptanceRate,
          totalProblemsSolved: stats.totalSolved,
          problemsDetail: {
            easy: stats.easySolved,
            medium: stats.mediumSolved,
            hard: stats.hardSolved,
            total: stats.totalSolved,
          },
        },
        update: {
          problemsSolved: problemsSolvedToday,
          rating: stats.reputation,
          ranking: stats.ranking,
          acceptanceRate: stats.acceptanceRate,
          totalProblemsSolved: stats.totalSolved,
          problemsDetail: {
            easy: stats.easySolved,
            medium: stats.mediumSolved,
            hard: stats.hardSolved,
            total: stats.totalSolved,
          },
        },
      });

      await this.updateSyncStatus(connectionId, 'COMPLETED');
      this.logger.info('[LeetCode] Sync completed successfully', { userId, connectionId });
    } catch (error: any) {
      await this.updateSyncStatus(connectionId, 'FAILED', error.message);
      this.logger.error('[LeetCode] Sync failed:', error);
      throw error;
    }
  }
}
