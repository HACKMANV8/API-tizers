import { PrismaClient } from '@prisma/client';
import { BaseIntegration } from '../utils/base-integration';
import { NotFoundError, ServiceUnavailableError, BadRequestError } from '../utils/errors';
import { startOfDay, endOfDay } from 'date-fns';
import { encryptionService } from '../auth/encryption.service';

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
   * Override authenticatedRequest to use GitHub's token authentication format
   * GitHub PATs use "token" prefix instead of "Bearer"
   */
  protected async authenticatedRequest<T>(
    config: any,
    accessToken: string
  ): Promise<T> {
    const response = await this.client.request<T>({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `token ${accessToken}`,
      },
    });
    return response.data;
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

    // Check if token is encrypted
    if (!encryptionService.isEncrypted(connection.accessToken)) {
      this.logger.error('[GitHub] Token is not encrypted - auto-invalidating connection', { connectionId });

      // Automatically mark connection as inactive
      await this.prisma.platformConnection.update({
        where: { id: connectionId },
        data: { isActive: false },
      });

      throw new BadRequestError('GitHub connection has been invalidated due to security update. Please reconnect your GitHub account.');
    }

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(connection.accessToken);

    try {
      const user = await this.authenticatedRequest<GitHubUser>(
        {
          method: 'GET',
          url: '/user',
        },
        decryptedToken
      );

      return user;
    } catch (error: any) {
      this.logger.error('[GitHub] Error fetching user data:', {
        message: error.message,
        status: error.response?.status,
      });
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
            this.logger.warn(`[GitHub] Error fetching commits for ${repo.full_name}:`, {
              message: error.message,
              status: error.response?.status,
            });
          }
        }
      }

      return totalCommits;
    } catch (error: any) {
      this.logger.error('[GitHub] Error fetching commits:', {
        message: error.message,
        status: error.response?.status,
      });
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
    } catch (error: any) {
      this.logger.error('[GitHub] Error fetching pull requests:', {
        message: error.message,
        status: error.response?.status,
      });
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
    } catch (error: any) {
      this.logger.error('[GitHub] Error fetching issues:', {
        message: error.message,
        status: error.response?.status,
      });
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
    } catch (error: any) {
      this.logger.error('[GitHub] Error fetching reviews:', {
        message: error.message,
        status: error.response?.status,
      });
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
      // Check if token is encrypted
      if (!encryptionService.isEncrypted(connection.accessToken)) {
        this.logger.error('[GitHub] Token is not encrypted - auto-invalidating connection', { connectionId });

        // Automatically mark connection as inactive
        await this.prisma.platformConnection.update({
          where: { id: connectionId },
          data: { isActive: false },
        });

        throw new BadRequestError('GitHub connection has been invalidated due to security update. Please reconnect your GitHub account.');
      }

      // Decrypt the access token
      const decryptedToken = encryptionService.decrypt(connection.accessToken);
      this.logger.info('[GitHub] Fetching repositories for connection', { connectionId });

      const repos = await this.authenticatedRequest<any[]>(
        {
          method: 'GET',
          url: '/user/repos',
          params: {
            sort: 'updated',
            per_page: 100,
          },
        },
        decryptedToken
      );

      this.logger.info('[GitHub] Successfully fetched repositories', { count: repos.length });

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
      this.logger.error('[GitHub] Error fetching repositories:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        connectionId,
      });
      throw new ServiceUnavailableError(`Failed to fetch GitHub repositories: ${error.message}`);
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

    // Check if token is encrypted
    if (!encryptionService.isEncrypted(connection.accessToken)) {
      this.logger.error('[GitHub] Token is not encrypted - auto-invalidating connection', { connectionId });

      // Automatically mark connection as inactive
      await this.prisma.platformConnection.update({
        where: { id: connectionId },
        data: { isActive: false },
      });

      throw new BadRequestError('GitHub connection has been invalidated due to security update. Please reconnect your GitHub account.');
    }

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(connection.accessToken);

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
        decryptedToken
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
      this.logger.error('[GitHub] Error fetching repository commits:', {
        message: error.message,
        status: error.response?.status,
        repo: repoFullName,
      });
      throw new ServiceUnavailableError('Failed to fetch repository commits');
    }
  }

  async fetchLanguageStats(accessToken: string): Promise<any> {
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
    } catch (error: any) {
      this.logger.error('[GitHub] Error fetching language stats:', {
        message: error.message,
        status: error.response?.status,
      });
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

      // Check if token is encrypted
      if (!encryptionService.isEncrypted(connection.accessToken)) {
        this.logger.error('[GitHub] Token is not encrypted - auto-invalidating connection', { connectionId });

        // Automatically mark connection as inactive
        await this.prisma.platformConnection.update({
          where: { id: connectionId },
          data: { isActive: false },
        });

        throw new BadRequestError('GitHub connection has been invalidated due to security update. Please reconnect your GitHub account.');
      }

      // Decrypt the access token
      const decryptedToken = encryptionService.decrypt(connection.accessToken);

      // Fetch user data
      const userData = await this.fetchUserData(connectionId);

      // Sync today's stats
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      const [commits, pullRequests, issues, reviews] = await Promise.all([
        this.fetchCommits(connection.platformUsername, decryptedToken, startOfToday, endOfToday),
        this.fetchPullRequests(connection.platformUsername, decryptedToken, startOfToday, endOfToday),
        this.fetchIssues(connection.platformUsername, decryptedToken, startOfToday, endOfToday),
        this.fetchReviews(connection.platformUsername, decryptedToken, startOfToday, endOfToday),
      ]);

      const languageStats = await this.fetchLanguageStats(decryptedToken);

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
      this.logger.error('[GitHub] Sync failed:', {
        message: error.message,
        status: error.response?.status,
        userId,
        connectionId,
      });
      throw error;
    }
  }
}
