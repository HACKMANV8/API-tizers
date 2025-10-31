import { PrismaClient } from '@prisma/client';
import { BaseIntegration } from '../utils/base-integration';
import { config } from '../config';
import { NotFoundError, ServiceUnavailableError } from '../utils/errors';
import { startOfDay } from 'date-fns';

export interface CodeforcesUser {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  contribution: number;
}

export interface CodeforcesSubmission {
  id: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
    rating?: number;
  };
  verdict: string;
  creationTimeSeconds: number;
}

export class CodeforcesIntegration extends BaseIntegration {
  constructor(prisma: PrismaClient) {
    super(
      {
        baseURL: config.platforms.codeforces.apiUrl,
      },
      prisma,
      'Codeforces'
    );
  }

  /**
   * Fetch user info
   */
  async fetchUserData(connectionId: string): Promise<CodeforcesUser> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.platformUsername) {
      throw new NotFoundError('Codeforces connection not found');
    }

    try {
      const response = await this.client.get('/user.info', {
        params: {
          handles: connection.platformUsername,
        },
      });

      if (response.data.status !== 'OK' || !response.data.result || response.data.result.length === 0) {
        throw new NotFoundError('Codeforces user not found');
      }

      return response.data.result[0];
    } catch (error) {
      this.logger.error('[Codeforces] Error fetching user data:', error);
      throw new ServiceUnavailableError('Failed to fetch Codeforces user data');
    }
  }

  /**
   * Fetch user submissions
   */
  async fetchSubmissions(username: string, count: number = 100): Promise<CodeforcesSubmission[]> {
    try {
      const response = await this.client.get('/user.status', {
        params: {
          handle: username,
          from: 1,
          count,
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error('Failed to fetch submissions');
      }

      return response.data.result || [];
    } catch (error) {
      this.logger.error('[Codeforces] Error fetching submissions:', error);
      return [];
    }
  }

  /**
   * Fetch user contests
   */
  async fetchContests(username: string): Promise<any[]> {
    try {
      const response = await this.client.get('/user.rating', {
        params: {
          handle: username,
        },
      });

      if (response.data.status !== 'OK') {
        return [];
      }

      return response.data.result || [];
    } catch (error) {
      this.logger.error('[Codeforces] Error fetching contests:', error);
      return [];
    }
  }

  /**
   * Calculate problems solved and difficulty breakdown
   */
  private calculateStats(submissions: CodeforcesSubmission[], todayStart: Date) {
    const acceptedSubmissions = submissions.filter((sub) => sub.verdict === 'OK');

    // Get unique problems solved (all time)
    const uniqueProblems = new Set(
      acceptedSubmissions.map((sub) => `${sub.problem.contestId}_${sub.problem.index}`)
    );

    // Get problems solved today
    const todaySubmissions = acceptedSubmissions.filter((sub) => {
      const subDate = new Date(sub.creationTimeSeconds * 1000);
      return subDate >= todayStart;
    });

    const todayProblems = new Set(
      todaySubmissions.map((sub) => `${sub.problem.contestId}_${sub.problem.index}`)
    );

    // Calculate difficulty breakdown for all time
    const difficultyBreakdown = {
      easy: 0, // Rating < 1200
      medium: 0, // Rating 1200-1900
      hard: 0, // Rating > 1900
    };

    acceptedSubmissions.forEach((sub) => {
      const rating = sub.problem.rating || 0;
      if (rating < 1200) {
        difficultyBreakdown.easy++;
      } else if (rating <= 1900) {
        difficultyBreakdown.medium++;
      } else {
        difficultyBreakdown.hard++;
      }
    });

    return {
      totalSolved: uniqueProblems.size,
      solvedToday: todayProblems.size,
      difficultyBreakdown,
    };
  }

  /**
   * Sync Codeforces data for a user
   */
  async syncData(userId: string, connectionId: string): Promise<void> {
    await this.updateSyncStatus(connectionId, 'SYNCING');

    try {
      const connection = await this.prisma.platformConnection.findUnique({
        where: { id: connectionId },
      });

      if (!connection || !connection.platformUsername) {
        throw new NotFoundError('Codeforces connection not found or incomplete');
      }

      // Fetch user data
      const userData = await this.fetchUserData(connectionId);

      // Fetch submissions
      const submissions = await this.fetchSubmissions(connection.platformUsername, 200);

      // Fetch contests
      const contests = await this.fetchContests(connection.platformUsername);

      // Calculate stats
      const todayStart = startOfDay(new Date());
      const stats = this.calculateStats(submissions, todayStart);

      // Upsert Codeforces stats - Store ALL-TIME stats
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
          platform: 'CODEFORCES',
          date: todayStart,
          problemsSolved: stats.totalSolved, // All-time total
          easySolved: stats.difficultyBreakdown.easy, // All-time easy
          mediumSolved: stats.difficultyBreakdown.medium, // All-time medium
          hardSolved: stats.difficultyBreakdown.hard, // All-time hard
          contestsParticipated: contests.length, // All-time contests
          rating: userData.rating,
          ranking: 0, // Codeforces doesn't provide direct ranking
          totalProblemsSolved: stats.totalSolved,
          problemsDetail: {
            easy: stats.difficultyBreakdown.easy,
            medium: stats.difficultyBreakdown.medium,
            hard: stats.difficultyBreakdown.hard,
            total: stats.totalSolved,
            maxRating: userData.maxRating,
            rank: userData.rank,
            maxRank: userData.maxRank,
            contribution: userData.contribution,
          },
        },
        update: {
          problemsSolved: stats.totalSolved, // All-time total
          easySolved: stats.difficultyBreakdown.easy, // All-time easy
          mediumSolved: stats.difficultyBreakdown.medium, // All-time medium
          hardSolved: stats.difficultyBreakdown.hard, // All-time hard
          contestsParticipated: contests.length, // All-time contests
          rating: userData.rating,
          totalProblemsSolved: stats.totalSolved,
          problemsDetail: {
            easy: stats.difficultyBreakdown.easy,
            medium: stats.difficultyBreakdown.medium,
            hard: stats.difficultyBreakdown.hard,
            total: stats.totalSolved,
            maxRating: userData.maxRating,
            rank: userData.rank,
            maxRank: userData.maxRank,
            contribution: userData.contribution,
          },
        },
      });

      await this.updateSyncStatus(connectionId, 'COMPLETED');
      this.logger.info('[Codeforces] Sync completed successfully', { userId, connectionId });
    } catch (error: any) {
      await this.updateSyncStatus(connectionId, 'FAILED', error.message);
      this.logger.error('[Codeforces] Sync failed:', error);
      throw error;
    }
  }
}
