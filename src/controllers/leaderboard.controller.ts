import { Request, Response } from 'express';
import { BaseController } from '../utils/base-controller';
import { LeaderboardService } from '../services/leaderboard/leaderboard.service';
import prisma from '../config/database';
import { ResponseHandler } from '../utils/response';
import { BadRequestError } from '../utils/errors';

export class LeaderboardController extends BaseController {
  private leaderboardService: LeaderboardService;

  constructor() {
    super();
    this.leaderboardService = new LeaderboardService(prisma);
  }

  /**
   * GET /api/v1/leaderboard
   * Get leaderboard rankings
   */
  getLeaderboard = async (req: Request, res: Response) => {
    const period = (req.query.period as string) || 'ALL_TIME';
    const limit = parseInt(req.query.limit as string) || 100;

    // Validate period
    const validPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestError('Invalid period. Must be one of: DAILY, WEEKLY, MONTHLY, ALL_TIME');
    }

    // Validate limit
    if (limit < 1 || limit > 500) {
      throw new BadRequestError('Limit must be between 1 and 500');
    }

    const leaderboard = await this.leaderboardService.getLeaderboard(
      period as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME',
      limit
    );

    return ResponseHandler.success(res, leaderboard, 'Leaderboard retrieved successfully');
  };

  /**
   * GET /api/v1/leaderboard/user/:userId
   * Get specific user's rank and stats
   */
  getUserRank = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const period = (req.query.period as string) || 'ALL_TIME';

    // Validate period
    const validPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestError('Invalid period. Must be one of: DAILY, WEEKLY, MONTHLY, ALL_TIME');
    }

    const userRank = await this.leaderboardService.getUserRank(
      userId,
      period as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'
    );

    if (!userRank) {
      return ResponseHandler.success(res, null, 'User not found in leaderboard');
    }

    return ResponseHandler.success(res, userRank, 'User rank retrieved successfully');
  };

  /**
   * POST /api/v1/leaderboard/refresh
   * Manually refresh leaderboard (admin/scheduled job)
   */
  refreshLeaderboard = async (req: Request, res: Response) => {
    const period = (req.body.period as string) || 'ALL_TIME';

    // Validate period
    const validPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestError('Invalid period. Must be one of: DAILY, WEEKLY, MONTHLY, ALL_TIME');
    }

    const leaderboard = await this.leaderboardService.calculateLeaderboard(
      period as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'
    );

    return ResponseHandler.success(res, leaderboard, 'Leaderboard refreshed successfully');
  };
}
