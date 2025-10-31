import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { platformsApi } from '../lib/api';
import { Github, GitBranch, GitCommit, Loader2, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface GitHubConnection {
  id: string;
  platformUsername: string;
  lastSynced: string | null;
  syncStatus: string;
}

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stargazersCount: number;
  forksCount: number;
  htmlUrl: string;
  updatedAt: string;
}

interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  htmlUrl: string;
}

interface GitHubStatsProps {
  connections: GitHubConnection[];
}

export function GitHubStats({ connections }: GitHubStatsProps) {
  const [selectedConnection, setSelectedConnection] = useState<string>(connections[0]?.id || '');
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    until: new Date().toISOString(),
  });

  // Fetch repositories for selected connection
  const {
    data: reposData,
    isLoading: reposLoading,
    error: reposError,
  } = useQuery({
    queryKey: ['github-repos', selectedConnection],
    queryFn: async () => {
      if (!selectedConnection) return null;
      const response = await platformsApi.getGitHubRepositories(selectedConnection);
      return response.data;
    },
    enabled: !!selectedConnection,
  });

  const repositories = (reposData?.data || []) as Repository[];

  // Debug: Log repositories data
  useEffect(() => {
    if (repositories.length > 0) {
      console.log('GitHub repositories loaded:', repositories.length);
      console.log('First repo:', repositories[0]);
    }
  }, [repositories]);

  // Fetch commits for selected repository
  const {
    data: commitsData,
    isLoading: commitsLoading,
    error: commitsError,
  } = useQuery({
    queryKey: ['github-commits', selectedConnection, selectedRepo, dateRange.since, dateRange.until],
    queryFn: async () => {
      if (!selectedConnection || !selectedRepo) return null;
      const response = await platformsApi.getGitHubCommits(
        selectedConnection,
        selectedRepo,
        dateRange.since,
        dateRange.until
      );
      return response.data;
    },
    enabled: !!selectedConnection && !!selectedRepo,
  });

  const commits = (commitsData?.data || []) as Commit[];

  // Debug: Log commits data
  useEffect(() => {
    console.log('Selected repo:', selectedRepo);
    console.log('Commits loaded:', commits.length);
    if (commits.length > 0) {
      console.log('First commit:', commits[0]);
    }
  }, [commits, selectedRepo]);

  // Auto-select first repo when repos load or connection changes
  useEffect(() => {
    if (repositories.length > 0) {
      // Check if current selectedRepo exists in the repositories list
      const repoExists = repositories.some((r) => r.fullName === selectedRepo);
      if (!repoExists) {
        setSelectedRepo(repositories[0].fullName);
      }
    } else {
      setSelectedRepo('');
    }
  }, [repositories]);

  if (connections.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="text-cyan" />
            GitHub Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Github className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p>No GitHub accounts connected</p>
            <p className="text-sm mt-2">Connect a GitHub account to view your activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedConnectionData = connections.find((c) => c.id === selectedConnection);

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="text-cyan" />
          GitHub Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Selector */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-muted-foreground mb-2 block">GitHub Account</label>
            <select
              value={selectedConnection}
              onChange={(e) => {
                setSelectedConnection(e.target.value);
                setSelectedRepo(''); // Reset repo selection when changing account
              }}
              className="w-full bg-surface-light border border-border/50 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-cyan transition-colors"
            >
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  @{connection.platformUsername}
                </option>
              ))}
            </select>
          </div>

          {/* Repository Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-muted-foreground mb-2 block">Repository</label>
            {reposLoading ? (
              <div className="flex items-center gap-2 px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan" />
                <span className="text-sm text-muted-foreground">Loading repositories...</span>
              </div>
            ) : reposError ? (
              <div className="text-sm text-red-400">Failed to load repositories</div>
            ) : (
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full bg-surface-light border border-border/50 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-cyan transition-colors"
                disabled={repositories.length === 0}
              >
                {repositories.length === 0 ? (
                  <option>No repositories found</option>
                ) : (
                  repositories.map((repo) => (
                    <option key={repo.id} value={repo.fullName}>
                      {repo.name}
                      {repo.language && ` • ${repo.language}`}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {selectedRepo && repositories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const repo = repositories.find((r) => r.fullName === selectedRepo);
              if (!repo) return null;
              return (
                <>
                  <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="h-4 w-4 text-cyan" />
                      <span className="text-sm text-muted-foreground">Stars</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{repo.stargazersCount ?? 0}</div>
                  </div>
                  <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="h-4 w-4 text-purple" />
                      <span className="text-sm text-muted-foreground">Forks</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{repo.forksCount ?? 0}</div>
                  </div>
                  <div className="bg-surface-light/50 border border-border/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GitCommit className="h-4 w-4 text-cyan" />
                      <span className="text-sm text-muted-foreground">Commits (30d)</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{commits.length ?? 0}</div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Commit History */}
        {selectedRepo && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <GitCommit className="h-5 w-5 text-cyan" />
              Recent Commits
              {selectedConnectionData && (
                <span className="text-sm text-muted-foreground font-normal">
                  @{selectedConnectionData.platformUsername}
                </span>
              )}
            </h3>

            {commitsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-cyan" />
              </div>
            ) : commitsError ? (
              <div className="text-center py-8 text-red-400">
                <p>Failed to load commits</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please check your GitHub connection and try again
                </p>
              </div>
            ) : commits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GitCommit className="mx-auto mb-4 h-12 w-12 opacity-20" />
                <p>No commits found in the selected date range</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {commits.map((commit) => (
                  <a
                    key={commit.sha}
                    href={commit.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-surface-light/50 border border-border/30 rounded-lg p-4 hover:border-cyan/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <GitCommit className="h-5 w-5 text-cyan mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium group-hover:text-cyan transition-colors line-clamp-2">
                          {commit.message.split('\n')[0]}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span>{commit.author.name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(commit.author.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span>•</span>
                          <code className="text-xs bg-surface px-2 py-0.5 rounded">
                            {commit.sha.substring(0, 7)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
