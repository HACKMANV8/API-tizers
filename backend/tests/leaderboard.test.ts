/**
 * Leaderboard Computation Tests
 *
 * Tests for leaderboard ranking and caching logic
 */

import { rankUsers, normalizeMetric } from '../src/utils/scoring';

describe('Leaderboard Computation', () => {
  describe('Multi-user ranking', () => {
    it('should rank multiple users correctly', () => {
      const users = [
        { userId: '1', username: 'alice', score: 85.5 },
        { userId: '2', username: 'bob', score: 92.3 },
        { userId: '3', username: 'charlie', score: 78.1 },
        { userId: '4', username: 'diana', score: 92.3 },
        { userId: '5', username: 'eve', score: 88.0 },
      ];

      const ranked = rankUsers(users);

      // Check top 3
      expect(ranked[0].username).toBe('bob');
      expect(ranked[0].rank).toBe(1);

      expect(ranked[1].username).toBe('diana');
      expect(ranked[1].rank).toBe(1); // Tied with bob

      expect(ranked[2].username).toBe('eve');
      expect(ranked[2].rank).toBe(3);
    });

    it('should handle all users with same score', () => {
      const users = [
        { userId: '1', score: 50 },
        { userId: '2', score: 50 },
        { userId: '3', score: 50 },
      ];

      const ranked = rankUsers(users);

      expect(ranked.every((u) => u.rank === 1)).toBe(true);
    });
  });

  describe('Score normalization for leaderboard', () => {
    it('should normalize platform snapshots consistently', () => {
      // Simulate normalizing snapshots from different platforms
      const leetcodeScore = normalizeMetric(2100, 0, 3000); // LeetCode
      const codeforcesScore = normalizeMetric(1650, 0, 4000); // Codeforces
      const githubScore = normalizeMetric(1200, 0, 10000); // GitHub

      expect(leetcodeScore).toBe(70.0);
      expect(codeforcesScore).toBe(41.25);
      expect(githubScore).toBe(12.0);

      // Average across platforms
      const avgScore = (leetcodeScore + codeforcesScore + githubScore) / 3;
      expect(avgScore).toBeCloseTo(41.08, 1);
    });
  });

  describe('Leaderboard computation flow', () => {
    it('should compute correct final leaderboard', () => {
      // Simulate complete leaderboard computation
      interface UserData {
        userId: string;
        username: string;
        platforms: Array<{ platform: string; rawScore: number; maxValue: number }>;
      }

      const userData: UserData[] = [
        {
          userId: '1',
          username: 'alice',
          platforms: [
            { platform: 'LEETCODE', rawScore: 2100, maxValue: 3000 },
            { platform: 'GITHUB', rawScore: 1200, maxValue: 10000 },
          ],
        },
        {
          userId: '2',
          username: 'bob',
          platforms: [
            { platform: 'CODEFORCES', rawScore: 1650, maxValue: 4000 },
            { platform: 'LEETCODE', rawScore: 1800, maxValue: 3000 },
          ],
        },
        {
          userId: '3',
          username: 'charlie',
          platforms: [{ platform: 'ATCODER', rawScore: 1200, maxValue: 4000 }],
        },
      ];

      // Normalize and compute average scores
      const scoredUsers = userData.map((user) => {
        const normalizedScores = user.platforms.map((p) =>
          normalizeMetric(p.rawScore, 0, p.maxValue)
        );
        const avgScore =
          normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;

        return {
          userId: user.userId,
          username: user.username,
          score: avgScore,
        };
      });

      // Rank users
      const leaderboard = rankUsers(scoredUsers);

      // Assertions
      expect(leaderboard.length).toBe(3);
      expect(leaderboard[0].username).toBe('bob'); // Highest avg score
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].username).toBe('alice');
      expect(leaderboard[2].username).toBe('charlie');
    });
  });

  describe('Empty and edge cases', () => {
    it('should handle empty user list', () => {
      const ranked = rankUsers([]);
      expect(ranked).toEqual([]);
    });

    it('should handle single user', () => {
      const users = [{ userId: '1', score: 50 }];
      const ranked = rankUsers(users);

      expect(ranked.length).toBe(1);
      expect(ranked[0].rank).toBe(1);
    });

    it('should handle zero scores', () => {
      const users = [
        { userId: '1', score: 0 },
        { userId: '2', score: 10 },
        { userId: '3', score: 0 },
      ];

      const ranked = rankUsers(users);

      expect(ranked[0].score).toBe(10);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].rank).toBe(2); // Both zeros tied
    });
  });
});
