import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../utils/base-service';
import { startOfDay, subDays, addDays, differenceInDays } from 'date-fns';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
}

/**
 * Streaks Service
 * Calculates and manages user activity streaks
 */
export class StreaksService extends BaseService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Calculate current and longest streaks
   */
  async calculateStreaks(userId: string): Promise<StreakInfo> {
    const today = startOfDay(new Date());

    // Get all activity days (sorted desc)
    const activityDays = await this.prisma.activityHeatmap.findMany({
      where: {
        userId,
        totalActivities: {
          gt: 0,
        },
      },
      select: {
        date: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (activityDays.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    const dates = activityDays.map((d) => startOfDay(d.date));
    const lastActivityDate = dates[0];

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = today;

    // Check if user was active today or yesterday (streak is still alive)
    const daysSinceLastActivity = differenceInDays(today, lastActivityDate);
    if (daysSinceLastActivity > 1) {
      // Streak is broken
      currentStreak = 0;
    } else {
      // Calculate consecutive days from today backwards
      for (const date of dates) {
        if (differenceInDays(checkDate, date) === 0) {
          currentStreak++;
          checkDate = subDays(checkDate, 1);
        } else if (differenceInDays(checkDate, date) === 1) {
          // There might be a gap, check if it's consecutive
          currentStreak++;
          checkDate = subDays(date, 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < dates.length - 1; i++) {
      const currentDate = dates[i];
      const nextDate = dates[i + 1];
      const daysDiff = differenceInDays(currentDate, nextDate);

      if (daysDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    longestStreak = Math.max(longestStreak, currentStreak);

    // Update user's streak data
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak,
        longestStreak,
      },
    });

    this.logInfo('Streaks calculated', { userId, currentStreak, longestStreak });

    return {
      currentStreak,
      longestStreak,
      lastActivityDate,
    };
  }

  /**
   * Check if user has activity today
   */
  async hasActivityToday(userId: string): Promise<boolean> {
    const today = startOfDay(new Date());

    const activity = await this.prisma.activityHeatmap.findFirst({
      where: {
        userId,
        date: today,
        totalActivities: {
          gt: 0,
        },
      },
    });

    return !!activity;
  }

  /**
   * Get streak statistics
   */
  async getStreakStats(userId: string) {
    const streaks = await this.calculateStreaks(userId);
    const hasToday = await this.hasActivityToday(userId);

    return {
      ...streaks,
      isActiveToday: hasToday,
      streakStatus: streaks.currentStreak > 0 ? 'active' : 'broken',
    };
  }
}
