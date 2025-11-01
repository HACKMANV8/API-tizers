import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { PrismaClient } from '@prisma/client';
import logger from './logger';

export interface IntegrationConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export abstract class BaseIntegration {
  protected client: AxiosInstance;
  protected prisma: PrismaClient;
  protected logger = logger;
  protected platformName: string;

  constructor(config: IntegrationConfig, prisma: PrismaClient, platformName: string) {
    this.prisma = prisma;
    this.platformName = platformName;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        this.logger.info(`[${this.platformName}] Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error(`[${this.platformName}] Request error:`, error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.info(`[${this.platformName}] Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(`[${this.platformName}] Response error:`, {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make authenticated request
   */
  protected async authenticatedRequest<T>(
    config: AxiosRequestConfig,
    accessToken: string
  ): Promise<T> {
    const response = await this.client.request<T>({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  }

  /**
   * Handle rate limiting with retry
   */
  protected async retryRequest<T>(
    request: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await request();
      } catch (error: any) {
        if (attempt === maxRetries || error.response?.status !== 429) {
          throw error;
        }
        this.logger.warn(`[${this.platformName}] Rate limited, retrying in ${delay}ms...`);
        await this.sleep(delay * attempt);
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update connection sync status
   */
  protected async updateSyncStatus(
    connectionId: string,
    status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED',
    errorMessage?: string
  ): Promise<void> {
    await this.prisma.platformConnection.update({
      where: { id: connectionId },
      data: {
        syncStatus: status,
        lastSynced: status === 'COMPLETED' ? new Date() : undefined,
        metadata: errorMessage ? { lastError: String(errorMessage).substring(0, 500) } : undefined,
      },
    });
  }

  /**
   * Abstract method to be implemented by each integration
   */
  abstract fetchUserData(connectionId: string): Promise<any>;

  /**
   * Abstract method to sync data
   */
  abstract syncData(userId: string, connectionId: string): Promise<void>;
}
