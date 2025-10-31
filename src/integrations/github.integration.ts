import { PrismaClient } from '@prisma/client';
import { BaseIntegration } from '../utils/base-integration';
import { config } from '../config';
import { NotFoundError, ServiceUnavailableError } from '../utils/errors';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  followers: number;
  following: number;
  public_repos: number;
}

export interface GitHubContributions {
  date: string;
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
}

export class GitHubIntegration extends BaseIntegration {
  constructor(prisma: PrismaClient) {
    super(
      {
        baseURL: 'https://api.github.com',
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      },
      prisma,
      'GitHub'
    );
  }

  /**
   * Fetch user data from GitHub
   */
  async fetchUserData(connectionId: string): Promise<any> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('GitHub connection not found');
    }

    try {
      const user = await this.authenticatedRequest<GitHubUser>(
        {
          method: 'GET',
          url: '/user',
        },
        connection.accessToken
      );

      return user;
    } catch (error) {
      this.logger.error('[GitHub] Error fetching user data:', error);
      throw new ServiceUnavailableError('Failed to fetch GitHub user data');
    }
  }

  /**
   * Fetch user's commits for a specific date range
   */
  async fetchCommits(
    username: string,
    accessToken: string,
    since: Date,
    until: Date
  ): Promise<number> {
    try {
      // Get all user repos
      const repos = await this.authenticatedRequest<any[]>(
        {
          method: 'GET',
          url: '/user/repos',
          params: {
            per_page: 100,
            sort: 'updated',
            affiliation: 'owner,collaborator',
          },
        },
        accessToken
      );

      let totalCommits = 0;

      // For each repo, get commits in date range
      for (const repo of repos) {
        try {
          const commits = await this.authenticatedRequest<any[]>(
            {
              method: 'GET',
              url: `/repos/${repo.full_name}/commits`,
              params: {
                author: username,
                since: since.toISOString(),
                until: until.toISOString(),
                per_page: 100,
              },
            },
            accessToken
          );
          totalCommits += commits.length;
        } catch (error: any) {
          // Skip repos that can't be accessed
          if (error.response?.status !== 404) {
            this.logger.warn(`[GitHub] Error fetching commits for ${repo.full_name}:`, error);
          }
        }
      }

      return totalCommits;
    } catch (error) {
      this.logger.error('[GitHub] Error fetching commits:', error);
      return 0;
    }
  }

  /**
   * Fetch user's pull requests
   */
  async fetchPullRequests(
    username: string,
    accessToken: string,
    since: Date,
    until: Date
  ): Promise<number> {
    try {
      const prs = await this.authenticatedRequest<any[]>(
        {
          method: 'GET',
          url: '/search/issues',
          params: {
            q: `author:${username} type:pr created:${since.toISOString().split('T')[0]}..${until.toISOString().split('T')[0]}`,
            per_page: 100,
          },
        },
        accessToken
      );

      return prs.length || 0;
    } catch (error) {
      this.logger.error('[GitHub] Error fetching pull requests:', error);
      return 0;
    }
  }

  /**
   * Fetch user's issues
   */
  async fetchIssues(
    username: string,
    accessToken: string,
    since: Date,
    until: Date
  ): Promise<number> {
    try {
      const issues = await this.authenticatedRequest<any[]>(
        {
          method: 'GET',
          url: '/search/issues',
          params: {
            q: `author:${username} type:issue created:${since.toISOString().split('T')[0]}..${until.toISOString().split('T')[0]}`,
            per_page: 100,
          },
        },
        accessToken
      );

      return issues.length || 0;
    } catch (error) {
      this.logger.error('[GitHub] Error fetching issues:', error);
      return 0;
    }
  }

  /**
   * Fetch user's code reviews
   */
  async fetchReviews(
    username: string,
    accessToken: string,
    since: Date,
    until: Date
  ): Promise<number> {
    try {
      const reviews = await this.authenticatedRequest<any[]>(
        {
          method: 'GET',
          url: '/search/issues',
          params: {
            q: `reviewed-by:${username} type:pr created:${since.toISOString().split('T')[0]}..${until.toISOString().split('T')[0]}`,
            per_page: 100,
          },
        },
        accessToken
      );

      return reviews.length || 0;
    } catch (error) {
      this.logger.error('[GitHub] Error fetching reviews:', error);
      return 0;
    }
  }

  /**
   * Get user's language statistics
   */
  /**
   * Fetch user repositories from GitHub
   */
  async fetchRepositories(connectionId: string): Promise<any[]> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('GitHub connection not found');
    }

    try {
      const repos = await this.authenticatedRequest<any[]>(
        {
          method: 'GET',
          url: '/user/repos',
          params: {
            sort: 'updated',
            per_page: 100,
          },
        },
        connection.accessToken
      );

      return repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        description: repo.description,
        htmlUrl: repo.html_url,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
      }));
    } catch (error: any) {
      this.logger.error('[GitHub] Error fetching repositories:', error);
      throw new ServiceUnavailableError('Failed to fetch GitHub repositories');
    }
  }

  /**
   * Fetch commits for a specific repository
   */
  async fetchRepositoryCommits(
    connectionId: string,
    repoFullName: string,
    since?: string,
    until?: string
  ): Promise<any[]> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('GitHub connection not found');
    }

    try {
      const params: any = {
        per_page: 100,
      };
      if (since) params.since = since;
      if (until) params.until = until;

      const commits = await this.authenticatedRequest<any[]>(
        {
          method: 'GET',
          url: `/repos/${repoFullName}/commits`,
          params,
        },
        connection.accessToken
      );

      return commits.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date,
        },
        committer: commit.commit.committer,
        htmlUrl: commit.html_url,
        stats: commit.stats,
      }));
    } catch (error: any) {
      this.logger.error('[GitHub] Error fetching repository commits:', error);
      throw new ServiceUnavailableError('Failed to fetch repository commits');
    }
  }

  async fetchLanguageStats(username: string, accessToken: string): Promise<any> {
    try {
      const repos = await this.authenticatedRequest<any[]>(
        {
          method: 'GET',
          url: '/user/repos',
          params: {
            per_page: 100,
          },
        },
        accessToken
      );

      const languageStats: Record<string, number> = {};

      for (const repo of repos) {
        if (repo.language) {
          languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
        }
      }

      return languageStats;
    } catch (error) {
      this.logger.error('[GitHub] Error fetching language stats:', error);
      return {};
    }
  }

  /**
   * Sync GitHub data for a user
   */
  async syncData(userId: string, connectionId: string): Promise<void> {
    await this.updateSyncStatus(connectionId, 'SYNCING');

    try {
      const connection = await this.prisma.platformConnection.findUnique({
        where: { id: connectionId },
      });

      if (!connection || !connection.accessToken || !connection.platformUsername) {
        throw new NotFoundError('GitHub connection not found or incomplete');
      }

      // Fetch user data
      const userData = await this.fetchUserData(connectionId);

      // Sync today's stats
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      const [commits, pullRequests, issues, reviews] = await Promise.all([
        this.fetchCommits(connection.platformUsername, connection.accessToken, startOfToday, endOfToday),
        this.fetchPullRequests(connection.platformUsername, connection.accessToken, startOfToday, endOfToday),
        this.fetchIssues(connection.platformUsername, connection.accessToken, startOfToday, endOfToday),
        this.fetchReviews(connection.platformUsername, connection.accessToken, startOfToday, endOfToday),
      ]);

      const languageStats = await this.fetchLanguageStats(connection.platformUsername, connection.accessToken);

      // Upsert GitHub stats
      await this.prisma.githubStat.upsert({
        where: {
          connectionId_date: {
            connectionId,
            date: startOfToday,
          },
        },
        create: {
          connectionId,
          userId,
          date: startOfToday,
          commits,
          pullRequests,
          issues,
          reviews,
          followersCount: userData.followers,
          followingCount: userData.following,
          publicRepos: userData.public_repos,
          totalContributions: commits + pullRequests + issues + reviews,
          languages: languageStats,
        },
        update: {
          commits,
          pullRequests,
          issues,
          reviews,
          followersCount: userData.followers,
          followingCount: userData.following,
          publicRepos: userData.public_repos,
          totalContributions: commits + pullRequests + issues + reviews,
          languages: languageStats,
        },
      });

      await this.updateSyncStatus(connectionId, 'COMPLETED');
      this.logger.info('[GitHub] Sync completed successfully', { userId, connectionId });
    } catch (error: any) {
      await this.updateSyncStatus(connectionId, 'FAILED', error.message);
      this.logger.error('[GitHub] Sync failed:', error);
      throw error;
    }
  }
}
