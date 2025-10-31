/**
 * Scoring Utilities
 *
 * Provides normalization and ranking logic for leaderboard computation
 */

import { Platform } from '@prisma/client';

/**
 * Platform-specific score weights
 * TODO: Adjust these weights based on platform difficulty and community consensus
 */
export const PLATFORM_WEIGHTS: Record<Platform, number> = {
  LEETCODE: 1.0,
  CODEFORCES: 1.2,   // Slightly higher weight for competitive programming
  CODECHEF: 1.0,
  ATCODER: 1.1,
  GITHUB: 0.8,       // Lower weight as contributions are easier to accumulate
};

/**
 * Normalize a metric value to 0-100 scale
 *
 * @param value - The raw metric value
 * @param min - Minimum possible value (usually 0)
 * @param max - Maximum expected value for the metric
 * @returns Normalized score between 0 and 100
 *
 * Example:
 *   normalizeMetric(1500, 0, 3000) = 50
 *   normalizeMetric(3000, 0, 3000) = 100
 */
export function normalizeMetric(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized)); // Clamp between 0-100
}

/**
 * Platform-specific maximum values for normalization
 * TODO: Update these based on actual platform data distributions
 */
export const PLATFORM_MAX_VALUES: Record<Platform, number> = {
  LEETCODE: 3000,      // Max rating ~3000
  CODEFORCES: 4000,    // Max rating ~4000
  CODECHEF: 3000,      // Max rating ~3000
  ATCODER: 4000,       // Max rating ~4000
  GITHUB: 10000,       // Max contributions per year ~10000
};

/**
 * Calculate weighted score for a platform
 *
 * @param platform - The platform type
 * @param normalizedScore - Score already normalized to 0-100
 * @returns Weighted score
 */
export function calculateWeightedScore(platform: Platform, normalizedScore: number): number {
  const weight = PLATFORM_WEIGHTS[platform] || 1.0;
  return normalizedScore * weight;
}

/**
 * Aggregate scores across multiple platforms
 *
 * @param scores - Array of { platform, score } objects
 * @returns Total aggregated score
 */
export function aggregateScores(scores: Array<{ platform: Platform; score: number }>): number {
  return scores.reduce((total, { platform, score }) => {
    return total + calculateWeightedScore(platform, score);
  }, 0);
}

/**
 * Rank users deterministically based on scores
 * Users with same score get the same rank
 *
 * @param users - Array of users with scores
 * @returns Array of users with assigned ranks
 */
export function rankUsers<T extends { score: number }>(
  users: T[]
): Array<T & { rank: number }> {
  // Sort by score descending
  const sorted = [...users].sort((a, b) => b.score - a.score);

  // Assign ranks (users with same score get same rank)
  let currentRank = 1;
  let previousScore: number | null = null;

  return sorted.map((user, index) => {
    if (previousScore !== null && user.score < previousScore) {
      currentRank = index + 1;
    }
    previousScore = user.score;

    return {
      ...user,
      rank: currentRank,
    };
  });
}

/**
 * Extract metric value from snapshot JSON
 * Tries common field names across platforms
 *
 * @param metrics - Raw metrics JSON from snapshot
 * @returns Extracted numeric metric or null
 *
 * TODO: Add platform-specific field extraction logic
 */
export function extractMetricValue(metrics: any): number | null {
  // Try common field names
  if (typeof metrics.score === 'number') return metrics.score;
  if (typeof metrics.rating === 'number') return metrics.rating;
  if (typeof metrics.problemsSolved === 'number') return metrics.problemsSolved;
  if (typeof metrics.rank === 'number') return metrics.rank;
  if (typeof metrics.contributions === 'number') return metrics.contributions;

  return null;
}
