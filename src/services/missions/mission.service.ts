import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../utils/base-service';
import { NotFoundError } from '../../utils/errors';

/**
 * Mission Service
 * Manages user missions and progress tracking
 */
export class MissionService extends BaseService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Get daily missions for user
   */
  async getDailyMissions(userId: string) {
    const missions = await this.prisma.mission.findMany({
      where: {
        type: 'DAILY',
        isActive: true,
      },
    });

    // Get user's progress for these missions
    const userMissions = await this.prisma.userMission.findMany({
      where: {
        userId,
        missionId: { in: missions.map((m) => m.id) },
      },
    });

    return missions.map((mission) => {
      const userMission = userMissions.find((um) => um.missionId === mission.id);
      return {
        ...mission,
        userStatus: userMission?.status || 'ASSIGNED',
        progress: userMission?.progress || {},
        pointsEarned: userMission?.pointsEarned || 0,
      };
    });
  }

  /**
   * Get weekly missions for user
   */
  async getWeeklyMissions(userId: string) {
    const missions = await this.prisma.mission.findMany({
      where: {
        type: 'WEEKLY',
        isActive: true,
      },
    });

    const userMissions = await this.prisma.userMission.findMany({
      where: {
        userId,
        missionId: { in: missions.map((m) => m.id) },
      },
    });

    return missions.map((mission) => {
      const userMission = userMissions.find((um) => um.missionId === mission.id);
      return {
        ...mission,
        userStatus: userMission?.status || 'ASSIGNED',
        progress: userMission?.progress || {},
        pointsEarned: userMission?.pointsEarned || 0,
      };
    });
  }

  /**
   * Update mission progress
   * TODO: Implement progress tracking logic based on user activities
   */
  async updateProgress(userId: string, missionId: string, progress: any) {
    await this.prisma.userMission.upsert({
      where: {
        userId_missionId: {
          userId,
          missionId,
        },
      },
      create: {
        userId,
        missionId,
        status: 'IN_PROGRESS',
        progress,
      },
      update: {
        status: 'IN_PROGRESS',
        progress,
      },
    });
  }

  /**
   * Claim mission rewards
   */
  async claimReward(userId: string, missionId: string) {
    const userMission = await this.prisma.userMission.findUnique({
      where: {
        userId_missionId: {
          userId,
          missionId,
        },
      },
      include: {
        mission: true,
      },
    });

    if (!userMission) {
      throw new NotFoundError('Mission not found');
    }

    if (userMission.status !== 'COMPLETED') {
      throw new Error('Mission not completed');
    }

    // Award points to user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: {
          increment: userMission.mission.points,
        },
      },
    });

    // Mark points as earned
    await this.prisma.userMission.update({
      where: {
        userId_missionId: {
          userId,
          missionId,
        },
      },
      data: {
        pointsEarned: userMission.mission.points,
      },
    });

    return { pointsEarned: userMission.mission.points };
  }
}
