import { Request, Response } from 'express';
import { BaseController } from '../utils/base-controller';
import { prisma } from '../config/database';
import { ResponseHandler } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth.middleware';

export class UserController extends BaseController {
  constructor() {
    super();
  }

  /**
   * GET /api/v1/users/activity
   * Get user's recent activity feed
   */
  getActivity = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId!;
    const limit = parseInt(req.query.limit as string) || 20;

    // Fetch recent activities from various sources
    const activities: any[] = [];

    // 1. Recent GitHub commits
    const recentGithubStats = await prisma.githubStat.findMany({
      where: {
        userId,
        commits: { gt: 0 },
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    recentGithubStats.forEach((stat) => {
      activities.push({
        type: 'github_commit',
        icon: 'GitCommit',
        title: `Made ${stat.commits} commit${stat.commits > 1 ? 's' : ''} on GitHub`,
        subtitle: 'GitHub Activity',
        time: stat.date.toISOString(),
        color: 'text-purple-400',
        metadata: {
          commits: stat.commits,
          pullRequests: stat.pullRequests,
          issues: stat.issues,
        },
      });
    });

    // 2. Recent problem solving
    const recentCpStats = await prisma.cpStat.findMany({
      where: {
        userId,
        problemsSolved: { gt: 0 },
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    recentCpStats.forEach((stat) => {
      activities.push({
        type: 'problem_solved',
        icon: 'Code',
        title: `Solved ${stat.problemsSolved} coding problem${stat.problemsSolved > 1 ? 's' : ''}`,
        subtitle: `${stat.platform} • ${stat.easySolved} easy, ${stat.mediumSolved} medium, ${stat.hardSolved} hard`,
        time: stat.date.toISOString(),
        color: 'text-cyan-400',
        metadata: {
          platform: stat.platform,
          easy: stat.easySolved,
          medium: stat.mediumSolved,
          hard: stat.hardSolved,
        },
      });
    });

    // 3. Recent task completions
    const recentTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    recentTasks.forEach((task) => {
      activities.push({
        type: 'task_completed',
        icon: 'CheckCircle',
        title: `Completed task: ${task.title}`,
        subtitle: `${task.source} • Priority: ${task.priority}`,
        time: task.completedAt!.toISOString(),
        color: 'text-green-400',
        metadata: {
          source: task.source,
          priority: task.priority,
        },
      });
    });

    // 4. Recent mission completions
    const recentMissions = await prisma.userMission.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      include: {
        mission: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    recentMissions.forEach((userMission) => {
      activities.push({
        type: 'mission_completed',
        icon: 'Trophy',
        title: `Completed mission: ${userMission.mission.title}`,
        subtitle: `Earned ${userMission.pointsEarned || 0} points • ${userMission.mission.type}`,
        time: userMission.completedAt!.toISOString(),
        color: 'text-yellow-400',
        metadata: {
          points: userMission.pointsEarned,
          type: userMission.mission.type,
        },
      });
    });

    // Sort all activities by time and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);

    return ResponseHandler.success(res, sortedActivities, 'Activity feed retrieved successfully');
  };

  /**
   * GET /api/v1/users/stats
   * Get user's overall stats (level, XP, rank, badge)
   */
  getStats = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId!;

    // Get user basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Calculate level from total points (100 points per level)
    const level = Math.floor(user.totalPoints / 100);
    const currentLevelPoints = user.totalPoints % 100;
    const nextLevelPoints = 100;

    // Get user's rank from leaderboard
    const leaderboardEntry = await prisma.leaderboard.findFirst({
      where: {
        userId,
        period: 'ALL_TIME',
      },
      orderBy: {
        calculatedAt: 'desc',
      },
    });

    // Determine badge based on rank
    let badge = null;
    if (leaderboardEntry?.rank) {
      if (leaderboardEntry.rank === 1) {
        badge = 'gold';
      } else if (leaderboardEntry.rank === 2) {
        badge = 'silver';
      } else if (leaderboardEntry.rank === 3) {
        badge = 'bronze';
      } else if (leaderboardEntry.rank <= 10) {
        badge = 'purple';
      } else if (leaderboardEntry.rank <= 50) {
        badge = 'blue';
      }
    }

    const stats = {
      userId: user.id,
      username: user.username,
      level,
      currentLevelPoints,
      nextLevelPoints,
      totalPoints: user.totalPoints,
      rank: leaderboardEntry?.rank || null,
      badge,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
    };

    return ResponseHandler.success(res, stats, 'User stats retrieved successfully');
  };

  /**
   * GET /api/v1/users/platforms
   * Get user's connected platforms status
   */
  getPlatforms = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId!;

    // Get all platform connections for the user
    const connections = await prisma.platformConnection.findMany({
      where: { userId },
      select: {
        platform: true,
        platformUsername: true,
        isActive: true,
        lastSynced: true,
        syncStatus: true,
      },
    });

    // Define all available platforms
    const allPlatforms = [
      { platform: 'GITHUB', name: 'GitHub', icon: 'github' },
      { platform: 'LEETCODE', name: 'LeetCode', icon: 'code' },
      { platform: 'CODEFORCES', name: 'Codeforces', icon: 'terminal' },
      { platform: 'GOOGLE_CALENDAR', name: 'Google Calendar', icon: 'calendar' },
      { platform: 'MS_CALENDAR', name: 'Microsoft Calendar', icon: 'calendar' },
      { platform: 'OPENPROJECT', name: 'OpenProject', icon: 'briefcase' },
      { platform: 'SLACK', name: 'Slack', icon: 'message-circle' },
    ];

    // Map connections to platform status
    const platformStatus = allPlatforms.map((plat) => {
      const connection = connections.find((conn) => conn.platform === plat.platform);
      return {
        platform: plat.platform,
        name: plat.name,
        icon: plat.icon,
        connected: !!connection && connection.isActive,
        username: connection?.platformUsername || null,
        lastSynced: connection?.lastSynced || null,
        syncStatus: connection?.syncStatus || null,
      };
    });

    return ResponseHandler.success(res, platformStatus, 'Platform status retrieved successfully');
  };
}
