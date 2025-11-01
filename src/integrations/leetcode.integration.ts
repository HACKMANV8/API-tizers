import { PrismaClient } from '@prisma/client';
import { BaseIntegration } from '../utils/base-integration';
import { config } from '../config';
import { NotFoundError, ServiceUnavailableError } from '../utils/errors';
import { startOfDay } from 'date-fns';

export interface LeetCodeUser {
  username: string;
  name: string;
  avatar: string;
  ranking: number;
  reputation: number;
  aboutMe: string;
  countryName: string;
  school: string | null;
  websites: string[];
  skillTags: string[];
}

export interface LeetCodeSolved {
  solvedProblem: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissionNum: {
    difficulty: string;
    count: number;
    submissions: number;
  }[];
  acSubmissionNum: {
    difficulty: string;
    count: number;
    submissions: number;
  }[];
}

export interface LeetCodeBadge {
  id: string;
  displayName: string;
  icon: string;
  creationDate: string;
}

export interface LeetCodeContest {
  contestAttend: number;
  contestRating: number;
  contestGlobalRanking: number;
  contestTopPercentage: number;
}

export interface LeetCodeSubmission {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
}

export class LeetCodeIntegration extends BaseIntegration {
  constructor(prisma: PrismaClient) {
    super(
      {
        baseURL: config.platforms.leetcode.apiUrl,
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
        },
      },
      prisma,
      'LeetCode'
    );
  }

  /**
   * Execute a GraphQL query
   */
  private async executeGraphQL<T>(query: string, variables: any = {}): Promise<T> {
    try {
      const response = await this.client.post('', {
        query,
        variables,
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.data?.errors) {
        throw new Error(error.response.data.errors[0].message);
      }
      throw error;
    }
  }

  /**
   * Fetch user profile data
   */
  async fetchUserData(connectionId: string): Promise<LeetCodeUser> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.platformUsername) {
      throw new NotFoundError('LeetCode connection not found');
    }

    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            realName
            userAvatar
            ranking
            reputation
            aboutMe
            countryName
            school
            websites
            skillTags
          }
        }
      }
    `;

    try {
      const data = await this.executeGraphQL<any>(query, {
        username: connection.platformUsername,
      });

      if (!data.matchedUser) {
        throw new NotFoundError('LeetCode user not found');
      }

      const user = data.matchedUser;
      const profile = user.profile;

      return {
        username: user.username,
        name: profile.realName || user.username,
        avatar: profile.userAvatar || '',
        ranking: profile.ranking || 0,
        reputation: profile.reputation || 0,
        aboutMe: profile.aboutMe || '',
        countryName: profile.countryName || '',
        school: profile.school,
        websites: profile.websites || [],
        skillTags: profile.skillTags || [],
      };
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('[LeetCode] Error fetching user data:', error);
      throw new ServiceUnavailableError('Failed to fetch LeetCode user data');
    }
  }

  /**
   * Fetch solved problems data
   */
  async fetchSolvedProblems(username: string): Promise<LeetCodeSolved> {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
            totalSubmissionNum {
              difficulty
              count
              submissions
            }
          }
        }
      }
    `;

    try {
      const data = await this.executeGraphQL<any>(query, { username });

      if (!data.matchedUser) {
        throw new Error('User not found');
      }

      const stats = data.matchedUser.submitStats;
      const acSubmissions = stats.acSubmissionNum;

      // Extract difficulty breakdown
      const allAC = acSubmissions.find((s: any) => s.difficulty === 'All') || { count: 0 };
      const easyAC = acSubmissions.find((s: any) => s.difficulty === 'Easy') || { count: 0 };
      const mediumAC = acSubmissions.find((s: any) => s.difficulty === 'Medium') || { count: 0 };
      const hardAC = acSubmissions.find((s: any) => s.difficulty === 'Hard') || { count: 0 };

      return {
        solvedProblem: allAC.count,
        easySolved: easyAC.count,
        mediumSolved: mediumAC.count,
        hardSolved: hardAC.count,
        totalSubmissionNum: stats.totalSubmissionNum,
        acSubmissionNum: stats.acSubmissionNum,
      };
    } catch (error) {
      this.logger.error('[LeetCode] Error fetching solved problems:', error);
      throw new ServiceUnavailableError('Failed to fetch LeetCode solved problems');
    }
  }

  /**
   * Fetch user badges
   */
  async fetchBadges(username: string): Promise<LeetCodeBadge[]> {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          badges {
            id
            displayName
            icon
            creationDate
          }
        }
      }
    `;

    try {
      const data = await this.executeGraphQL<any>(query, { username });

      if (!data.matchedUser || !data.matchedUser.badges) {
        return [];
      }

      return data.matchedUser.badges;
    } catch (error) {
      this.logger.error('[LeetCode] Error fetching badges:', error);
      return [];
    }
  }

  /**
   * Fetch contest information
   */
  async fetchContestInfo(username: string): Promise<LeetCodeContest | null> {
    const query = `
      query getUserProfile($username: String!) {
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          topPercentage
        }
      }
    `;

    try {
      const data = await this.executeGraphQL<any>(query, { username });

      if (!data.userContestRanking) {
        return null;
      }

      const contest = data.userContestRanking;

      return {
        contestAttend: contest.attendedContestsCount || 0,
        contestRating: contest.rating || 0,
        contestGlobalRanking: contest.globalRanking || 0,
        contestTopPercentage: contest.topPercentage || 0,
      };
    } catch (error) {
      this.logger.error('[LeetCode] Error fetching contest info:', error);
      return null;
    }
  }

  /**
   * Fetch recent submissions
   */
  async fetchSubmissions(username: string, limit: number = 15): Promise<LeetCodeSubmission[]> {
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

    try {
      const data = await this.executeGraphQL<any>(query, { username, limit });

      if (!data.recentSubmissionList) {
        return [];
      }

      return data.recentSubmissionList;
    } catch (error) {
      this.logger.error('[LeetCode] Error fetching submissions:', error);
      return [];
    }
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

      // Fetch all data in parallel
      const [userData, solvedData, badges, contestInfo] = await Promise.all([
        this.fetchUserData(connectionId),
        this.fetchSolvedProblems(connection.platformUsername),
        this.fetchBadges(connection.platformUsername),
        this.fetchContestInfo(connection.platformUsername),
      ]);

      const todayStart = startOfDay(new Date());

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
          problemsSolved: solvedData.solvedProblem,
          easySolved: solvedData.easySolved,
          mediumSolved: solvedData.mediumSolved,
          hardSolved: solvedData.hardSolved,
          contestsParticipated: contestInfo?.contestAttend || 0,
          rating: contestInfo?.contestRating || null,
          ranking: userData.ranking || null,
          totalProblemsSolved: solvedData.solvedProblem,
          problemsDetail: {
            username: userData.username,
            name: userData.name,
            avatar: userData.avatar,
            ranking: userData.ranking,
            reputation: userData.reputation,
            skillTags: userData.skillTags,
            badges: badges,
            contest: contestInfo,
            submissions: solvedData.totalSubmissionNum,
            acceptedSubmissions: solvedData.acSubmissionNum,
          },
        },
        update: {
          problemsSolved: solvedData.solvedProblem,
          easySolved: solvedData.easySolved,
          mediumSolved: solvedData.mediumSolved,
          hardSolved: solvedData.hardSolved,
          contestsParticipated: contestInfo?.contestAttend || 0,
          rating: contestInfo?.contestRating || null,
          ranking: userData.ranking || null,
          totalProblemsSolved: solvedData.solvedProblem,
          problemsDetail: {
            username: userData.username,
            name: userData.name,
            avatar: userData.avatar,
            ranking: userData.ranking,
            reputation: userData.reputation,
            skillTags: userData.skillTags,
            badges: badges,
            contest: contestInfo,
            submissions: solvedData.totalSubmissionNum,
            acceptedSubmissions: solvedData.acSubmissionNum,
          },
        },
      });

      await this.updateSyncStatus(connectionId, 'COMPLETED');
      this.logger.info('[LeetCode] Sync completed successfully', { userId, connectionId });
    } catch (error: any) {
      const safeErrorMsg = error?.message || error?.toString() || 'Unknown error during LeetCode sync';
      await this.updateSyncStatus(connectionId, 'FAILED', safeErrorMsg);
      this.logger.error('[LeetCode] Sync failed:', error);
      throw error;
    }
  }
}
