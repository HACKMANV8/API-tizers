import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import { BaseIntegration } from '../utils/base-integration';
import { config } from '../config';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { encryptionService } from '../auth/encryption.service';
import { subDays } from 'date-fns';

/**
 * OpenProject Work Package interface (simplified)
 */
interface WorkPackage {
  id: number;
  subject: string;
  description?: {
    format: string;
    html: string;
    raw: string;
  };
  _links: {
    status: { title: string };
    priority: { title: string };
    project: { title: string };
    assignee?: { title: string };
  };
  dueDate?: string;
  estimatedTime?: string; // ISO 8601 duration (e.g., "PT8H")
  spentTime?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * OpenProject API response wrapper
 */
interface WorkPackageResponse {
  _embedded: {
    elements: WorkPackage[];
  };
  total: number;
  count: number;
  pageSize: number;
  offset: number;
}

/**
 * OpenProject User interface
 */
interface OpenProjectUser {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
}

/**
 * OpenProject Project interface
 */
interface Project {
  id: number;
  identifier: string;
  name: string;
  active: boolean;
  public: boolean;
  description?: {
    format: string;
    html: string;
    raw: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * OpenProject Projects API response
 */
interface ProjectsResponse {
  _embedded: {
    elements: Project[];
  };
  total: number;
  count: number;
  pageSize: number;
  offset: number;
}

/**
 * OpenProject Integration
 * Supports Personal Access Token (PAT) authentication
 * Users provide their OpenProject instance URL and API token
 */
export class OpenProjectIntegration extends BaseIntegration {
  constructor(prisma: PrismaClient) {
    super(
      {
        baseURL: config.platforms.openproject.apiUrl || 'https://openproject.example.com',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      prisma,
      'OpenProject'
    );
  }

  /**
   * Create an authenticated client for a specific connection
   * OpenProject uses Basic Auth with username "apikey" and token as password
   */
  private getAuthenticatedClient(instanceUrl: string, accessToken: string) {
    // OpenProject requires Basic Auth with "apikey" as username and token as password
    const basicAuth = Buffer.from(`apikey:${accessToken}`).toString('base64');

    return {
      get: async <T>(path: string, params?: any) => {
        const response = await this.client.request<T>({
          baseURL: instanceUrl,
          url: path,
          method: 'GET',
          params,
          headers: {
            Authorization: `Basic ${basicAuth}`,
          },
        });
        return response.data;
      },
    };
  }

  /**
   * Verify connection and fetch user data from OpenProject
   */
  async fetchUserData(connectionId: string): Promise<OpenProjectUser> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('OpenProject connection not found');
    }

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(connection.accessToken);
    this.logger.info(`[OpenProject] Attempting connection to instance`);
    this.logger.info(`[OpenProject] Token length: ${decryptedToken.length}`);

    // Get instance URL from metadata
    const instanceUrl = (connection.metadata as any)?.instanceUrl;
    if (!instanceUrl) {
      throw new BadRequestError('OpenProject instance URL not found in connection metadata');
    }

    this.logger.info(`[OpenProject] Instance URL: ${instanceUrl}`);

    try {
      const client = this.getAuthenticatedClient(instanceUrl, decryptedToken);

      // Fetch current user data
      const userData = await client.get<OpenProjectUser>('/api/v3/users/me');

      this.logger.info(`[OpenProject] Fetched user data for ${userData.email}`);

      return userData;
    } catch (error: any) {
      this.logger.error('[OpenProject] Failed to fetch user data:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
      });

      // Handle specific error cases
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new BadRequestError('Invalid OpenProject API token. Please check your token has the correct permissions.');
      }

      if (error.response?.status === 404) {
        throw new BadRequestError('OpenProject instance not found. Please check your instance URL.');
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new BadRequestError(`Cannot connect to OpenProject instance at ${instanceUrl}. Please check the URL is correct.`);
      }

      if (error.response?.status >= 500) {
        throw new BadRequestError('OpenProject server error. Please try again later.');
      }

      // Generic error
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new BadRequestError(`Failed to connect to OpenProject: ${errorMessage}`);
    }
  }

