import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code2, Trophy, Target, Award, TrendingUp, Medal } from 'lucide-react';
import { platformsApi } from '@/lib/api';

interface LeetCodeConnection {
  id: string;
  platformUsername: string;
  lastSynced?: Date;
  syncStatus?: string;
}

interface LeetCodeStatsProps {
  connections: LeetCodeConnection[];
}

interface LeetCodeStatData {
  rating: number | null;
  ranking: number | null;
  problemsSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestsParticipated: number;
  totalProblemsSolved: number;
  problemsDetail?: {
    username: string;
    name: string;
    avatar: string;
    ranking: number;
    reputation: number;
    badges: any[];
    contest: {
      contestRating: number;
      contestGlobalRanking: number;
      contestTopPercentage: number;
    };
  };
}

interface LeetCodeSubmission {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
}

export function LeetCodeStats({ connections }: LeetCodeStatsProps) {
  const [selectedConnection, setSelectedConnection] = useState<string>(connections[0]?.id || '');

  // Fetch stats for selected connection
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['leetcode-stats', selectedConnection],
    queryFn: async () => {
      if (!selectedConnection) return null;
      const response = await platformsApi.getLeetCodeStats(selectedConnection);
      return response.data;
    },
    enabled: !!selectedConnection,
  });

  const stats = (statsData?.data || null) as LeetCodeStatData | null;

  // Fetch submissions for selected connection
  const {
    data: submissionsData,
    isLoading: submissionsLoading,
  } = useQuery({
    queryKey: ['leetcode-submissions', selectedConnection],
    queryFn: async () => {
      if (!selectedConnection) return null;
      const response = await platformsApi.getLeetCodeSubmissions(selectedConnection, 15);
      return response.data;
    },
    enabled: !!selectedConnection,
  });

  const submissions = (submissionsData?.data || []) as LeetCodeSubmission[];

  // Auto-select first connection
  useEffect(() => {
    if (connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0].id);
    }
  }, [connections, selectedConnection]);

  if (connections.length === 0) {
    return (
      <Card className="glass-card border-border/50 h-full flex flex-col">
        <CardContent className="pt-6 flex-1">
          <p className="text-sm text-muted-foreground text-center">
            No LeetCode accounts connected. Connect one to see your stats!
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'Accepted') return 'text-green-500';
    if (status.includes('Wrong')) return 'text-red-500';
    if (status.includes('Time')) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card className="glass-card border-border/50 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="text-yellow-500" size={24} />
            <span>LeetCode Stats</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex-1">
        {/* Connection Selector */}
        {connections.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Select Account</label>
            <Select value={selectedConnection} onValueChange={setSelectedConnection}>
              <SelectTrigger className="bg-surface-light/50 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    @{conn.platformUsername}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {statsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading stats...</div>
        ) : statsError ? (
          <div className="text-center py-8 text-red-500">Failed to load stats</div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-cyan" />
                  <span className="text-sm text-muted-foreground">Problems</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.totalProblemsSolved ?? 0}</div>
              </div>

              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple" />
                  <span className="text-sm text-muted-foreground">Ranking</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.ranking ? `#${stats.ranking.toLocaleString()}` : 'N/A'}
                </div>
              </div>

              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-cyan" />
                  <span className="text-sm text-muted-foreground">Contests</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.contestsParticipated ?? 0}</div>
              </div>

              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Medal className="h-4 w-4 text-purple" />
                  <span className="text-sm text-muted-foreground">Rating</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.rating ? Math.round(stats.rating) : 'N/A'}
                </div>
              </div>
            </div>

            {/* Difficulty Breakdown and Contest Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-purple" />
                  <span className="text-sm font-medium text-foreground">Difficulty Breakdown</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-500">Easy: {stats.easySolved ?? 0}</span>
                  <span className="text-yellow-500">Med: {stats.mediumSolved ?? 0}</span>
                  <span className="text-red-500">Hard: {stats.hardSolved ?? 0}</span>
                </div>
              </div>

              {stats.problemsDetail?.contest && (
                <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="h-4 w-4 text-cyan" />
                    <span className="text-sm font-medium text-foreground">Contest Performance</span>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      Top{' '}
                      <span className="text-cyan font-semibold">
                        {stats.problemsDetail.contest.contestTopPercentage?.toFixed(2)}%
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Badges */}
            {stats.problemsDetail?.badges && stats.problemsDetail.badges.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Badges ({stats.problemsDetail.badges.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.problemsDetail.badges.slice(0, 6).map((badge: any, index: number) => (
                    <div
                      key={index}
                      className="bg-surface-light/50 border border-border/30 rounded-lg px-3 py-2 flex items-center gap-2"
                      title={badge.displayName}
                    >
                      <img src={badge.icon} alt={badge.displayName} className="w-6 h-6" />
                      <span className="text-xs text-muted-foreground">{badge.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Submissions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Recent Submissions
              </h3>

              {submissionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading submissions...</p>
              ) : submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent submissions</p>
              ) : (
                <div className="bg-surface-light/30 border border-border/30 rounded-lg overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    {submissions.map((submission, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border-b border-border/20 last:border-0 hover:bg-surface-light/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {submission.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(submission.timestamp)} " {submission.lang}
                          </p>
                        </div>
                        <div className="ml-4">
                          <span className={`text-xs font-medium ${getStatusColor(submission.statusDisplay)}`}>
                            {submission.statusDisplay}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No stats available</div>
        )}
      </CardContent>
    </Card>
  );
}
