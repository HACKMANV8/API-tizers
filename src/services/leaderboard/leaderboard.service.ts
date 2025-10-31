import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../utils/base-service';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  commitsCount: number;
  problemsSolved: number;
  tasksCompleted: number;
  missionsCompleted: number;
  streakDays: number;
}

/**
 * Leaderboard Service
 * Manages leaderboard rankings and calculations
 */
export class LeaderboardService extends BaseService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Calculate leaderboard for a specific period
   */
  async calculateLeaderboard(
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME',
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    let startDate: Date;
    const today = startOfDay(new Date());

    switch (period) {
      case 'DAILY':
        startDate = today;
        break;
      case 'WEEKLY':
        startDate = startOfWeek(today);
        break;
      case 'MONTHLY':
        startDate = startOfMonth(today);
        break;
      case 'ALL_TIME':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get all users with their stats
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        totalPoints: true,
        currentStreak: true,
      },
      take: limit * 2, // Get more than needed for filtering
    });

    // Calculate stats for each user in the period
    const leaderboardData = await Promise.all(
      users.map(async (user) => {
        // GitHub stats
        const githubStats = await this.prisma.githubStat.aggregate({
          where: {
            userId: user.id,
            date: { gte: startDate },
          },
          _sum: {
            commits: true,
          },
        });

        // CP stats
        const cpStats = await this.prisma.cpStat.aggregate({
          where: {
            userId: user.id,
            date: { gte: startDate },
          },
          _sum: {
            problemsSolved: true,
          },
        });

        // Tasks completed
        const tasksCompleted = await this.prisma.task.count({
          where: {
            userId: user.id,
            status: 'COMPLETED',
            completedAt: { gte: startDate },
          },
        });

        // Missions completed
        const missionsCompleted = await this.prisma.userMission.count({
          where: {
            userId: user.id,
            status: 'COMPLETED',
            completedAt: { gte: startDate },
          },
        });

        return {
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          points: period === 'ALL_TIME' ? user.totalPoints : 0, // TODO: Calculate period-specific points
          commitsCount: githubStats._sum.commits || 0,
          problemsSolved: cpStats._sum.problemsSolved || 0,
          tasksCompleted,
          missionsCompleted,
          streakDays: user.currentStreak,
        };
      })
    );

    // Sort by points (descending) and assign ranks
    const sorted = leaderboardData
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    // Cache leaderboard in database
    await this.cacheLeaderboard(sorted, period);

    return sorted;
  }

  /**
   * Cache leaderboard data
   */
  private async cacheLeaderboard(entries: LeaderboardEntry[], period: string) {
    const calculatedAt = new Date();

    await Promise.all(
      entries.map((entry) =>
        this.prisma.leaderboard.upsert({
          where: {
            userId_period_calculatedAt: {
              userId: entry.userId,
              period: period as any,
              calculatedAt: startOfDay(calculatedAt),
            },
          },
          create: {
            userId: entry.userId,
            period: period as any,
            points: entry.points,
            rank: entry.rank,
            commitsCount: entry.commitsCount,
            problemsSolved: entry.problemsSolved,
            tasksCompleted: entry.tasksCompleted,
            missionsCompleted: entry.missionsCompleted,
            streakDays: entry.streakDays,
            calculatedAt,
          },
          update: {
            points: entry.points,
            rank: entry.rank,
            commitsCount: entry.commitsCount,
            problemsSolved: entry.problemsSolved,
            tasksCompleted: entry.tasksCompleted,
            missionsCompleted: entry.missionsCompleted,
            streakDays: entry.streakDays,
            calculatedAt,
          },
        })
      )
    );
  }

  /**
   * Get leaderboard (from cache if recent)
   */
  async getLeaderboard(
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME',
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    // Try to get from cache (if calculated within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const cached = await this.prisma.leaderboard.findMany({
      where: {
        period: period as any,
        calculatedAt: { gte: oneHourAgo },
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        rank: 'asc',
      },
      take: limit,
    });

    if (cached.length > 0) {
      return cached.map((entry) => ({
        rank: entry.rank || 0,
        userId: entry.userId,
        username: entry.user.username,
        avatarUrl: entry.user.avatarUrl,
        points: entry.points,
        commitsCount: entry.commitsCount,
        problemsSolved: entry.problemsSolved,
        tasksCompleted: entry.tasksCompleted,
        missionsCompleted: entry.missionsCompleted,
        streakDays: entry.streakDays,
      }));
    }

    // Calculate fresh leaderboard
    return this.calculateLeaderboard(period, limit);
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(userId: string, period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME') {
    const leaderboard = await this.getLeaderboard(period, 1000);
    const userEntry = leaderboard.find((entry) => entry.userId === userId);

    return userEntry || null;
  }
}
