/**
 * Scoring Utilities Tests
 *
 * Tests for normalization and ranking logic
 */

import {
  normalizeMetric,
  rankUsers,
  calculateWeightedScore,
  extractMetricValue,
  aggregateScores,
} from '../src/utils/scoring';
import { Platform } from '@prisma/client';

describe('Scoring Utilities', () => {
  describe('normalizeMetric', () => {
    it('should normalize value to 0-100 scale', () => {
      expect(normalizeMetric(50, 0, 100)).toBe(50);
      expect(normalizeMetric(0, 0, 100)).toBe(0);
      expect(normalizeMetric(100, 0, 100)).toBe(100);
    });

    it('should handle edge cases', () => {
      expect(normalizeMetric(150, 0, 100)).toBe(100); // Clamp max
      expect(normalizeMetric(-50, 0, 100)).toBe(0);   // Clamp min
      expect(normalizeMetric(50, 50, 50)).toBe(0);    // Equal min/max
    });

    it('should normalize LeetCode rating correctly', () => {
      const normalized = normalizeMetric(1500, 0, 3000);
      expect(normalized).toBe(50);
    });

    it('should normalize Codeforces rating correctly', () => {
      const normalized = normalizeMetric(2000, 0, 4000);
      expect(normalized).toBe(50);
    });
  });

  describe('calculateWeightedScore', () => {
    it('should apply correct platform weights', () => {
      const leetcodeScore = calculateWeightedScore(Platform.LEETCODE, 50);
      expect(leetcodeScore).toBe(50); // Weight 1.0

      const codeforcesScore = calculateWeightedScore(Platform.CODEFORCES, 50);
      expect(codeforcesScore).toBe(60); // Weight 1.2

      const githubScore = calculateWeightedScore(Platform.GITHUB, 50);
      expect(githubScore).toBe(40); // Weight 0.8
    });
  });

  describe('rankUsers', () => {
    it('should rank users by score descending', () => {
      const users = [
        { userId: 'user1', score: 80 },
        { userId: 'user2', score: 90 },
        { userId: 'user3', score: 70 },
      ];

      const ranked = rankUsers(users);

      expect(ranked[0].userId).toBe('user2');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].userId).toBe('user1');
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].userId).toBe('user3');
      expect(ranked[2].rank).toBe(3);
    });

    it('should handle tied scores correctly', () => {
      const users = [
        { userId: 'user1', score: 90 },
        { userId: 'user2', score: 90 },
        { userId: 'user3', score: 80 },
      ];

      const ranked = rankUsers(users);

      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(1); // Same rank for tie
      expect(ranked[2].rank).toBe(3); // Next rank after tie
    });

    it('should be deterministic', () => {
      const users = [
        { userId: 'user1', score: 75 },
        { userId: 'user2', score: 85 },
        { userId: 'user3', score: 95 },
      ];

      const ranked1 = rankUsers(users);
      const ranked2 = rankUsers(users);

      expect(ranked1).toEqual(ranked2);
    });
  });

  describe('extractMetricValue', () => {
    it('should extract score field', () => {
      const metrics = { score: 1500 };
      expect(extractMetricValue(metrics)).toBe(1500);
    });

    it('should extract rating field', () => {
      const metrics = { rating: 2000 };
      expect(extractMetricValue(metrics)).toBe(2000);
    });

    it('should extract problemsSolved field', () => {
      const metrics = { problemsSolved: 450 };
      expect(extractMetricValue(metrics)).toBe(450);
    });

    it('should return null if no valid field found', () => {
      const metrics = { unknown: 123 };
      expect(extractMetricValue(metrics)).toBeNull();
    });

    it('should prioritize score over other fields', () => {
      const metrics = { score: 100, rating: 200, problemsSolved: 300 };
      expect(extractMetricValue(metrics)).toBe(100);
    });
  });

  describe('aggregateScores', () => {
    it('should aggregate scores across platforms', () => {
      const scores = [
        { platform: Platform.LEETCODE, score: 50 },
        { platform: Platform.CODEFORCES, score: 50 },
      ];

      const total = aggregateScores(scores);
      expect(total).toBe(110); // 50*1.0 + 50*1.2
    });

    it('should handle single platform', () => {
      const scores = [{ platform: Platform.LEETCODE, score: 75 }];
      expect(aggregateScores(scores)).toBe(75);
    });

    it('should handle empty array', () => {
      expect(aggregateScores([])).toBe(0);
    });
  });
});
