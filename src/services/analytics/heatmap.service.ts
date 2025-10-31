import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../utils/base-service';
import { startOfDay, subDays, format } from 'date-fns';

export interface HeatmapData {
  date: string;
  activityScore: number;
  githubCommits: number;
  problemsSolved: number;
  tasksCompleted: number;
  calendarEvents: number;
  totalActivities: number;
}

/**
 * Heatmap Service
 * Calculates and manages activity heatmap data
 */
export class HeatmapService extends BaseService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Calculate activity score based on activities
   */
  private calculateActivityScore(data: {
    githubCommits: number;
    problemsSolved: number;
    tasksCompleted: number;
    calendarEvents: number;
  }): number {
    // Weighted scoring system
    const weights = {
      githubCommit: 5,
      problem: 10,
      task: 3,
      event: 1,
    };

    return (
      data.githubCommits * weights.githubCommit +
      data.problemsSolved * weights.problem +
      data.tasksCompleted * weights.task +
      data.calendarEvents * weights.event
    );
  }

  /**
   * Update heatmap for a specific date
   */
  async updateHeatmap(userId: string, date: Date): Promise<void> {
    const dayStart = startOfDay(date);

    // Aggregate GitHub stats for the day
    const githubStats = await this.prisma.githubStat.aggregate({
      where: {
        userId,
        date: dayStart,
      },
      _sum: {
        commits: true,
      },
    });

    // Aggregate CP stats for the day
    const cpStats = await this.prisma.cpStat.aggregate({
      where: {
        userId,
        date: dayStart,
      },
      _sum: {
        problemsSolved: true,
      },
    });

    // Aggregate tasks completed for the day
    const tasksCompleted = await this.prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: dayStart,
          lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    // Calculate totals
    const githubCommits = githubStats._sum.commits || 0;
    const problemsSolved = cpStats._sum.problemsSolved || 0;
    const calendarEvents = 0; // TODO: Aggregate from calendar integrations
    const totalActivities = githubCommits + problemsSolved + tasksCompleted + calendarEvents;

    // Calculate activity score
    const activityScore = this.calculateActivityScore({
      githubCommits,
      problemsSolved,
      tasksCompleted,
      calendarEvents,
    });

    // Upsert heatmap data
    await this.prisma.activityHeatmap.upsert({
      where: {
        userId_date: {
          userId,
          date: dayStart,
        },
      },
      create: {
        userId,
        date: dayStart,
        activityScore,
        githubCommits,
        problemsSolved,
        tasksCompleted,
        calendarEvents,
        totalActivities,
      },
      update: {
        activityScore,
        githubCommits,
        problemsSolved,
        tasksCompleted,
        calendarEvents,
        totalActivities,
      },
    });

    this.logInfo('Heatmap updated', { userId, date: dayStart });
  }

  /**
   * Get heatmap data for a date range
   */
  async getHeatmap(userId: string, days: number = 365): Promise<HeatmapData[]> {
    const endDate = startOfDay(new Date());
    const startDate = subDays(endDate, days);

    const heatmapData = await this.prisma.activityHeatmap.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return heatmapData.map((data) => ({
      date: format(data.date, 'yyyy-MM-dd'),
      activityScore: data.activityScore,
      githubCommits: data.githubCommits,
      problemsSolved: data.problemsSolved,
      tasksCompleted: data.tasksCompleted,
      calendarEvents: data.calendarEvents,
      totalActivities: data.totalActivities,
    }));
  }

  /**
   * Get total activity summary
   */
  async getActivitySummary(userId: string, days: number = 30) {
    const endDate = startOfDay(new Date());
    const startDate = subDays(endDate, days);

    const summary = await this.prisma.activityHeatmap.aggregate({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        activityScore: true,
        githubCommits: true,
        problemsSolved: true,
        tasksCompleted: true,
        calendarEvents: true,
        totalActivities: true,
      },
      _avg: {
        activityScore: true,
      },
    });

    // Count active days
    const activeDays = await this.prisma.activityHeatmap.count({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        totalActivities: {
          gt: 0,
        },
      },
    });

    return {
      totalActivityScore: summary._sum.activityScore || 0,
      averageActivityScore: Math.round(summary._avg.activityScore || 0),
      totalCommits: summary._sum.githubCommits || 0,
      totalProblemsSolved: summary._sum.problemsSolved || 0,
      totalTasksCompleted: summary._sum.tasksCompleted || 0,
      totalEvents: summary._sum.calendarEvents || 0,
      totalActivities: summary._sum.totalActivities || 0,
      activeDays,
      period: days,
    };
  }
}