  /**
   * Fetch work packages assigned to the user
   */
  async fetchWorkPackages(connectionId: string): Promise<WorkPackage[]> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('OpenProject connection not found');
    }

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(connection.accessToken);

    // Get instance URL from metadata
    const instanceUrl = (connection.metadata as any)?.instanceUrl;
    if (!instanceUrl) {
      throw new BadRequestError('OpenProject instance URL not found in connection metadata');
    }

    try {
      const client = this.getAuthenticatedClient(instanceUrl, decryptedToken);

      // Build filters for work packages
      // Filter: assigned to current user OR created by current user
      // We fetch work packages from the last 90 days to avoid overwhelming the system
      const filters = JSON.stringify([
        {
          assignee: {
            operator: '=',
            values: ['me'],
          },
        },
      ]);

      // Fetch work packages with filters
      const response = await client.get<WorkPackageResponse>('/api/v3/work_packages', {
        filters,
        pageSize: 100, // Limit to 100 work packages
        offset: 0,
      });

      this.logger.info(
        `[OpenProject] Fetched ${response._embedded.elements.length} work packages (total: ${response.total})`
      );

      return response._embedded.elements || [];
    } catch (error: any) {
      this.logger.error('[OpenProject] Failed to fetch work packages:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
      });

      // Handle specific error cases
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new BadRequestError('Invalid or expired OpenProject API token');
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new BadRequestError(`Cannot connect to OpenProject instance. Please check your connection.`);
      }

      // Generic error
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new BadRequestError(`Failed to fetch work packages: ${errorMessage}`);
    }
  }

  /**
   * Fetch all projects accessible to the user
   */
  async fetchProjects(connectionId: string): Promise<Project[]> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('OpenProject connection not found');
    }

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(connection.accessToken);

    // Get instance URL from metadata
    const instanceUrl = (connection.metadata as any)?.instanceUrl;
    if (!instanceUrl) {
      throw new BadRequestError('OpenProject instance URL not found in connection metadata');
    }

    try {
      const client = this.getAuthenticatedClient(instanceUrl, decryptedToken);

      // Fetch only active projects
      const filters = JSON.stringify([
        {
          active: {
            operator: '=',
            values: ['t'],
          },
        },
      ]);

      const response = await client.get<ProjectsResponse>('/api/v3/projects', {
        filters,
        pageSize: 100,
        offset: 0,
      });

      this.logger.info(
        `[OpenProject] Fetched ${response._embedded.elements.length} projects (total: ${response.total})`
      );

      return response._embedded.elements || [];
    } catch (error: any) {
      this.logger.error('[OpenProject] Failed to fetch projects:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
      });

      // Handle specific error cases
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new BadRequestError('Invalid or expired OpenProject API token');
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new BadRequestError(`Cannot connect to OpenProject instance. Please check your connection.`);
      }

      // Generic error
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new BadRequestError(`Failed to fetch projects: ${errorMessage}`);
    }
  }

  /**
   * Fetch work packages for a specific project (filtered by assignee = current user)
   */
  async fetchProjectWorkPackages(connectionId: string, projectId: string): Promise<WorkPackage[]> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('OpenProject connection not found');
    }

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(connection.accessToken);

    // Get instance URL from metadata
    const instanceUrl = (connection.metadata as any)?.instanceUrl;
    if (!instanceUrl) {
      throw new BadRequestError('OpenProject instance URL not found in connection metadata');
    }

    try {
      const client = this.getAuthenticatedClient(instanceUrl, decryptedToken);

      // Filter: only work packages assigned to current user (me)
      const filters = JSON.stringify([
        {
          assignee: {
            operator: '=',
            values: ['me'],
          },
        },
      ]);

      // Use project-scoped endpoint with assignee filter
      const response = await client.get<WorkPackageResponse>(
        `/api/v3/projects/${projectId}/work_packages`,
        {
          filters,
          pageSize: 100,
          offset: 0,
        }
      );

      this.logger.info(
        `[OpenProject] Fetched ${response._embedded.elements.length} work packages assigned to user for project ${projectId} (total: ${response.total})`
      );

      return response._embedded.elements || [];
    } catch (error: any) {
      this.logger.error('[OpenProject] Failed to fetch project work packages:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
      });

      // Handle specific error cases
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new BadRequestError('Invalid or expired OpenProject API token');
      }

      if (error.response?.status === 404) {
        throw new BadRequestError('Project not found');
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new BadRequestError(`Cannot connect to OpenProject instance. Please check your connection.`);
      }

      // Generic error
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new BadRequestError(`Failed to fetch project work packages: ${errorMessage}`);
    }
  }

  /**
   * Convert OpenProject work package to Task
   */
  private async convertWorkPackageToTask(
    workPackage: WorkPackage,
    userId: string,
    connectionId: string
  ): Promise<void> {
    if (!workPackage.id || !workPackage.subject) {
      return; // Skip invalid work packages
    }

    // Map OpenProject status to TaskStatus
    const statusMap: Record<string, TaskStatus> = {
      new: 'TODO',
      'in progress': 'IN_PROGRESS',
      'on hold': 'TODO',
      closed: 'COMPLETED',
      rejected: 'CANCELLED',
    };

    const status =
      statusMap[workPackage._links.status.title.toLowerCase()] || 'TODO';

    // Map OpenProject priority to TaskPriority
    const priorityMap: Record<string, TaskPriority> = {
      low: 'LOW',
      normal: 'MEDIUM',
      high: 'HIGH',
      immediate: 'URGENT',
    };

    const priority =
      priorityMap[workPackage._links.priority.title.toLowerCase()] || 'MEDIUM';

    // Parse estimated time (ISO 8601 duration to hours)
    let estimatedHours: number | null = null;
    if (workPackage.estimatedTime) {
      const match = workPackage.estimatedTime.match(/PT(\d+)H/);
      if (match) {
        estimatedHours = parseInt(match[1], 10);
      }
    }

    // Parse actual time
    let actualHours: number | null = null;
    if (workPackage.spentTime) {
      const match = workPackage.spentTime.match(/PT(\d+)H/);
      if (match) {
        actualHours = parseInt(match[1], 10);
      }
    }

    // Check if task already exists
    const existingTask = await this.prisma.task.findFirst({
      where: {
        userId,
        externalId: workPackage.id.toString(),
        source: 'OPENPROJECT',
      },
    });

    const taskData = {
      title: workPackage.subject,
      description: workPackage.description?.raw || null,
      status,
      priority,
      dueDate: workPackage.dueDate ? new Date(workPackage.dueDate) : null,
      projectName: workPackage._links.project.title,
      assignee: workPackage._links.assignee?.title || null,
      estimatedHours: estimatedHours ? estimatedHours.toString() : null,
      actualHours: actualHours ? actualHours.toString() : null,
      completedAt: status === 'COMPLETED' ? new Date(workPackage.updatedAt) : null,
      metadata: {
        openProjectId: workPackage.id,
        statusName: workPackage._links.status.title,
        priorityName: workPackage._links.priority.title,
        projectName: workPackage._links.project.title,
        createdAt: workPackage.createdAt,
        updatedAt: workPackage.updatedAt,
      },
    };

    if (existingTask) {
      // Update existing task
      await this.prisma.task.update({
        where: { id: existingTask.id },
        data: taskData,
      });
      this.logger.info(`[OpenProject] Updated task: ${workPackage.subject} (${workPackage.id})`);
    } else {
      // Create new task
      await this.prisma.task.create({
        data: {
          ...taskData,
          userId,
          source: 'OPENPROJECT',
          sourceId: connectionId,
          externalId: workPackage.id.toString(),
        },
      });
      this.logger.info(`[OpenProject] Created task: ${workPackage.subject} (${workPackage.id})`);
    }
  }

  /**
   * Sync OpenProject data
   */
  async syncData(userId: string, connectionId: string): Promise<void> {
    await this.updateSyncStatus(connectionId, 'SYNCING');

    try {
      const connection = await this.prisma.platformConnection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        throw new NotFoundError('OpenProject connection not found');
      }

      // Fetch work packages assigned to user
      const workPackages = await this.fetchWorkPackages(connectionId);
      this.logger.info(`[OpenProject] Found ${workPackages.length} work packages for user ${userId}`);

      // Convert each work package to a task
      for (const workPackage of workPackages) {
        await this.convertWorkPackageToTask(workPackage, userId, connectionId);
      }

      await this.updateSyncStatus(connectionId, 'COMPLETED');
      this.logger.info(`[OpenProject] Sync completed for user ${userId}`);
    } catch (error: any) {
      await this.updateSyncStatus(connectionId, 'FAILED', error.message);
      this.logger.error('[OpenProject] Sync failed:', error);
      throw error;
    }
  }
}
