/**
 * Leaderboard Page
 *
 * Displays ranked users based on their platform scores
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface LeaderboardEntry {
  id: string;
  userId: string;
  platform: string | null;
  rank: number;
  score: number;
  computedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<string>('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [cached, setCached] = useState(false);

  const platforms = [
    { value: '', label: 'All Platforms' },
    { value: 'LEETCODE', label: 'LeetCode' },
    { value: 'CODEFORCES', label: 'Codeforces' },
    { value: 'CODECHEF', label: 'CodeChef' },
    { value: 'ATCODER', label: 'AtCoder' },
    { value: 'GITHUB', label: 'GitHub' },
  ];

  useEffect(() => {
    loadLeaderboard();
  }, [platform, limit, offset]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const params: any = { limit, offset };
      if (platform) params.platform = platform;

      const response = await apiClient.getLeaderboard(params);
      setEntries(response.data.leaderboard);
      setTotal(response.data.total || 0);
      setCached(response.data.cached || false);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const handlePreviousPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <p className="mt-2 text-gray-600">
          Top developers ranked by their coding performance
          {cached && (
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Cached
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setOffset(0);
              }}
              className="input"
            >
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Results per page
            </label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setOffset(0);
              }}
              className="input"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="ml-auto">
            <button
              onClick={loadLeaderboard}
              className="btn btn-primary"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No leaderboard data available yet.</p>
            <p className="text-sm mt-2">Users need to link accounts and have snapshots recorded.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`badge border ${getRankBadgeColor(entry.rank)} font-bold`}>
                            {getRankIcon(entry.rank)} #{entry.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {entry.user.username}
                          </div>
                          <div className="text-sm text-gray-500">{entry.user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge badge-primary">
                          {entry.platform || 'Global'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {entry.score.toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={offset === 0}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={offset + limit >= total}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
