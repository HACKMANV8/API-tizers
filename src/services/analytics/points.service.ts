import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../utils/base-service';

/**
 * Points Service
 * Calculates and manages user points/rewards
 */
export class PointsService extends BaseService {
  // Point values for different activities
  private static readonly POINTS = {
    GITHUB_COMMIT: 5,
    GITHUB_PR: 20,
    GITHUB_ISSUE: 10,
    GITHUB_REVIEW: 15,
    LEETCODE_EASY: 10,
    LEETCODE_MEDIUM: 20,
    LEETCODE_HARD: 40,
    CODEFORCES_PROBLEM: 15,
    TASK_COMPLETED: 5,
    DAILY_MISSION: 50,
    WEEKLY_MISSION: 100,
    STREAK_MILESTONE_7: 100,
    STREAK_MILESTONE_30: 500,
    STREAK_MILESTONE_100: 2000,
  };

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Calculate points for GitHub activities
   */
  private calculateGitHubPoints(stats: {
    commits: number;
    pullRequests: number;
    issues: number;
    reviews: number;
  }): number {
    return (
      stats.commits * PointsService.POINTS.GITHUB_COMMIT +
      stats.pullRequests * PointsService.POINTS.GITHUB_PR +
      stats.issues * PointsService.POINTS.GITHUB_ISSUE +
      stats.reviews * PointsService.POINTS.GITHUB_REVIEW
    );
  }

  /**
   * Calculate points for competitive programming
   */
  private calculateCPPoints(stats: {
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
  }): number {
    return (
      stats.easySolved * PointsService.POINTS.LEETCODE_EASY +
      stats.mediumSolved * PointsService.POINTS.LEETCODE_MEDIUM +
      stats.hardSolved * PointsService.POINTS.LEETCODE_HARD
    );
  }

  /**
   * Calculate bonus points for streaks
   */
  private calculateStreakBonus(streak: number): number {
    let bonus = 0;

    if (streak >= 100) {
      bonus += PointsService.POINTS.STREAK_MILESTONE_100;
    } else if (streak >= 30) {
      bonus += PointsService.POINTS.STREAK_MILESTONE_30;
    } else if (streak >= 7) {
      bonus += PointsService.POINTS.STREAK_MILESTONE_7;
    }

    return bonus;
  }

  /**
   * Calculate total points for a user
   */
  async calculateTotalPoints(userId: string): Promise<number> {
    // Get all GitHub stats
    const githubStats = await this.prisma.githubStat.aggregate({
      where: { userId },
      _sum: {
        commits: true,
        pullRequests: true,
        issues: true,
        reviews: true,
      },
    });

    // Get all CP stats (all platforms)
    const cpStats = await this.prisma.cpStat.aggregate({
      where: { userId },
      _sum: {
        easySolved: true,
        mediumSolved: true,
        hardSolved: true,
      },
    });

    // Get completed tasks
    const tasksCompleted = await this.prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    // Get completed missions
    const completedMissions = await this.prisma.userMission.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        mission: {
          select: {
            points: true,
          },
        },
      },
    });

    const missionPoints = completedMissions.reduce(
      (sum, um) => sum + (um.mission.points || 0),
      0
    );

    // Get user's current streak
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true },
    });

    // Calculate points from different sources
    const githubPoints = this.calculateGitHubPoints({
      commits: githubStats._sum.commits || 0,
      pullRequests: githubStats._sum.pullRequests || 0,
      issues: githubStats._sum.issues || 0,
      reviews: githubStats._sum.reviews || 0,
    });

    const cpPoints = this.calculateCPPoints({
      easySolved: cpStats._sum.easySolved || 0,
      mediumSolved: cpStats._sum.mediumSolved || 0,
      hardSolved: cpStats._sum.hardSolved || 0,
    });

    const taskPoints = tasksCompleted * PointsService.POINTS.TASK_COMPLETED;

    const streakBonus = user ? this.calculateStreakBonus(user.currentStreak) : 0;

    const totalPoints = githubPoints + cpPoints + taskPoints + missionPoints + streakBonus;

    // Update user's total points
    await this.prisma.user.update({
      where: { id: userId },
      data: { totalPoints },
    });

    this.logInfo('Total points calculated', { userId, totalPoints });

    return totalPoints;
  }

  /**
   * Get points breakdown
   */
  async getPointsBreakdown(userId: string) {
    // Get all stats
    const githubStats = await this.prisma.githubStat.aggregate({
      where: { userId },
      _sum: {
        commits: true,
        pullRequests: true,
        issues: true,
        reviews: true,
      },
    });

    const cpStats = await this.prisma.cpStat.aggregate({
      where: { userId },
      _sum: {
        easySolved: true,
        mediumSolved: true,
        hardSolved: true,
      },
    });

    const tasksCompleted = await this.prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    const completedMissions = await this.prisma.userMission.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        mission: {
          select: {
            points: true,
          },
        },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, totalPoints: true },
    });

    const githubPoints = this.calculateGitHubPoints({
      commits: githubStats._sum.commits || 0,
      pullRequests: githubStats._sum.pullRequests || 0,
      issues: githubStats._sum.issues || 0,
      reviews: githubStats._sum.reviews || 0,
    });

    const cpPoints = this.calculateCPPoints({
      easySolved: cpStats._sum.easySolved || 0,
      mediumSolved: cpStats._sum.mediumSolved || 0,
      hardSolved: cpStats._sum.hardSolved || 0,
    });

    const taskPoints = tasksCompleted * PointsService.POINTS.TASK_COMPLETED;

    const missionPoints = completedMissions.reduce(
      (sum, um) => sum + (um.mission.points || 0),
      0
    );

    const streakBonus = user ? this.calculateStreakBonus(user.currentStreak) : 0;

    return {
      totalPoints: user?.totalPoints || 0,
      breakdown: {
        github: githubPoints,
        competitiveProgramming: cpPoints,
        tasks: taskPoints,
        missions: missionPoints,
        streakBonus,
      },
    };
  }
}
