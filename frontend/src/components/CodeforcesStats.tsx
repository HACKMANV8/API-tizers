import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code, Trophy, Target, FileCode, Award, TrendingUp } from 'lucide-react';
import { platformsApi } from '@/lib/api';

interface CodeforcesConnection {
  id: string;
  platformUsername: string;
  lastSynced?: Date;
  syncStatus?: string;
}

interface CodeforcesStatsProps {
  connections: CodeforcesConnection[];
}

interface CodeforcesStatData {
  rating: number;
  problemsSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestsParticipated: number;
  totalProblemsSolved: number;
  problemsDetail?: any;
}

interface Submission {
  id: number;
  problem: {
    name: string;
    rating?: number;
    tags: string[];
  };
  verdict: string;
  programmingLanguage: string;
  creationTimeSeconds: number;
}

export function CodeforcesStats({ connections }: CodeforcesStatsProps) {
  const [selectedConnection, setSelectedConnection] = useState<string>(connections[0]?.id || '');

  // Fetch stats for selected connection
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['codeforces-stats', selectedConnection],
    queryFn: async () => {
      if (!selectedConnection) return null;
      const response = await platformsApi.getCodeforcesStats(selectedConnection);
      return response.data;
    },
    enabled: !!selectedConnection,
  });

  const stats = (statsData?.data || null) as CodeforcesStatData | null;

  // Fetch submissions for selected connection
  const {
    data: submissionsData,
    isLoading: submissionsLoading,
  } = useQuery({
    queryKey: ['codeforces-submissions', selectedConnection],
    queryFn: async () => {
      if (!selectedConnection) return null;
      const response = await platformsApi.getCodeforcesSubmissions(selectedConnection, 15);
      return response.data;
    },
    enabled: !!selectedConnection,
  });

  const submissions = (submissionsData?.data || []) as Submission[];

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
            No Codeforces accounts connected. Connect one to see your stats!
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRankBadge = (rating: number) => {
    if (rating >= 3000) return { name: 'Legendary Grandmaster', color: 'text-red-500' };
    if (rating >= 2600) return { name: 'International Grandmaster', color: 'text-red-500' };
    if (rating >= 2400) return { name: 'Grandmaster', color: 'text-red-500' };
    if (rating >= 2300) return { name: 'International Master', color: 'text-orange-500' };
    if (rating >= 2100) return { name: 'Master', color: 'text-orange-500' };
    if (rating >= 1900) return { name: 'Candidate Master', color: 'text-purple' };
    if (rating >= 1600) return { name: 'Expert', color: 'text-blue-500' };
    if (rating >= 1400) return { name: 'Specialist', color: 'text-cyan' };
    if (rating >= 1200) return { name: 'Pupil', color: 'text-green-500' };
    return { name: 'Newbie', color: 'text-gray-500' };
  };

  const getVerdictColor = (verdict: string) => {
    if (verdict === 'OK') return 'text-green-500';
    if (verdict.includes('WRONG')) return 'text-red-500';
    if (verdict.includes('TIME')) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const rank = stats?.rating ? getRankBadge(stats.rating) : { name: 'Unrated', color: 'text-gray-500' };

  return (
    <Card className="glass-card border-border/50 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="text-orange-500" size={24} />
            <span>Codeforces Stats</span>
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
                  <Trophy className="h-4 w-4 text-purple" />
                  <span className="text-sm text-muted-foreground">Rating</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.rating ?? 0}</div>
              </div>

              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-cyan" />
                  <span className="text-sm text-muted-foreground">Contests</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.contestsParticipated ?? 0}</div>
              </div>

              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="h-4 w-4 text-purple" />
                  <span className="text-sm text-muted-foreground">Solved</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.problemsSolved ?? 0}</div>
              </div>
            </div>

            {/* Rank and Difficulty Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-cyan" />
                  <span className="text-sm font-medium text-foreground">Rank</span>
                </div>
                <p className={`text-lg font-bold ${rank.color}`}>{rank.name}</p>
              </div>

              <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-purple" />
                  <span className="text-sm font-medium text-foreground">Difficulty</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-500">Easy: {stats.easySolved ?? 0}</span>
                  <span className="text-yellow-500">Med: {stats.mediumSolved ?? 0}</span>
                  <span className="text-red-500">Hard: {stats.hardSolved ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileCode className="h-4 w-4" />
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
                        key={submission.id || index}
                        className="flex items-center justify-between p-3 border-b border-border/20 last:border-0 hover:bg-surface-light/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {submission.problem.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(submission.creationTimeSeconds)} • {submission.programmingLanguage}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {submission.problem.rating && (
                            <span className="text-xs text-cyan">★{submission.problem.rating}</span>
                          )}
                          <span className={`text-xs font-medium ${getVerdictColor(submission.verdict)}`}>
                            {submission.verdict}
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
